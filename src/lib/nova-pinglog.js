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
import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";
import config from "../../config.js";
import { getAuthKey } from "./auth/auth.js";

const DEFAULT_MS = Number(process.env.PINGLOG_MS) > 0 ? Number(process.env.PINGLOG_MS) : 20000;
const DEFAULT_CLOCK_MS = Number(process.env.PINGCLOCK_MS) > 0 ? Number(process.env.PINGCLOCK_MS) : 10000;

let pingTimer = null;
let clockTimer = null;
let pingSock = null;
let evBound = null;
const stats = { msgs: 0, errors: 0, lastError: "", waStatus: "open" };
let loggerHooked = false;

// integritas kode: baseline { path → "size:mtime" }, dibangun saat start
let codeBaseline = null;
let lastCodeSig = "0.0.0";

// ─── RAM Alert (owner 26 Sep: "alert DM pas RAM lewat ambang — mau,
// defaultnya OFF") — pantau RAM SISTEM (os.totalmem - os.freemem), bukan
// RSS bot doang, biar keliatan bot + aicall + 9router yang borak barengan.
// Dicek tiap tick pinglog (20 dtk); DM owner max 1x per 30 mnt (cooldown).
// State persist: db.data.pinglog.ramAlert { on, thresholdPct, lastAlertAt }.
const RAMALERT_COOLDOWN_MS = 30 * 60 * 1000;
const RAMALERT_DEFAULT_PCT = 80;
let _ramMemForTest = null; // seam e2e: { total, free }

// info CPU buat kartu alert/status (owner 26 Sep: "termasuk penggunaan
// cpu juga diunjukan?") — load average 1 menit vs jumlah core = persen kasar
export function getCpuLoadInfo() {
  const cores = (os.cpus?.() || []).length || 1;
  const load = os.loadavg?.()?.[0] || 0;
  const pct = Math.min(999, Math.round((load / cores) * 100));
  return { cores, load: Math.round(load * 100) / 100, pct };
}

function getRamAlertState() {
  let st = null;
  try {
    const db = getDatabase();
    if (!db.data.pinglog || typeof db.data.pinglog !== "object") db.data.pinglog = {};
    if (!db.data.pinglog.ramAlert || typeof db.data.pinglog.ramAlert !== "object") {
      db.data.pinglog.ramAlert = { on: false, thresholdPct: RAMALERT_DEFAULT_PCT, lastAlertAt: 0 };
    }
    st = db.data.pinglog.ramAlert;
  } catch {
    st = { on: false, thresholdPct: RAMALERT_DEFAULT_PCT, lastAlertAt: 0 };
  }
  if (typeof st.on !== "boolean") st.on = false; // DEFAULT OFF
  const pct = Number(st.thresholdPct);
  st.thresholdPct = Number.isFinite(pct) && pct >= 50 && pct <= 99 ? pct : RAMALERT_DEFAULT_PCT;
  if (typeof st.lastAlertAt !== "number") st.lastAlertAt = 0;
  return st;
}

// set dari .index ramalert on|off [persen] — balikin state baru
export function setRamAlert(on, thresholdPct) {
  const st = getRamAlertState();
  st.on = !!on;
  const pct = Number(thresholdPct);
  if (on && Number.isFinite(pct) && pct >= 50 && pct <= 99) st.thresholdPct = pct;
  return { ...st };
}
export function getRamAlertStatus() {
  const st = getRamAlertState();
  const mem = _ramMemForTest || { total: os.totalmem(), free: os.freemem() };
  const used = Math.max(0, mem.total - mem.free);
  const pct = mem.total > 0 ? Math.round((used / mem.total) * 100) : 0;
  return { ...st, sysUsed: used, sysTotal: mem.total, sysPct: pct, rss: process.memoryUsage().rss, cpu: getCpuLoadInfo() };
}

// murni (dites e2e): keputusan alert dari nilai eksplisit
export function evaluateRamAlert({ on, thresholdPct, lastAlertAt = 0, sysPct, now = Date.now() } = {}) {
  if (!on) return { shouldAlert: false };
  if (!(Number(sysPct) >= Number(thresholdPct))) return { shouldAlert: false };
  // lastAlertAt 0 = belum pernah → jangan dianggap "masih cooldown" (falsy trap)
  const la = Number(lastAlertAt || 0);
  if (la > 0 && Number(now) - la < RAMALERT_COOLDOWN_MS) return { shouldAlert: false };
  return { shouldAlert: true };
}

