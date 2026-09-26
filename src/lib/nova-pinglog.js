// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-pinglog.js — Ping log interaktif panel (rev 26 Sep 2026, request
// owner: "lognya ibarat log bot modern masa depan, banyak field lengkap:
// keamanan, ping, deteksi ada yg ubah kode entah aku atau orang lain di
// panel sewa — tapi kode/file yg diubah GAK disebuttin").
//
// Tiap 20 dtk (knob env PINGLOG_MS) satu baris status keluar di log:
//   🕒 10.53.12 │ ⏱ up 1j 5m │ 🧠 412 MB │ 💻 cpu 0.8 │ ⚡ 342ms │ 📡 WA ✅
//   │ 📥 12 msg │ ❌ 0 err │ 🔒 kode ✅ │ 🔐 sandi ON
// Deteksi kerusakan & keamanan:
//   ⚠ deteksi error (hook logger.error, per window 20 dtk)
//   🔐 DETEKSI PERUBAHAN KODE — file berubah/baru/hilang DISEBUTKAN
//      lengkap dengan lokasinya (rev owner 26 Sep: "file disebutin mana
//      yg diubah lokasinya, bisa deteksi file ditambah & dihapus");
//      isi kodenya TETAP gak pernah ditampilkan. Baseline stat:
//      size+mtime seluruh .js plugins/ + src/ + index.js, dibangun saat boot.
//
// Anti-leak: interval idempotent (panggil 2x gak dobel), timer unref biar
// proses bisa exit wajar, PINGLOG_OFF=1 matiin total.

import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./nova-logger.js";
import { getAuthKey } from "./auth/auth.js";

const DEFAULT_MS = Number(process.env.PINGLOG_MS) > 0 ? Number(process.env.PINGLOG_MS) : 20000;

let pingTimer = null;
let pingSock = null;
let evBound = null;
const stats = { msgs: 0, errors: 0, lastError: "", waStatus: "open" };
let loggerHooked = false;

// integritas kode: baseline { path → "size:mtime" }, dibangun saat start
let codeBaseline = null;
let lastCodeSig = "0.0.0";

// ─── Format murni (dites e2e) ───

export function formatDuration(totalSec = 0) {
  let s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const d = Math.floor(s / 86400); s %= 86400;
  const j = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const out = [];
  if (d) out.push(`${d}h`);
  if (j) out.push(`${j}j`);
  if (m) out.push(`${m}m`);
  out.push(`${s}dtk`);
  return out.slice(0, 3).join(" ");
}

