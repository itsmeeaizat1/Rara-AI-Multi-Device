// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Memory watchdog — DEFAULT OFF (request owner 2026-09-04): watchdog gak
// aktif sampai owner nyalain manual via .memwatch on. Kenapa? Fitur .remini
// Local AI emang butuh RAM 1-3GB — watchdog yang matiin bot pas RAM
// tinggi itu ganggu render. Owner yang paling tahu kapan mau pakai.
import { logger } from "./rara-logger.js";

const DEFAULT_LIMIT_MB = 2048; // dipakai kalau owner gak set custom pas .memwatch on
const CHECK_INTERVAL = 5 * 60 * 1000;

let monitorTimer = null;
let isHdBusyFn = null; // hook: cek apakah ada render .remini lagi jalan

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

// ── STATE (db-driven, default OFF — live tanpa restart) ──
async function getState() {
  try {
    const { getDatabase } = await import("./rara-database.js");
    const db = getDatabase();
    const raw = db.get("memoryWatch");
    if (raw && typeof raw === "object") {
      return {
        enabled: !!raw.enabled,
        limitMB: Number(raw.limitMB) > 256 ? Math.round(Number(raw.limitMB)) : DEFAULT_LIMIT_MB,
      };
    }
  } catch {}
  return { enabled: false, limitMB: DEFAULT_LIMIT_MB };
}

async function setState(next) {
  const { getDatabase } = await import("./rara-database.js");
  const db = getDatabase();
  db.set("memoryWatch", next);
  return next;
}

// Dipanggil dari index.js biar monitor tahu status antrian .remini —
// kalau ON, restart ditunda selama ada render HD aktif.
function registerHdBusyCheck(fn) {
  isHdBusyFn = typeof fn === "function" ? fn : null;
}

async function startMemoryMonitor() {
  if (monitorTimer) return;

  monitorTimer = setInterval(async () => {
    const state = await getState();
    // DEFAULT OFF: state.enabled false → watchdog diem total (gak restart, gak log)
    if (!state.enabled) return;

    const mem = process.memoryUsage();
    if (global.gc) global.gc();

    if (mem.rss >= state.limitMB * 1024 * 1024) {
      const hdBusy = isHdBusyFn ? isHdBusyFn() : false;
      if (hdBusy) {
        logger.warn(
          "memory",
          `RSS ${formatMB(mem.rss)} melewati limit ${state.limitMB}MB tapi ada render .remini aktif — restart DITUNDA sampai render selesai`,
        );
        return;
      }
      logger.warn(
        "memory",
        `RSS ${formatMB(mem.rss)} melewati limit ${state.limitMB}MB, restarting`,
      );
      process.exit(1);
    }

    logger.system(
      "memory",
      `rss ${formatMB(mem.rss)} · heap ${formatMB(mem.heapUsed)}/${formatMB(mem.heapTotal)}`,
    );
  }, CHECK_INTERVAL);

  if (monitorTimer.unref) monitorTimer.unref();
  logger.success(
    "memory",
    `watchdog siap (default OFF — aktifkan via .memwatch on), cek tiap ${CHECK_INTERVAL / 60000}m`,
  );
}

function stopMemoryMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

export { startMemoryMonitor, stopMemoryMonitor, registerHdBusyCheck, getState, setState };
