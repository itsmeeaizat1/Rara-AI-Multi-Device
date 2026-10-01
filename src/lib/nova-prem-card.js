// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════
// KARTU TICKER PREMIUM (13 Sep 2026, variasi fitur polos batch 4)
// ".premium countdown statis doang" — sisa premium < 24 jam → ticker
// live edit-in-place sampai habis, terus kartu BERAKHIR + hint upgrade.
// ═══════════════════════════════════════════════════════════════════
import { novaWrap } from "./nova-menu-style.js";
import { formatRemaining } from "./nova-countdown.js";

/**
 * Kartu ticker premium. remainingMs <= 0 → kartu PREMIUM BERAKHIR.
 * @param {string} name      — nama user (fallback "Kamu")
 * @param {number} remainingMs — sisa ms (dari runLiveTicker)
 * @param {string} prefix     — prefix command buat hint upgrade
 */
export function buildPremTickerCard(name, remainingMs, prefix = ".") {
  const nm = name || "Kamu";
  const p = prefix.endsWith(" ") ? prefix : prefix;
  const done = Number(remainingMs) <= 0;
  if (done) {
    return novaWrap("Premium Berakhir", [
      "❌ *PREMIUM KAMU SUDAH BERAKHIR*",
      "",
      `⬜ ${nm} sekarang balik jadi *Free User*`,
      "📉 Limit harian turun ke 300x",
      "",
      `🔄 Perpanjang: *${p}buyprem <durasi>*`,
      `💰 Daftar harga: *${p}premium*`,
      "",
      "_jangan sampai fitur favoritmu kekunci ya_ ✨",
    ].join("\n"));
  }
  return novaWrap("Premium Hampir Habis", [
    "🕒 *PREMIUM HAMPIR HABIS*",
    "",
    `👑 ${nm}, sisa premiummu:`,
    `🕒 *${formatRemaining(remainingMs)}*`,
    "",
    `🔄 Perpanjang SEKARANG: *${p}buyprem <durasi>*`,
    "",
    "_biar akses fitur premium gak putus_ ✨",
  ].join("\n"));
}
