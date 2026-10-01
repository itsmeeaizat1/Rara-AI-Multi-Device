// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// PENGHITUNG RAMADHAN (13 Sep 2026, variasi fitur polos batch 4)
// ".ramadhan gak ada penghitung hari menuju Ramadhan" — menu panduan
// sekarang dikasih header penghitung: hari menuju 1 Ramadhan, atau
// "hari ke-N" kalau lagi Ramadhan. Tanggal = estimasi kalender Umm
// al-Qura (penetapan final via rukyatul hilal).
// ═══════════════════════════════════════════════════════════════════
import moment from "moment-timezone";
import { raraWrap } from "./rara-menu-style.js";
import { formatRemaining } from "./rara-countdown.js";

// 1 Ramadhan (mulai) — estimasi Umm al-Qura; end = hari sebelum 1 Syawal
const RAMADHAN_DATES = [
  { hijri: 1447, start: "2026-02-18", end: "2026-03-19" },
  { hijri: 1448, start: "2027-02-08", end: "2027-03-09" },
  { hijri: 1449, start: "2028-01-28", end: "2028-02-26" },
  { hijri: 1450, start: "2029-01-16", end: "2029-02-14" },
  { hijri: 1451, start: "2030-01-05", end: "2030-02-04" },
];

const wib = (ymd) => moment.tz(ymd + " 00:00", "YYYY-MM-DD HH:mm", "Asia/Jakarta").valueOf();

/**
 * Fase Ramadhan dari waktu sekarang.
 * @returns {{phase:'countdown'|'during', hijri, startTs, endTs, daysLeft, dayOf, totalDays, startDateStr}|null}
 *  - countdown: sebelum 1 Ramadhan berikutnya (daysLeft = hari menuju)
 *  - during: sedang Ramadhan (dayOf = hari ke-, totalDays = perkiraan total)
 */
export function computeRamadhanPhase(nowTs = Date.now()) {
  const now = Number(nowTs) || Date.now();
  for (const r of RAMADHAN_DATES) {
    const startTs = wib(r.start);
    const endTs = wib(r.end);
    if (now < startTs) {
      return {
        phase: "countdown", hijri: r.hijri, startTs, endTs,
        daysLeft: Math.max(1, Math.ceil((startTs - now) / 86400000)),
        dayOf: 0, totalDays: Math.round((endTs - startTs) / 86400000),
        startDateStr: r.start,
      };
    }
    if (now >= startTs && now < endTs) {
      return {
        phase: "during", hijri: r.hijri, startTs, endTs,
        daysLeft: 0,
        dayOf: Math.floor((now - startTs) / 86400000) + 1,
        totalDays: Math.round((endTs - startTs) / 86400000),
        startDateStr: r.start,
      };
    }
  }
  return null; // tabel estimasi kelewat waktu → diam, panduan tetap jalan
}

/** Baris pelengkap buat header menu .ramadhan (tanpa ticker). */
export function ramadhanHeaderLine(phase) {
  if (!phase) return "";
  if (phase.phase === "during") {
    return `🌙 *Ramadhan ${phase.hijri}H — Hari ke-${phase.dayOf} dari ${phase.totalDays}*`;
  }
  const tgl = moment.tz(phase.startTs, "Asia/Jakarta").format("DD MMMM YYYY");
  return `🌙 *Menuju Ramadhan ${phase.hijri}H: ${phase.daysLeft} hari lagi* (± ${tgl})`;
}

/**
 * Kartu countdown live (initialCard/tickCard runLiveTicker) — dipakai
 * kalau sisa < 24 jam. remainingMs <= 0 → kartu "DIMULAI".
 */
export function buildRamadhanCard(phase, remainingMs) {
  if (!phase) return raraWrap("Ramadhan", "Tanggal Ramadhan belum tersedia");
  const done = Number(remainingMs) <= 0;
  if (done) {
    return raraWrap(`Ramadhan ${phase.hijri}H`, [
      "🌙 *RAMADHAN DIMULAI!*",
      "",
      `✨ Marhaban ya Ramadhan ${phase.hijri}H`,
      "🤲 Semoga puasanya lancar & ibadahnya diterima",
    ].join("\n"));
  }
  return raraWrap(`Menuju Ramadhan ${phase.hijri}H`, [
    "🌙 *RAMADHAN SEBENTAR LAGI*",
    "",
    `🕒 *${formatRemaining(remainingMs)}* lagi`,
    `📅 Estimasi 1 Ramadhan: ${moment.tz(phase.startTs, "Asia/Jakarta").format("DD MMMM YYYY")}`,
    "",
    "_persiapkan hatimu, jangan lupa niat puasanya_ 🤲",
  ].join("\n"));
}
