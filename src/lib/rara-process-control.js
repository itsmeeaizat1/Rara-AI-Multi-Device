// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-process-control.js — kontrol proses bot runtime (26 Sep 2026,
// fitur no.2 dari panel .index owner: ".index restart — restart bot
// dari chat, process.exit lalu pm2 bangunin lagi").
//
// gracefulRestart(): simpan DB DULU (anti rugi data), lalu exit dengan
// jeda 1.5 dtk (balasan WhatsApp sempat kekirim dulu). Idempotent —
// panggilan kedua ditolak biar gak dobel exit.
// SEAM: _processControlForTest() — exit & jeda bisa diganti buat e2e.

import { getDatabase } from "./rara-database.js";

let restarting = false;
let _exit = (code) => process.exit(code);
let _delayMs = 1500;

export async function gracefulRestart(opts = {}) {
  if (restarting) return { ok: false, reason: "sedang restart" };
  restarting = true;
  let dbOk = true;
  try {
    await getDatabase()?.save?.();
  } catch {
    dbOk = false;
  }
  const delayMs = Number(opts.delayMs) > 0 ? Number(opts.delayMs) : _delayMs;
  setTimeout(() => _exit(0), delayMs);
  return { ok: true, dbOk, delayMs };
}

export function isRestarting() {
  return restarting;
}

// seam e2e
export function _processControlForTest() {
  return {
    setExit: (fn) => (_exit = fn),
    restoreExit: () => (_exit = (code) => process.exit(code)),
    resetRestarting: () => (restarting = false),
  };
}
