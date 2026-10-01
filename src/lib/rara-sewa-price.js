// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sewaPrice } from "./sewa/sewa.js";

/**
 * Helper untuk hitung harga sewa berdasarkan durasi
 * Format durasi: 7d, 1m, 1y, lifetime, dll
 */

function calculateSewaPrice(durationStr) {
  const prices = sewaPrice;
  const lower = durationStr.toLowerCase();

  // Lifetime
  if (["lifetime", "permanent", "forever", "unlimited"].includes(lower)) {
    return prices.lifetime;
  }

  const match = durationStr.match(/^(\d+)([iIdDmMyYhH])$/);
  if (!match) return prices.custom;

  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  // Menit / jam → custom (terlalu singkat untuk harga fixed)
  if (unit === "i" || unit === "h") {
    return prices.custom;
  }

  // Hari → daily rate * jumlah hari
  if (unit === "d") {
    if (val <= 7) return prices.weekly;
    if (val <= 30) return prices.monthly;
    return prices.yearly;
  }

  // Bulan → monthly rate * jumlah bulan
  if (unit === "m") {
    if (val >= 12) return prices.yearly;
    return prices.monthly;
  }

  // Tahun → yearly rate * jumlah tahun
  if (unit === "y") {
    return prices.yearly;
  }

  return prices.custom;
}

export { calculateSewaPrice };
