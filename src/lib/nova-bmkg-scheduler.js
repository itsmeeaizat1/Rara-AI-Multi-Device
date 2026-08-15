/**
 * nova-bmkg-scheduler.js
 * Scheduler gempa BMKG otomatis — kirim info gempa terkini ke grup/saluran.
 * Sumber: data.bmkg.go.id (API resmi BMKG, gratis, tanpa API key).
 * Default jeda: 6 jam (00:00, 06:00, 12:00, 18:00 WIB).
 */

import { CronJob } from "cron";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";

const TZ = "Asia/Jakarta";
const API_BASE = "https://data.bmkg.go.id/DataMKG/TEWS";

let sock = null;
let bmkgJobs = [];

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────────────────────────────────────

function getBmkgSettings(db) {
  const stored = db.setting("bmkgScheduler") || {};
  return {
    enabled: stored.enabled ?? false,
    timezone: stored.timezone || TZ,
    schedules: Array.isArray(stored.schedules) && stored.schedules.length
      ? stored.schedules
      : [
          { key: "malam", label: "Malam", hour: 0, minute: 0 },
          { key: "pagi", label: "Pagi", hour: 6, minute: 0 },
          { key: "siang", label: "Siang", hour: 12, minute: 0 },
          { key: "sore", label: "Sore", hour: 18, minute: 0 },
        ],
    targets: Array.isArray(stored.targets) ? stored.targets : [],
    minMagnitude: Number(stored.minMagnitude || 0),
    sendShakemap: stored.sendShakemap ?? true,
  };
}

function saveBmkgSettings(db, settings) {
  db.setting("bmkgScheduler", settings);
  return settings;
}

function updateBmkgSettings(updater) {
  const db = getDatabase();
  const current = getBmkgSettings(db);
  const next = updater(current);
  return saveBmkgSettings(db, next);
}

function getBmkgStatus() {
  const db = getDatabase();
  return getBmkgSettings(db);
}

// ────────────────────────────────────────────────────────────────────────────
// FETCH GEMPA
// ────────────────────────────────────────────────────────────────────────────

async function fetchGempaTerkini() {
  const res = await fetch(API_BASE + "/autogempa.json");
  if (!res.ok) throw new Error("BMKG API error: " + res.status);
  const data = await res.json();
  return data.Infogempa.gempa;
}

async function fetchGempaList() {
  const res = await fetch(API_BASE + "/gempaterkini.json");
  if (!res.ok) throw new Error("BMKG API error: " + res.status);
  const data = await res.json();
  return data.Infogempa.gempa;
}

async function fetchGempaDirasakan() {
  const res = await fetch(API_BASE + "/gempadirasakan.json");
  if (!res.ok) throw new Error("BMKG API error: " + res.status);
  const data = await res.json();
  return data.Infogempa.gempa;
}

// ────────────────────────────────────────────────────────────────────────────
// FORMAT PESAN
// ────────────────────────────────────────────────────────────────────────────

function formatGempaMessage(g, label) {
  let txt = "╔┈┈「 INFO BENCANA — BMKG 」╎❏\n";
  txt += "╚┈┈❖\n";
  txt += "Jadwal: " + label + " (6 jamanan)\n\n";
  txt += "Tanggal: *" + g.Tanggal + "*\n";
  txt += "Jam: *" + g.Jam + "*\n";
  txt += "Magnitude: *" + g.Magnitude + "*\n";
  txt += "Kedalaman: *" + g.Kedalaman + "*\n";
  txt += "Koordinat: " + g.Coordinates + "\n";
  txt += "Wilayah: *" + g.Wilayah + "*\n";
  txt += "Potensi: *" + g.Potensi + "*\n";
  if (g.Dirasakan) {
    txt += "Dirasakan: " + g.Dirasakan + "\n";
  }
  txt += "\nSumber: BMKG (data.bmkg.go.id)";
  return txt;
}

function formatGempaListMessage(gempaList, label) {
  let txt = "╔┈┈「 INFO BENCANA — BMKG 」╎❏\n";
  txt += "╚┈┈❖\n";
  txt += "Jadwal: " + label + " (6 jamanan)\n\n";
  txt += "Gempa terkini M 5.0+ (5 terbaru):\n\n";

  const limit = Math.min(5, gempaList.length);
  for (let i = 0; i < limit; i++) {
    const g = gempaList[i];
    txt += (i + 1) + ". M" + g.Magnitude + " — " + g.Wilayah + "\n";
    txt += "   " + g.Tanggal + " " + g.Jam + "\n";
    txt += "   Kedalaman: " + g.Kedalaman + "\n\n";
  }

  txt += "Sumber: BMKG (data.bmkg.go.id)";
  return txt;
}

