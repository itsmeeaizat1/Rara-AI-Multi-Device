// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-linkedin-notify.js — Auto LinkedIn Job Notifier (request owner 10 Sep
 * 2026: "buat notif auto linkedin notifier jadi kayak info job yang baru di
 * post gt formatnya kayak anime metadatanya lengkap").
 *
 * Sumber: Apify actor valig/linkedin-jobs-scraper (PRICE_PER_DATASET_ITEM
 * $0.0004/job — yang termurah & stabil, live verified). LinkedIn gak punya
 * API publik — actor Apify satu-satunya jalur realistis.
 *
 * FORMAT ala anime/movie notifier: card PER-LOWONGAN, metadata lengkap
 * (judul, perusahaan, lokasi, tipe kontrak, sektor, level, gaji, jumlah
 * pelamar, waktu posting, link lamar) + deskripsi full di balik ℅readmore
 * + banner externalAdReply renderLargerThumbnail.
 *
 * CREDIT GUARD (free tier Apify $5/bln):
 *   • throttle per-RUN intervalMenit default 120 (knob 30-720)
 *   • window 07:00–22:00 WIB (jam cari kerja)
 *   • keywords maks 3 (tiap keyword = 1 run actor)
 *   • limit per run default 20 (cap 25)
 *   • dedup job id TTL 7 hari + baseline silent run pertama
 *
 * Target: subscriber per-chat (.linkedinnotify on) + target terpusat
 * (.switch auto autolinkedin set — mergeAutoTargets).
 * Toggle GLOBAL: .switch auto autolinkedin on/off.
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import { CronJob } from "cron";
import { getApifyToken, apifyRunSync } from "./nova-apify.js";
import { mergeAutoTargets } from "./nova-auto-target.js";
import { logger } from "./nova-logger.js";
import config from "../../config.js";

const TZ = "Asia/Jakarta";
const STATE_FILE = path.join(process.cwd(), "src", "data", "linkedinnotify.json");
const ACTOR = "valig~linkedin-jobs-scraper";
const DEFAULT_INTERVAL_MENIT = 120;
const WINDOW_START = 7;   // 07:00 WIB
const WINDOW_END = 22;    // 22:00 WIB
const MAX_KEYWORDS = 3;
const MAX_LIMIT = 25;
const SENT_TTL_DAYS = 7;
const CAP_PER_CHECK = 5;  // maks job baru dikirim per check biar gak spam
const CAP_DELAY_MS = 1200;
// ℅readmore WhatsApp: teks setelah tanda ini ke-collapse
const READMORE = "\u200E".repeat(4001);

// ═══════════════ STATE ═══════════════

const DEFAULTS = () => ({
  enabled: false,
  targets: [],
  keywords: ["developer"],
  location: "Indonesia",
  datePosted: "r604800",   // LinkedIn f_TPR: r86400=24 jam, r604800=minggu, r2592000=bulan
  easyApply: false,
  limit: 20,
  intervalMenit: DEFAULT_INTERVAL_MENIT,
  lastCheck: null,
  lastSource: null,
  initDone: false,
  sentIds: {},
});

export function loadState() {
  try {
    return { ...DEFAULTS(), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
  } catch {
    return DEFAULTS();
  }
}

function saveState(st) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
  } catch (e) {
    logger.error?.("linkedin-notify", `gagal simpan state: ${e.message}`);
  }
}

// ═══════════════ SOCK ═══════════════

let sock = null;
export function setSock(_sock) { sock = _sock; syncMonitor(); }

// ═══════════════ FETCH (Apify) ═══════════════

let fetcher = null; // injectable buat E2E
export function setFetcher(fn) { fetcher = fn; }

export async function fetchLinkedInJobs({ keywords, location, datePosted, easyApply, limit }) {
  if (fetcher) return fetcher({ keywords, location, datePosted, easyApply, limit });
  const items = await apifyRunSync(ACTOR, {
    keywords, location, datePosted,
    ...(easyApply ? { easyApply: true } : {}),
    limit: Math.min(limit || 20, MAX_LIMIT),
  }, { maxItems: MAX_LIMIT });
  return items || [];
}

// ═══════════════ FORMAT CARD ═══════════════

function plain(str) {
  return String(str || "").replace(/<[^>]*>/g, "").replace(/\r/g, "").trim();
}

/**
 * Card per-lowongan ala anime notifier — metadata lengkap + deskripsi
 * di balik ℅readmore.
 */