// eksekusi di tiap tick — DM owner kalau lewat ambang (gagal senyap-proof)
async function checkRamAlert(print = () => {}) {
  const st = getRamAlertState();
  const mem = _ramMemForTest || { total: os.totalmem(), free: os.freemem() };
  const used = Math.max(0, mem.total - mem.free);
  const sysPct = mem.total > 0 ? Math.round((used / mem.total) * 100) : 0;
  const now = Date.now();
  const verdict = evaluateRamAlert({ on: st.on, thresholdPct: st.thresholdPct, lastAlertAt: st.lastAlertAt, sysPct, now });
  if (!verdict.shouldAlert) return false;
  st.lastAlertAt = now;
  print(`   🧠 RAM ALERT: sistem ${sysPct}% ≥ ambang ${st.thresholdPct}% — DM owner`);
  try {
    if (!pingSock?.sendMessage) return true;
    const ownerJid = _ramAlertOwnerJid();
    if (!ownerJid) return true;
    // rev owner 26 Sep: "jgn sebut wibnya, tambah tgl bln thn" — format
    // sama dengan jam ping log: "🕒 14.32.15, 26 September 2026"
    const jam = new Date(now).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replaceAll(":", ".");
    const tgl = new Date(now).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });
    const cpu = getCpuLoadInfo();
    // rev owner 26 Sep: "pas dikirim ke chat jgn ada format ballpointnya" —
    // DM alert dikirim PLAIN TEXT, tanpa bingkai kotak claraWrap.
    const dmLines = [
      `🧠 RAM SISTEM TINGGI`,
      ``,
      `Pemakaian: ${sysPct}% (${formatBytes(used)} dari ${formatBytes(mem.total)})`,
      `Ambang: ${st.thresholdPct}%`,
      `RAM bot: ${formatBytes(process.memoryUsage().rss)}`,
      `💻 CPU: load ${cpu.load} (${cpu.cores} core) ≈ ${cpu.pct}%`,
      `🕒 ${jam}, ${tgl}`,
      ``,
      `Cek proses borak: .index ramalert · optimasi: .index optimize`,
    ];
    await pingSock.sendMessage(ownerJid, { text: dmLines.join("\n") });
  } catch (e) {
    try { logger.error("RamAlert", `DM gagal: ${e?.message || e}`); } catch {}
  }
  return true;
}

// jid owner (pola nova-auto-api-health) — seam-able
let _ownerJidImpl = null;
export function _setRamAlertOwnerJidForTest(fn) { _ownerJidImpl = fn; }
export function _clearRamAlertOwnerJidForTest() { _ownerJidImpl = null; }
export function _setRamMemForTest(v) { _ramMemForTest = v; }
export function _clearRamMemForTest() { _ramMemForTest = null; }
function _ramAlertOwnerJid() {
  if (typeof _ownerJidImpl === "function") return _ownerJidImpl();
  try {
    const nums = config?.owner?.number || [];
    const num = String(nums[0] || "").replace(/[^0-9]/g, "");
    return num ? `${num}@s.whatsapp.net` : null;
  } catch { return null; }
}

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

// log jam WIB tiap 10 dtk — format owner: "🕒 18:18:23, 07 September 2026"
export function formatClockLine(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const jam = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d); // en-GB → pemisah ":" (id-ID pakai ".")
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric",
  }).format(d); // "07 September 2026"
  return `🕒 ${jam}, ${tanggal}`;
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

  // RAM alert — DM owner pas RAM sistem lewat ambang (default OFF,
  // dinyalain via .index ramalert on [persen]; cooldown DM 30 mnt)
  await checkRamAlert(print).catch(() => {});

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

  // log jam WIB tiap 10 dtk — bisa dikontrol runtime lewat startPingClock/stopPingClock
  startPingClock({ ms: opts.clockMs });
  return { started: true, intervalMs: ms };
}

// ─── Clock ticker terpisah (dikontrol runtime via .index jam on/off) ───
export function startPingClock(opts = {}) {
  if (process.env.PINGCLOCK_OFF === "1") return { started: false, reason: "PINGCLOCK_OFF" };
  if (clockTimer) return { started: true, reused: true };
  const cms = Number(opts.ms) > 0 ? Number(opts.ms) : DEFAULT_CLOCK_MS;
  console.log(formatClockLine());
  clockTimer = setInterval(() => console.log(formatClockLine()), cms);
  clockTimer.unref?.();
  return { started: true, intervalMs: cms };
}

export function stopPingClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}

export function stopPingLog() {
  if (pingTimer) clearInterval(pingTimer);
  if (clockTimer) clearInterval(clockTimer);
  pingTimer = null;
  clockTimer = null;
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
    isClockRunning: () => !!clockTimer,
    currentSock: () => pingSock,
    setWaStatus: (s) => (stats.waStatus = s),
    resetStats: () => {
      stats.msgs = 0;
      stats.errors = 0;
      stats.lastError = "";
      stats.waStatus = "open";
    },
    runTick: (print) => tick(print),
    runCheckRamAlert: (print) => checkRamAlert(print),
    getCodeBaseline: () => codeBaseline,
    setCodeBaseline: (b) => (codeBaseline = b),
    getLastCodeSig: () => lastCodeSig,
    setLastCodeSig: (s) => (lastCodeSig = s),
  };
}
