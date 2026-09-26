// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-pinglog.js — Ping log interaktif panel (rev 26 Sep 2026, request
// owner: "di log panel saat bot udah run ada log ping tiap 20 detik, log
// deteksi kerusakan, dll — biar log interaktif lengkap").
//
// Tiap 20 dtk (knob env PINGLOG_MS) satu baris status ringkas keluar di log:
//   🕒 10.53.12 │ ⏱ up 1j 5m │ 🧠 412 MB │ ⚡ 342ms │ 📡 WA ✅ │ 📥 12 msg │ ❌ 0 err
// Deteksi kerusakan: ping WA timeout / koneksi close → WA ❌, error via hook
// logger.error → baris "⚠ deteksi: ..." sampai error terakhir tiap window.
//
// Anti-leak: interval idempotent (panggil 2x gak dobel), timer unref biar
// proses bisa exit wajar, PINGLOG_OFF=1 matiin total.

import { logger } from "./nova-logger.js";

const DEFAULT_MS = Number(process.env.PINGLOG_MS) > 0 ? Number(process.env.PINGLOG_MS) : 20000;

let pingTimer = null;
let pingSock = null;
let evBound = null;
const stats = { msgs: 0, errors: 0, lastError: "", waStatus: "open" };
let loggerHooked = false;

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
  } = opts;
  const parts = [
    `🕒 ${clockString(now)}`,
    `⏱ up ${formatDuration(upSec)}`,
    `🧠 ${formatBytes(rss)}`,
    pingMs >= 0 ? `⚡ ${Math.round(pingMs)}ms` : "⚡ ∅",
    waOk ? "📡 WA ✅" : "📡 WA ❌",
    `📥 ${msgs} msg`,
    `❌ ${errors} err`,
  ];
  return parts.join(" │ ");
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
  print(
    buildPingLine({
      now: new Date(),
      upSec: process.uptime(),
      rss: process.memoryUsage().rss,
      pingMs,
      waOk,
      msgs: stats.msgs,
      errors: stats.errors,
    }),
  );
  // log deteksi kerusakan: error di window ini ditampilkan detilnya
  if (stats.errors > 0 && stats.lastError) {
    print(`   ⚠ deteksi ${stats.errors}x — ${stats.lastError}`);
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
  console.log(`│ 🕒 aktif tiap ${ms >= 1000 ? Math.round(ms / 1000) + " dtk" : ms + "ms"} — ping, RAM, koneksi, pesan, error`);
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
  };
}