export function formatJobCard(j, { index = 1, total = 1 } = {}) {
  const desc = plain(j.description);
  const lines = [
    `💼 *LOWONGAN LINKEDIN BARU!*`,
    ``,
    `${index}. *${plain(j.title) || "Posisi baru"}*`,
    ``,
    `🏢 Perusahaan: ${plain(j.companyName) || "-"}`,
    `📍 Lokasi: ${plain(j.location) || "-"}`,
    `💼 Tipe: ${plain(j.contractType) || "-"}${j.workType ? ` · ${plain(j.workType)}` : ""}`,
  ];
  if (j.sector) lines.push(`⚙️ Sektor: ${plain(j.sector)}`);
  if (j.experienceLevel && j.experienceLevel.toLowerCase() !== "not applicable")
    lines.push(`🏅 Level: ${plain(j.experienceLevel)}`);
  if (j.salary) lines.push(`💵 Gaji: ${plain(j.salary)}`);
  const meta = [];
  if (j.postedTimeAgo) meta.push(`⏰ ${plain(j.postedTimeAgo)}`);
  if (j.applicationsCount) {
    const ac = plain(j.applicationsCount);
    // 'Over 200 applicants' dsb → jangan dobel jadi '... applicants pelamar'
    meta.push(`📊 ${/applicant|pelamar/i.test(ac) ? ac : ac + ' pelamar'}`);
  }
  if (meta.length) lines.push(meta.join(" · "));
  const link = j.applyUrl || j.url;
  if (link) lines.push(`🔗 Lamar: ${link}`);
  if (desc) lines.push(``, `📖 Deskripsi:${READMORE}`, ``, desc);
  lines.push(``, `📌 *${total}* lowongan baru terdeteksi (sumber: LinkedIn Jobs)`);
  return lines.join("\n");
}

export async function sendJobCardTo(_sock, chatId, j, { index = 1, total = 1 } = {}) {
  if (!_sock || !chatId) return false;
  const caption = formatJobCard(j, { index, total });
  const banner = {
    title: plain(j.title) || "LinkedIn Jobs",
    body: plain(j.companyName) || "Lowongan baru",
    sourceUrl: j.applyUrl || j.url || "https://www.linkedin.com/jobs/",
    mediaType: 1,
    renderLargerThumbnail: true,
    showAdAttribution: false,
  };
  try {
    await _sock.sendMessage(chatId, { text: caption, contextInfo: { externalAdReply: banner } });
  } catch (e) {
    logger.error?.("linkedin-notify", `gagal kirim card ke ${chatId}: ${e.message}`);
    try { await _sock.sendMessage(chatId, { text: caption }); } catch { }
  }
  await new Promise((r) => setTimeout(r, CAP_DELAY_MS));
  return true;
}

// ═══════════════ CORE CHECK ═══════════════

let queue = Promise.resolve();
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => { });
  return run;
}

let windowOverride;
export function __setWindowOverride(v) { windowOverride = v; } // test hook
function windowOk() {
  if (windowOverride !== undefined) return !!windowOverride;
  const hour = Number(new Date().toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }));
  return hour >= WINDOW_START && hour < WINDOW_END;
}

function pruneSentIds(st) {
  const cutoff = Date.now() - SENT_TTL_DAYS * 86400000;
  for (const [id, ts] of Object.entries(st.sentIds || {})) {
    if (new Date(ts).getTime() < cutoff) delete st.sentIds[id];
  }
}

async function doRunCheck(opts = {}) {
  const st = loadState();
  const force = !!opts.force;
  const chatId = opts.chatId || null;

  // Throttle + window (credit guard) — force untuk .linkedinnotify now
  const due = !st.lastCheck || Date.now() - new Date(st.lastCheck).getTime() >= st.intervalMenit * 60000;
  if (!force && !due) return { sent: 0, skipped: "throttle" };
  if (!force && !windowOk()) return { sent: 0, skipped: "window" };
  if (!st.keywords?.length) return { sent: 0, skipped: "keyword kosong" };

  st.lastCheck = new Date().toISOString();
  saveState(st);

  // Fetch per keyword (tiap keyword = 1 run actor — credit!)
  const all = [];
  let okRuns = 0, lastErr = null;
  for (const kw of st.keywords.slice(0, MAX_KEYWORDS)) {
    try {
      const items = await fetchLinkedInJobs({
        keywords: kw, location: st.location, datePosted: st.datePosted,
        easyApply: st.easyApply, limit: st.limit,
      });
      okRuns++;
      for (const it of items) all.push({ ...it, __kw: kw });
    } catch (e) {
      lastErr = e.message;
      logger.warn?.("linkedin-notify", `fetch "${kw}" gagal: ${e.message}`);
    }
  }
  if (!okRuns) { st.lastSource = `apify error: ${lastErr || "?"}`; saveState(st); return { sent: 0, error: lastErr }; }
  st.lastSource = `apify/linkedin (${st.keywords.slice(0, MAX_KEYWORDS).join(", ")})`;

  // Dedup per job id + urut terbaru duluan. WAJIB dedup antar-keyword dulu —
  // job sama bisa muncul dari beberapa keyword (run actor terpisah).
  pruneSentIds(st);
  const byId = new Map();
  for (const it of all) byId.set(String(it.id || it.url || it.title), it);
  const uniq = [...byId.values()];
  const seen = st.sentIds || {};
  const fresh = [];
  for (const it of uniq) {
    const id = String(it.id || it.url || it.title);
    if (seen[id]) continue;
    if (!force && !st.initDone) { seen[id] = Date.now(); continue; } // baseline silent
    fresh.push(it);
  }

  // HANYA job yang beneran dikirim yang di-mark sent — sisanya tetap fresh,
  // kekirim cycle berikutnya (cap anti-spam gak boleh bikin job nyasar).
  const capped = fresh.slice(0, CAP_PER_CHECK);
  for (const it of capped) seen[String(it.id || it.url || it.title)] = Date.now();
  st.sentIds = seen;
  st.initDone = true;
  saveState(st);

  // Target: subscriber + terpusat (force → chat yang minta)
  let targets = chatId ? [chatId] : await mergeAutoTargets(sock, "autolinkedin", st.targets);
  if (!chatId && st.enabled !== true && targets.length === 0) return { sent: 0, jobs: 0 };

  let sent = 0;
  if (capped.length) {
    for (const j of capped) {
      for (const t of targets) {
        if (await sendJobCardTo(sock, t, j, { index: sent % CAP_PER_CHECK + 1, total: capped.length })) sent++;
      }
    }
  }
  saveState(st);
  return { sent, jobs: fresh.length, capped: capped.length, source: st.lastSource };
}

