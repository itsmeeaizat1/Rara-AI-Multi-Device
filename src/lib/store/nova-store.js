// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-store.js — PUSAT HARGA TOKO (premium roles + beli satuan)
// Owner: utak-atik SEMUA harga toko cukup di file ini.
// Tersambung ke: .buyprem, .buylimit, .buykoin, .approvetopup, .addprem
import config from "../../../config.js";

// ═══════════════════════════════════════════
// PAKET PREMIUM — 1 PAKET = 3 ROLE
// ═══════════════════════════════════════════
// Bonus sekali aktivasi (dipakai .addprem saat approve).
export const PREMIUM_BONUS = {
  exp: 200000, // bonus EXP sekali aktivasi premium
  koin: 20000, // bonus koin sekali aktivasi premium
};

export function premiumRoles() {
  return [
    {
      key: "status",
      label: "Status Premium",
      value: "Aktif selama masa premium — akses semua fitur Ⓟ + cooldown rendah",
    },
    {
      key: "limit",
      label: "Limit Harian",
      value: `${(config.energi?.premium || 100).toLocaleString("id-ID")} limit/hari (vs ${(config.energi?.default || 25).toLocaleString("id-ID")} user biasa)`,
    },
    {
      key: "koin",
      label: "Bonus Koin + EXP",
      value: `${PREMIUM_BONUS.koin.toLocaleString("id-ID")} koin + ${PREMIUM_BONUS.exp.toLocaleString("id-ID")} EXP sekali aktivasi`,
    },
  ];
}

// ═══════════════════════════════════════════
// BELI SATUAN (TOPUP) — harga per paket
// ═══════════════════════════════════════════
// limit : Rp 10.000 per 100 limit
// koin  : Rp 10.000 per 10.000 koin
export const TOPUP_ITEMS = {
  limit: {
    key: "limit",
    name: "Limit Fitur",
    unit: "limit",
    packSize: 100, // per 100 limit
    pricePerPack: 10000, // Rp 10.000
    min: 50, // minimal beli
    max: 5000, // maksimal sekali beli
  },
  koin: {
    key: "koin",
    name: "Koin",
    unit: "koin",
    packSize: 10000, // per 10.000 koin
    pricePerPack: 10000, // Rp 10.000
    min: 10000,
    max: 1000000,
  },
};

export const MIN_TOPUP_PRICE = 5000; // harga minimal transaksi
export const PRICE_ROUNDING = 1000; // pembulatan ribuan

/**
 * Hitung harga topup satuan.
 * @param {"limit"|"koin"} key
 * @param {number} qty jumlah yang mau dibeli
 * @returns {{ rupiah: string, rupiahNum: number, item: object } | null}
 */
export function calcTopupPrice(key, qty) {
  const item = TOPUP_ITEMS[key];
  if (!item || !Number.isFinite(qty) || qty <= 0) return null;
  let rupiahNum = (qty / item.packSize) * item.pricePerPack;
  rupiahNum = Math.max(
    MIN_TOPUP_PRICE,
    Math.ceil(rupiahNum / PRICE_ROUNDING) * PRICE_ROUNDING,
  );
  return {
    rupiah: `Rp ${rupiahNum.toLocaleString("id-ID")}`,
    rupiahNum,
    item,
  };
}

/**
 * Validasi jumlah topup.
 * @returns {{ ok: true, qty: number } | { ok: false, error: string }}
 */
export function validateTopupQty(key, qty) {
  const item = TOPUP_ITEMS[key];
  if (!item) return { ok: false, error: "Item tidak dikenal" };
  const n = Number(qty);
  if (!Number.isInteger(n) || n <= 0)
    return { ok: false, error: "Jumlah harus angka bulat lebih dari 0" };
  if (n < item.min)
    return { ok: false, error: `Minimal beli ${item.min.toLocaleString("id-ID")} ${item.unit}` };
  if (n > item.max)
    return { ok: false, error: `Maksimal ${item.max.toLocaleString("id-ID")} ${item.unit} sekali beli` };
  return { ok: true, qty: n };
}
