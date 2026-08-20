// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";

/**
 * Helper untuk hitung harga sewa berdasarkan durasi
 * Format durasi: 7d, 1m, 1y, lifetime, dll
 */

function calculateSewaPrice(durationStr) {
  const prices = config.sewaPrice || {};
  const lower = durationStr.toLowerCase();

  // Lifetime
  if (["lifetime", "permanent", "forever", "unlimited"].includes(lower)) {
    return prices.lifetime || "Rp 500.000";
  }

  const match = durationStr.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return prices.custom || "Nego";

  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  // Menit / jam → custom (terlalu singkat untuk harga fixed)
  if (unit === "i" || unit === "h") {
    return prices.custom || "Nego";
  }

  // Hari → daily rate * jumlah hari
  if (unit === "d") {
    if (val <= 7) return prices.weekly || "Rp 25.000";
    if (val <= 30) return prices.monthly || "Rp 50.000";
    return prices.yearly || "Rp 300.000";
  }

  // Bulan → monthly rate * jumlah bulan
  if (unit === "m") {
    if (val >= 12) return prices.yearly || "Rp 300.000";
    return prices.monthly || "Rp 50.000";
  }

  // Tahun → yearly rate * jumlah tahun
  if (unit === "y") {
    return prices.yearly || "Rp 300.000";
  }

  return prices.custom || "Nego";
}

export { calculateSewaPrice };
