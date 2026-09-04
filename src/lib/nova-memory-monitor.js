// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { logger } from "./nova-logger.js";

// Limit dinaikin dari 1024MB → 2048MB (2026-09-04, fix owner report):
// fitur .remini Local AI (Swin2SR/ONNX) DIDESAIN butuh RSS ~1-3GB pas proses
// (tiling + model in-memory) — limit lama 1GB PASTI ketrigger tiap kali ada
// yang enhance gambar, bot restart paksa DI TENGAH render → job ilang tanpa
// pesan error (proses mati duluan sebelum sempet reply). Kalau limit lama
// dipertahankan, fitur .remini gak akan PERNAH bisa selesai secara wajar.
// CATATAN: 2048MB ini asumsi container punya RAM cukup (≥3GB dianjurkan).
// Kalau panel/VPS RAM-nya lebih kecil dari itu, OS bisa OOM-kill proses
// duluan sebelum watchdog ini kesempat jalan (OOM kill lebih kasar —
// gak ada log graceful kayak ini). Owner: cek RAM aktual container,
// sesuaikan RSS_LIMIT_MB di bawah biar pas (idealnya limit ≈ 70% RAM total).
const RSS_LIMIT_MB = 2048;
const RSS_LIMIT = RSS_LIMIT_MB * 1024 * 1024;
const CHECK_INTERVAL = 5 * 60 * 1000;

let monitorTimer = null;
let isHdBusyFn = null; // hook opsional: cek apakah ada render .remini lagi jalan

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

// Dipanggil dari index.js biar monitor tahu status antrian .remini —
// restart DITUNDA (bukan dibatalkan) selama ada render aktif, biar job
// gak ilang di tengah jalan. Limit RAM tetap ditegakkan begitu render kelar.
function registerHdBusyCheck(fn) {
  isHdBusyFn = typeof fn === "function" ? fn : null;
}

function startMemoryMonitor() {
  if (monitorTimer) return;

  monitorTimer = setInterval(() => {
    const mem = process.memoryUsage();

    if (global.gc) global.gc();

    if (mem.rss >= RSS_LIMIT) {
      const hdBusy = isHdBusyFn ? isHdBusyFn() : false;
      if (hdBusy) {
        logger.warn(
          "memory",
          `RSS ${formatMB(mem.rss)} exceeded ${formatMB(RSS_LIMIT)} limit tapi ada render .remini aktif — restart DITUNDA sampai render selesai`,
        );
        return; // cek lagi cycle berikutnya — job HD gak digugurin di tengah proses
      }
      logger.warn(
        "memory",
        `RSS ${formatMB(mem.rss)} exceeded ${formatMB(RSS_LIMIT)} limit, restarting`,
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
    `monitoring active, limit ${formatMB(RSS_LIMIT)}, check every ${CHECK_INTERVAL / 60000}m`,
  );
}

function stopMemoryMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

export { startMemoryMonitor, stopMemoryMonitor, registerHdBusyCheck };
