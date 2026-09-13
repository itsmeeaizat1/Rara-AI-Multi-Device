// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// PENGHITUNG LIBUR TERDEKAT (13 Sep 2026, variasi fitur polos batch 4)
// ".harilibur daftar doang gak ada penghitung libur terdekat" —
// kartu sekarang: header libur/hari-nasional terdekat + deteksi
// "hari ini libur" + ticker live < 24 jam menuju libur.
// ═══════════════════════════════════════════════════════════════════
import moment from "moment-timezone";
import { claraWrap } from "./nova-menu-style.js";
import { formatRemaining } from "./nova-countdown.js";

/** Epoch tengah malam WIB berikutnya (awal besok). */
export function computeNextMidnightWib(nowTs = Date.now()) {
  return moment.tz("Asia/Jakarta").add(1, "days").startOf("day").valueOf();
}

/**
 * Header penghitung buat kartu .harilibur.
 * @param {{events:Array}} hariIni  — event hari ini (kalo lagi libur/nasional)
 * @param {Object|null} terdekat    — {date:"MM-DD", event, daysUntil} item pertama
 * @returns string (kosong kalau gak ada apa-apa)
 */
export function buildLiburHeader(hariIni, terdekat) {
  const ev = (hariIni?.events || []).filter(Boolean);
  if (ev.length > 0) {
    return `🎉 *HARI INI: ${ev.join(", ")}*`;
  }
  if (terdekat && terdekat.event) {
    const n = Number(terdekat.daysUntil);
    const tgl = terdekat.date || "";
    if (n === 0) return `⏳ *LIBUR HARI INI: ${terdekat.event}* (${tgl})`;
    if (n === 1) return `⏳ *Libur TERDEKAT: ${terdekat.event}* — BESOK! (${tgl})`;
    return `⏳ *Libur terdekat: ${terdekat.event}* — ${n} hari lagi (${tgl})`;
  }
  return "";
}

/**
 * Kartu ticker live menuju libur (dipakai kalau daysUntil <= 1 →
 * target = tengah malam WIB besok). remainingMs <= 0 → kartu LIBUR TIBA.
 */
export function buildLiburCard(event, remainingMs) {
  const done = Number(remainingMs) <= 0;
  if (done) {
    return claraWrap("Libur Tiba", [
      `🎉 *LIBUR TIBA!*`,
      "",
      `✨ ${event}`,
      "",
      "Selamat menikmati liburnya — jangan lupa istirahat 😌",
    ].join("\n"));
  }
  return claraWrap("Menuju Libur", [
    `⏳ *${formatRemaining(remainingMs)}* lagi menuju libur`,
    "",
    `✨ ${event}`,
    "",
    "_siap-siap ya_ 😴",
  ].join("\n"));
}