export function formatBytes(bytes = 0) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b < 1024) return `${Math.round(b)} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function clockString(now) {
  const d = now instanceof Date ? now : new Date(now);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(".");
}

export function buildPingLine(opts = {}) {
  const {
    now = new Date(),
    upSec = 0,
    rss = 0,
    pingMs = -1,
    waOk = true,
    msgs = 0,
    errors = 0,
    cpu = 0,
    kodeChanged = 0,
    kodeNew = 0,
    kodeGone = 0,
    sandiOn = null,
  } = opts;
  const kodeTotal = kodeChanged + kodeNew + kodeGone;
  const kodeTag = kodeTotal === 0 ? "🔒 kode ✅" : `🔒 kode ${kodeTotal}≠`;
  const sandiTag = sandiOn === null ? "🔐 sandi –" : sandiOn ? "🔐 sandi ON" : "🔐 sandi OFF";
  const parts = [
    `🕒 ${clockString(now)}`,
    `⏱ up ${formatDuration(upSec)}`,
    `🧠 ${formatBytes(rss)}`,
    `💻 cpu ${Math.max(0, Number(cpu) || 0).toFixed(1)}`,
    pingMs >= 0 ? `⚡ ${Math.round(pingMs)}ms` : "⚡ ∅",
    waOk ? "📡 WA ✅" : "📡 WA ❌",
    `📥 ${msgs} msg`,
    `❌ ${errors} err`,
    kodeTag,
    sandiTag,
  ];
  return parts.join(" │ ");
}

// ─── Integritas kode (tanpa menyebutkan file/isi kode) ───

// scan seluruh .js di plugins/ + src/ + index.js → signature stat (size:mtime)
export function scanCodeTree(rootDir = process.cwd()) {
  const out = {};
  const skipDirs = new Set(["node_modules", "storage", "jadibot_auth", "session"]);
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") || skipDirs.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".js")) {
        try {
          const st = fs.statSync(full);
          out[full] = `${st.size}:${Math.floor(st.mtimeMs)}`;
        } catch {}
      }
    }
  };
  for (const rel of ["plugins", "src"]) walk(path.join(rootDir, rel));
  try {
    const st = fs.statSync(path.join(rootDir, "index.js"));
    out[path.join(rootDir, "index.js")] = `${st.size}:${Math.floor(st.mtimeMs)}`;
  } catch {}
  return out;
}

// diff murni: hitung berubah/baru/hilang + DAFTAR file-nya (rev owner:
// file & lokasi disebutin; isi kode tetap gak pernah keluar)
export function diffCodeTrees(baseline = {}, current = {}) {
  const changedFiles = [], addedFiles = [], deletedFiles = [];
  for (const [f, sig] of Object.entries(current)) {
    if (!(f in baseline)) addedFiles.push(f);
    else if (baseline[f] !== sig) changedFiles.push(f);
  }
  for (const f of Object.keys(baseline)) {
    if (!(f in current)) deletedFiles.push(f);
  }
  const sortRel = (arr) => arr
    .map((f) => path.relative(process.cwd(), f) || f)
    .sort();
  return {
    changed: changedFiles.length,
    added: addedFiles.length,
    deleted: deletedFiles.length,
    changedFiles: sortRel(changedFiles),
    addedFiles: sortRel(addedFiles),
    deletedFiles: sortRel(deletedFiles),
  };
}

// render daftar file deteksi — cap 5 per kategori biar log gak kebanjiran
const DETEKSI_CAP = 5;
export function renderDeteksiFiles(kode = {}) {
  const lines = [];
  const push = (icon, files) => {
    files.slice(0, DETEKSI_CAP).forEach((f) => lines.push(`      ${icon} ${f}`));
    if (files.length > DETEKSI_CAP) lines.push(`      … +${files.length - DETEKSI_CAP} file lainnya`);
  };
  push("✏", kode.changedFiles || []);
  push("＋", kode.addedFiles || []);
  push("－", kode.deletedFiles || []);
  return lines;
}

// ─── Counter window (reset tiap tick) ───

export function notePingMessage() {
  stats.msgs += 1;
}

export function notePingError(message = "") {
  stats.errors += 1;
  stats.lastError = String(message).replace(/\s+/g, " ").slice(0, 90).trim();
}

// hook otomatis: SEMUA logger.error kehitung sebagai deteksi kerusakan
function hookLoggerError() {
  if (loggerHooked || typeof logger?.error !== "function") return;
  loggerHooked = true;
  const orig = logger.error.bind(logger);
  logger.error = (label, detail = "") => {
    notePingError(`${label}: ${detail ?? ""}`);
    return orig(label, detail);
  };
}

// ─── Ping WA via IQ keepalive (pola sock.query jpm.js), timeout 5 dtk ───

async function measurePing(sock) {
  try {
    const t0 = Date.now();
    await Promise.race([
      sock.query({
        tag: "iq",
        attrs: {
          id: sock.generateMessageTag?.() || String(t0),
          type: "get",
          xmlns: "w:p",
          to: "@s.whatsapp.net",
        },
        content: undefined,
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ping timeout")), 5000)),
    ]);
    return Date.now() - t0;
  } catch {
    return -1;
  }
}

// ─── Tick: kumpulin data, cetak baris, reset window ───

async function tick(print = console.log) {
  const pingMs = pingSock ? await measurePing(pingSock) : -1;
  const waOk = pingMs >= 0 && stats.waStatus !== "close";

  // integritas kode: scan & diff tiap tick (stat doang, ringan)
  let kode = { changed: 0, added: 0, deleted: 0 };
  if (codeBaseline) {
    kode = diffCodeTrees(codeBaseline, scanCodeTree());
  }
  const kodeTotal = kode.changed + kode.added + kode.deleted;
  const kodeSig = [
    kode.changed, kode.added, kode.deleted,
    ...(kode.changedFiles || []), ...(kode.addedFiles || []), ...(kode.deletedFiles || []),
  ].join("|");

  print(
    buildPingLine({
      now: new Date(),
      upSec: process.uptime(),
      rss: process.memoryUsage().rss,
      pingMs,
      waOk,
      msgs: stats.msgs,
      errors: stats.errors,
      cpu: os.loadavg?.()?.[0] || 0,
      kodeChanged: kode.changed,
      kodeNew: kode.added,
      kodeGone: kode.deleted,
      sandiOn: typeof getAuthKey === "function" ? !!getAuthKey() : null,
    }),
  );

  // log deteksi kerusakan: error di window ini ditampilkan detilnya
  if (stats.errors > 0 && stats.lastError) {
    print(`   ⚠ deteksi ${stats.errors}x — ${stats.lastError}`);
  }

  // log deteksi perubahan kode — TANPA menyebutkan file/kode mana pun.
  // baris khusus cuma muncul saat jumlah berubah; baris ping tetap nunjukin totalnya.
  if (codeBaseline && kodeSig !== lastCodeSig) {
    if (kodeTotal > 0) {
      print(`   🔐 DETEKSI PERUBAHAN KODE: ${kode.changed} berubah · ${kode.added} baru · ${kode.deleted} hilang — restart bot biar perubahan aktif`);
      for (const fl of renderDeteksiFiles(kode)) print(fl);
    } else if (lastCodeSig !== "0.0.0") {
      print("   ✅ kode kembali utuh sesuai baseline boot");
    }
    lastCodeSig = kodeSig;
  }

  stats.msgs = 0;
  stats.errors = 0;
  stats.lastError = "";
}

// ─── Lifecycle ───

export function startPingLog(sock, opts = {}) {
  if (process.env.PINGLOG_OFF === "1") return { started: false, reason: "PINGLOG_OFF" };
  const ms = Number(opts.intervalMs) > 0 ? Number(opts.intervalMs) : DEFAULT_MS;

  // idempotent: udah jalan → cukup ganti sock (reconnect), JANGAN bikin timer kedua
  if (pingTimer) {
    pingSock = sock || pingSock;
    return { started: true, intervalMs: ms, reused: true };
  }

  pingSock = sock || null;
  hookLoggerError();

  // baseline integritas kode dibangun SEKALI saat boot
  codeBaseline = scanCodeTree();
  lastCodeSig = "0.0.0";

  // pantau status koneksi + hitung pesan masuk
  evBound = { msgs: null, conn: null };
  try {
    if (pingSock?.ev?.on) {
      evBound.msgs = () => notePingMessage();
      evBound.conn = (u) => {
        if (u?.connection) stats.waStatus = u.connection;
      };
      pingSock.ev.on("messages.upsert", evBound.msgs);
      pingSock.ev.on("connection.update", evBound.conn);
    }
  } catch {}

  console.log("");
  console.log("「 ✦ PING LOG ✦ 」");
  console.log("");
  console.log(`│ 🕒 aktif tiap ${ms >= 1000 ? Math.round(ms / 1000) + " dtk" : ms + "ms"} — ping, RAM, cpu, koneksi, pesan, error, sandi, integritas kode`);
  console.log("");

  // tick pertama langsung, sisanya interval
  tick().catch(() => {});
  pingTimer = setInterval(() => tick().catch(() => {}), ms);
  pingTimer.unref?.();
  return { started: true, intervalMs: ms };
}

export function stopPingLog() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
  try {
    if (evBound?.msgs) pingSock?.ev?.off?.("messages.upsert", evBound.msgs);
    if (evBound?.conn) pingSock?.ev?.off?.("connection.update", evBound.conn);
  } catch {}
  evBound = null;
  pingSock = null;
}

// seam e2e
export function _pingLogInternalsForTest() {
  return {
    stats,
    isRunning: () => !!pingTimer,
    currentSock: () => pingSock,
    setWaStatus: (s) => (stats.waStatus = s),
    resetStats: () => {
      stats.msgs = 0;
      stats.errors = 0;
      stats.lastError = "";
      stats.waStatus = "open";
    },
    runTick: (print) => tick(print),
    getCodeBaseline: () => codeBaseline,
    setCodeBaseline: (b) => (codeBaseline = b),
    getLastCodeSig: () => lastCodeSig,
    setLastCodeSig: (s) => (lastCodeSig = s),
  };
}