export function runCheck(opts = {}) {
  return enqueue(() => doRunCheck(opts));
}

// ═══════════════ SCHEDULER ═══════════════

let monitor = null;
export function initLinkedInNotifier(_sock) {
  setSock(_sock);
  syncMonitor();
}

export function isLinkedInNotifierOn() {
  try { return !!loadState().enabled; } catch { return false; }
}
function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

export function setLinkedInNotifierOn(on) {
  const st = loadState();
  st.enabled = on === true;
  // ON dengan target kosong = auto-add owner (ala TARGET_NUMBER script owner)
  if (st.enabled && st.targets.length === 0) {
    const owner = getOwnerJid();
    if (owner) st.targets.push(owner);
  }
  saveState(st);
  syncMonitor();
  return st.enabled;
}

export function syncMonitor() {
  const on = isLinkedInNotifierOn();
  if (on && !monitor) {
    monitor = new CronJob("*/5 * * * *", () => {
      runCheck().catch((e) => logger.error?.("linkedin-notify", e.message));
    }, null, true, TZ);
    logger.success?.("linkedin-notify", "monitor aktif (cek tiap 5 mnt, throttle internal)");
  } else if (!on && monitor) {
    monitor.stop();
    monitor = null;
    logger.info?.("linkedin-notify", "monitor berhenti");
  }
}

// ═══════════════ SUBSCRIBER / CONFIG CRUD ═══════════════

export function addTarget(jid) {
  const st = loadState();
  if (!st.targets.includes(jid)) st.targets.push(jid);
  saveState(st);
  return true;
}
export function removeTarget(jid) {
  const st = loadState();
  st.targets = st.targets.filter((t) => t !== jid);
  saveState(st);
  return true;
}
export function isTarget(jid) {
  return loadState().targets.includes(jid);
}

export function addKeyword(kw) {
  const st = loadState();
  const v = String(kw || "").trim();
  if (!v) return { ok: false, error: "kosong" };
  if (st.keywords.length >= MAX_KEYWORDS) return { ok: false, error: `maks ${MAX_KEYWORDS} keyword (tiap keyword = 1 run Apify/biaya)` };
  if (st.keywords.some((k) => k.toLowerCase() === v.toLowerCase())) return { ok: false, error: "udah ada" };
  st.keywords.push(v);
  saveState(st);
  return { ok: true, keywords: st.keywords };
}
export function delKeyword(kw) {
  const st = loadState();
  st.keywords = st.keywords.filter((k) => k.toLowerCase() !== String(kw || "").toLowerCase());
  saveState(st);
  return { ok: true, keywords: st.keywords };
}

export function setLocation(loc) {
  const st = loadState();
  st.location = String(loc || "").trim() || "Indonesia";
  saveState(st);
  return st.location;
}
export function setEasyApply(v) {
  const st = loadState();
  st.easyApply = v === true || v === "true";
  saveState(st);
  return st.easyApply;
}
export function setDatePosted(v) {
  const st = loadState();
  const allowed = { hari: "r86400", "24jam": "r86400", minggu: "r604800", bulan: "r2592000" };
  const key = String(v || "").toLowerCase().replace(/[\s-]/g, "");
  st.datePosted = allowed[key] || st.datePosted;
  saveState(st);
  return st.datePosted;
}
export function setIntervalMenit(menit) {
  const v = Number(menit);
  if (!v || v < 30 || v > 720) return null;
  const st = loadState();
  st.intervalMenit = v;
  saveState(st);
  return v;
}
export function getStatus() {
  const st = loadState();
  return {
    enabled: st.enabled,
    targets: [...st.targets],
    keywords: [...st.keywords],
    location: st.location,
    easyApply: st.easyApply,
    datePosted: st.datePosted,
    limit: st.limit,
    intervalMenit: st.intervalMenit,
    lastCheck: st.lastCheck,
    lastSource: st.lastSource,
    apifyToken: !!getApifyToken(),
    initDone: st.initDone,
  };
}
