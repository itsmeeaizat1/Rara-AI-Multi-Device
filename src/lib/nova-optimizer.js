// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-optimizer.js — Optimizer RAM otomatis (rev 26 Sep 2026, request
// owner: "buat fitur optimizer — ketika di-on otomatis, ketika bot
// memakan RAM lebih dari 500MB menurunkan RAM-nya, default-nya off").
//
// State: db.data.optimizer { on, thresholdMB, lastRun, totalRuns, lastFreedMB }
// Monitor (interval 15 dtk, knob OPTIMIZER_MS): kalau ON dan RSS bot >
// threshold → optimizeNow() → log panel "🧹 OPTIMIZER: ...".
// optimizeNow: GC manual via global.gc (butuh flag --expose-gc); tanpa
// flag itu tetap jujur — laporkan RAM sekarang + saran flag.
// Cooldown antar-optimasi 60 dtk biar gak thrash.

import { getDatabase } from "./nova-database.js";
import { formatBytes } from "./nova-pinglog.js";

const DEFAULT_MS = Number(process.env.OPTIMIZER_MS) > 0 ? Number(process.env.OPTIMIZER_MS) : 15000;
const COOLDOWN_MS = 60000;
const DEFAULT_THRESHOLD_MB = 500;

let monitorTimer = null;
let lastOptimizeAt = 0;
// seam test: bisa diganti biar e2e bisa simulasi RAM tinggi
let _getRss = () => process.memoryUsage().rss;

function getState() {
  const db = getDatabase();
  if (!db.data.optimizer) {
    db.data.optimizer = { on: false, thresholdMB: DEFAULT_THRESHOLD_MB, lastRun: 0, totalRuns: 0, lastFreedMB: 0 };
  }
  const st = db.data.optimizer;
  if (typeof st.thresholdMB !== "number" || st.thresholdMB < 100) st.thresholdMB = DEFAULT_THRESHOLD_MB;
  if (typeof st.on !== "boolean") st.on = false;
  return st;
}

export function getOptimizerState() {
  return { ...getState() };
}

export function setOptimizer(on, thresholdMB) {
  const st = getState();
  st.on = !!on;
  if (Number(thresholdMB) >= 100) st.thresholdMB = Number(thresholdMB);
  return { ...st };
}

// jalur optimasi — jujur soal metode yang tersedia
export async function optimizeNow(reason = "manual") {
  const st = getState();
  const before = _getRss();
  const methods = [];
  try {
    if (typeof global.gc === "function") {
      global.gc();
      methods.push("GC manual (--expose-gc)");
    }
  } catch {}
  // beri event loop jeda kecil biar pengukuran stabil
  await new Promise((r) => setTimeout(r, 100));
  const after = _getRss();
  const freedMB = Math.max(0, (before - after) / (1024 * 1024));
  st.lastRun = Date.now();
  st.totalRuns = (st.totalRuns || 0) + 1;
  st.lastFreedMB = Math.round(freedMB * 10) / 10;
  return {
    before,
    after,
    freedMB: st.lastFreedMB,
    methods,
    hint: methods.length ? "" : "node gak jalan dengan --expose-gc — GC manual gak aktif, optimasi terbatas",
    reason,
  };
}

async function monitorTick(print = console.log) {
  const st = getState();
  if (!st.on) return;
  const rss = _getRss();
  const limit = st.thresholdMB * 1024 * 1024;
  if (rss <= limit) return;
  if (Date.now() - lastOptimizeAt < COOLDOWN_MS) {
    print(`🧹 OPTIMIZER: RAM ${formatBytes(rss)} > ${st.thresholdMB} MB — cooldown, optimasi terakhir < 60 dtk`);
    return;
  }
  lastOptimizeAt = Date.now();
  const res = await optimizeNow("otomatis");
  print(
    `🧹 OPTIMIZER: RAM ${formatBytes(res.before)} > ${st.thresholdMB} MB → optimasi (${res.reason}) → sekarang ${formatBytes(res.after)} (bebaskan ${res.freedMB} MB)`,
  );
}

export function initOptimizerMonitor(opts = {}) {
  const ms = Number(opts.checkMs) > 0 ? Number(opts.checkMs) : DEFAULT_MS;
  if (monitorTimer) return { started: true, intervalMs: ms, reused: true };
  monitorTimer = setInterval(() => monitorTick().catch(() => {}), ms);
  monitorTimer.unref?.();
  return { started: true, intervalMs: ms };
}

export function stopOptimizerMonitor() {
  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = null;
}

// seam e2e
export function _optimizerInternalsForTest() {
  return {
    setGetRss: (fn) => (_getRss = fn),
    restoreGetRss: () => (_getRss = () => process.memoryUsage().rss),
    setLastOptimizeAt: (t) => (lastOptimizeAt = t),
    runMonitorTick: (print) => monitorTick(print),
    isMonitoring: () => !!monitorTimer,
  };
}