// ────────────────────────────────────────────────────────────────────────────
// KIRIM BROADCAST
// ────────────────────────────────────────────────────────────────────────────

async function sendBmkgUpdate(label) {
  if (!sock) return;
  const db = getDatabase();
  const settings = getBmkgSettings(db);

  if (!settings.enabled) return;
  if (!settings.targets || settings.targets.length === 0) return;

  try {
    logger.info("BMKG", "Broadcast gempa [" + label + "] dimulai...");

    // Fetch gempa terkini (1 terbaru) + list M5.0+
    const [gempaTerkini, gempaList] = await Promise.all([
      fetchGempaTerkini().catch(() => null),
      fetchGempaList().catch(() => null),
    ]);

    if (!gempaTerkini) {
      logger.warn("BMKG", "Gagal fetch gempa terkini");
      return;
    }

    // Filter berdasarkan min magnitude (jika diset)
    const mag = parseFloat(gempaTerkini.Magnitude) || 0;
    const minMag = settings.minMagnitude || 0;

    let txt;
    let shakemapUrl = null;

    if (gempaTerkini.Shakemap) {
      shakemapUrl = API_BASE + "/" + gempaTerkini.Shakemap;
    }

    // Jika gempa terkini < minMagnitude, kirim list gempa M5.0+ saja
    if (mag < minMag && gempaList && gempaList.length > 0) {
      txt = formatGempaListMessage(gempaList, label);
      shakemapUrl = null;
    } else {
      txt = formatGempaMessage(gempaTerkini, label);
    }

    // Kirim ke semua target
    for (const target of settings.targets) {
      try {
        if (shakemapUrl && settings.sendShakemap) {
          // Kirim gambar shakemap + caption
          try {
            const imgRes = await fetch(shakemapUrl);
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              await sock.sendMessage(target, {
                image: buffer,
                caption: txt,
              });
            } else {
              await sock.sendMessage(target, { text: txt });
            }
          } catch (imgErr) {
            // Fallback: text only
            await sock.sendMessage(target, { text: txt });
          }
        } else {
          await sock.sendMessage(target, { text: txt });
        }
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        logger.warn("BMKG", "Gagal kirim ke " + target + ": " + err.message);
      }
    }

    logger.info("BMKG", "Broadcast [" + label + "] selesai ke " + settings.targets.length + " target");
  } catch (err) {
    logger.error("BMKG", "Error broadcast: " + err.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ────────────────────────────────────────────────────────────────────────────

function stopBmkgJobs() {
  if (Array.isArray(bmkgJobs) && bmkgJobs.length) {
    for (const job of bmkgJobs) {
      try { job.stop(); } catch (err) { logger.warn("BMKG", "Gagal stop CronJob: " + err.message); }
    }
    bmkgJobs = [];
  }
}

function startBmkgJobs(settings) {
  stopBmkgJobs();
  if (!settings.enabled || !settings.schedules.length) return;
  for (const schedule of settings.schedules) {
    const cron = "0 " + (schedule.minute ?? 0) + " " + schedule.hour + " * * *";
    const label = schedule.label || schedule.key || (schedule.hour + ":00");
    try {
      const job = new CronJob(cron, () => sendBmkgUpdate(label), null, true, settings.timezone || TZ);
      bmkgJobs.push(job);
      logger.info("BMKG", "Jadwal [" + label + "] -> " + cron + " (" + (settings.timezone || TZ) + ")");
    } catch (err) {
      logger.error("BMKG", "Gagal membuat CronJob untuk [" + label + "]: " + err.message);
    }
  }
}

function initBmkgScheduler(sockInstance) {
  sock = sockInstance;
  const db = getDatabase();
  const settings = getBmkgSettings(db);
  logger.info("BMKG", "Scheduler " + (settings.enabled ? "aktif" : "nonaktif") + " | " + settings.targets.length + " target | " + settings.schedules.length + " jadwal");
  startBmkgJobs(settings);
}

export {
  initBmkgScheduler,
  getBmkgStatus,
  updateBmkgSettings,
  startBmkgJobs,
  stopBmkgJobs,
  fetchGempaTerkini,
  fetchGempaList,
  fetchGempaDirasakan,
  formatGempaMessage,
  formatGempaListMessage,
};
