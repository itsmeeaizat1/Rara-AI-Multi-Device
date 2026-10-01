// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 rara-conn-journal.js — jurnal koneksi WhatsApp (fix 18 Sep 2026)
// 🔹 Report owner: "bot bntar reconnect stiap 10 menit atau brapa menit,
//   apakah ada fitur yg membuat bot reconnect apa dr baileysnya sendiri?"
// 🔹 MASALAH: setiap reconnect bot kirim "Bot Online ✦" ke owner, tapi
//   gak pernah nyatet KENAPA putus — kode disconnect (440/515/timedOut
//   dll) cuma nongol di console VPS yang mungkin udah ke-scroll jauh.
//   Owner gak bisa bedain: (a) watchdog 30 menit hening nyabut koneksi
//   sengaja, (b) WhatsApp/Baileys yang drop (stream error 515/timedOut),
//   (c) 440 konflik perangkat, (d) PM2 restart (OOM/crashguard).
// 🔹 SOLUSI: jurnal PERSIST (storage/connlog.json) — tiap disconnect
//   dicatat {waktu, kode, alasan, lama nyambung sebelum putus, sumber},
//   tiap connect dicatat juga. Notif "Bot Online" otomatis nunjukin
//   alasan putus terakhir. Command .connlog (owner) nampilin riwayat +
//   analisis pola (interval rata-rata, penyebab terbanyak) — dari situ
//   kelihatan beneran reconnect tiap berapa menit dan kenapa.
// 🔹 Aman: semua operasi try/catch — jurnal gagal = bot tetap jalan
//   normal; file kecil (max 100 entri, dibaca-tulis sync).
// ============================================================
import fs from "fs";
import path from "path";

const MAX_ENTRIES = 100;
let _journalFile = null; // seam test

function journalFile() {
  if (_journalFile) return _journalFile;
  return path.join(process.cwd(), "storage", "connlog.json");
}

function readJournal() {
  try {
    const raw = fs.readFileSync(journalFile(), "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data.entries)) return data;
  } catch {}
  return { entries: [] };
}

function writeJournal(data) {
  try {
    const file = journalFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("[conn-journal] gagal simpan:", e?.message);
  }
}

function push(entry) {
  const data = readJournal();
  data.entries.push({ ts: Date.now(), ...entry });
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(-MAX_ENTRIES);
  }
  writeJournal(data);
  return entry;
}

/** Catat disconnect: kode + alasan + lama nyambung sebelum putus. */
export function recordDisconnect({ code, msg, source }) {
  return push({
    type: "disconnect",
    code: code ?? null,
    msg: msg || "Unknown",
    source: String(source || "").slice(0, 200),
  });
}

/** Catat koneksi nyala (dipakai buat hitung uptime tiap sesi). */
export function recordConnect() {
  return push({ type: "connect", code: null, msg: "Bot Online", source: "" });
}

/** Catat watchdog nyabut koneksi sengaja (idle 30 menit tanpa pesan). */
export function recordWatchdog(timeoutMinutes) {
  return push({
    type: "watchdog",
    code: null,
    msg: "Watchdog — " + (timeoutMinutes || 30) + " menit tanpa pesan masuk, koneksi disengaja direstart",
    source: "watchdog",
  });
}

export function getJournal() {
  return readJournal().entries;
}

export function clearJournal() {
  writeJournal({ entries: [] });
}

/**
 * Analisis pola disconnect — jawaban langsung buat "reconnect tiap berapa
 * menit dan kenapa": daftar entri disconnect + watchdog diberi field
 * uptimeMs (lama sesi sebelum putus) dihitung dari connect sebelumnya,
 * interval antar-putus, jumlah per alasan, dan rata-rata interval.
 */
export function analyzeJournal() {
  const entries = getJournal();
  const disc = entries.filter((e) => e.type === "disconnect" || e.type === "watchdog");

  // hitung lama-nyambung per disconnect (dari connect/open terakhir sebelum dia)
  const withUptime = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.type !== "disconnect" && e.type !== "watchdog") continue;
    let lastConnect = null;
    for (let j = i - 1; j >= 0; j--) {
      if (entries[j].type === "connect") { lastConnect = entries[j]; break; }
    }
    withUptime.push({
      ...e,
      uptimeMs: lastConnect ? e.ts - lastConnect.ts : null,
    });
  }

  // interval antar-putus
  const intervals = [];
  for (let i = 1; i < withUptime.length; i++) {
    intervals.push(withUptime[i].ts - withUptime[i - 1].ts);
  }

  const byReason = {};
  for (const d of withUptime) {
    const key = String(d.code ?? "watchdog") + " — " + String(d.msg).split("—")[0].trim().slice(0, 40);
    byReason[key] = (byReason[key] || 0) + 1;
  }

  const lastConnect = [...entries].reverse().find((e) => e.type === "connect");
  return {
    total: entries.length,
    disconnectCount: withUptime.length,
    intervals: {
      count: intervals.length,
      avgMs: intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null,
      minMs: intervals.length ? Math.min(...intervals) : null,
      maxMs: intervals.length ? Math.max(...intervals) : null,
    },
    byReason,
    recent: withUptime.slice(-10).reverse(),
    lastConnectAt: lastConnect?.ts || null,
  };
}

// ── seam test ──
export function _setJournalFileForTest(file) {
  _journalFile = file;
}
