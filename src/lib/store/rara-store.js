// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-store.js — PUSAT HARGA TOKO (premium roles + beli satuan)
// Owner: utak-atik SEMUA harga toko cukup di file ini.
// Tersambung ke: .buyprem, .buylimit, .buykoin, .approvetopup, .addprem
import config from "../../../config.js";
import { ITEM_DB } from "../rara-rpg-service.js";

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
// BELI SATUAN (TOPUP) — 4 JALUR
// ═══════════════════════════════════════════
// JALUR AKUN   : limit, koin          → user.energi / user.koin
// JALUR RPG    : diamond, harta(gold), gems, tokens → user.rpg.<currency>
// JALUR ITEM   : rpgitem (40 item di ITEM_DB)  → user.rpg.inventory
// JALUR CINTA  : affection           → user.rpg.cinta.affection
//
// Harga per paket (utak atik di sini):
// limit   : Rp 10.000 per 100 limit
// koin    : Rp 10.000 per 10.000 koin
// diamond : Rp 10.000 per 10 diamond
// harta   : Rp 10.000 per 1.000 gold (harta karun RPG)
// gems    : Rp 10.000 per 10 gems
// tokens  : Rp 10.000 per 100 tokens
// affection: Rp 10.000 per 100 affection
export const TOPUP_ITEMS = {
  // ── JALUR AKUN ──
  limit: {
    key: "limit",
    name: "Limit Fitur",
    unit: "limit",
    icon: "⚡",
    jalur: "akun",
    apply: "energi",
    command: "buylimit",
    packSize: 100,
    pricePerPack: 10000,
    min: 50,
    max: 5000,
  },
  koin: {
    key: "koin",
    name: "Koin",
    unit: "koin",
    icon: "🪙",
    jalur: "akun",
    apply: "koin",
    command: "buykoin",
    packSize: 10000,
    pricePerPack: 10000,
    min: 10000,
    max: 1000000,
  },
  // ── JALUR RPG (mata uang game) ──
  diamond: {
    key: "diamond",
    name: "Diamond RPG",
    unit: "diamond",
    icon: "💎",
    jalur: "rpg",
    apply: "rpgCurrency:diamonds",
    command: "buydiamond",
    packSize: 10,
    pricePerPack: 10000,
    min: 10,
    max: 500,
  },
  harta: {
    key: "harta",
    name: "Harta Karun (Gold RPG)",
    unit: "gold",
    icon: "💰",
    jalur: "rpg",
    apply: "rpgCurrency:gold",
    command: "buyharta",
    packSize: 1000,
    pricePerPack: 10000,
    min: 1000,
    max: 100000,
  },
  gems: {
    key: "gems",
    name: "Gems RPG",
    unit: "gems",
    icon: "🔮",
    jalur: "rpg",
    apply: "rpgCurrency:gems",
    command: "buygems",
    packSize: 10,
    pricePerPack: 10000,
    min: 10,
    max: 300,
  },
  tokens: {
    key: "tokens",
    name: "Tokens RPG",
    unit: "tokens",
    icon: "🎟️",
    jalur: "rpg",
    apply: "rpgCurrency:tokens",
    command: "buytokens",
    packSize: 100,
    pricePerPack: 10000,
    min: 100,
    max: 5000,
  },
  // ── JALUR CINTA (rpg cinta) ──
  affection: {
    key: "affection",
    name: "Affection (RPG Cinta)",
    unit: "affection",
    icon: "❤️",
    jalur: "cinta",
    apply: "affection",
    command: "buycinta",
    packSize: 100,
    pricePerPack: 10000,
    min: 100,
    max: 10000,
  },
};

// ── JALUR ITEM: item game dari ITEM_DB (rara-rpg-service.js) ──
// Harga per item = value × RPG_ITEM_RATE, pembulatan ribuan, min transaksi Rp 5.000.
// Contoh: Ramuan HP (value 50) → Rp 10.000/item; Pedang Kayu (value ~) dst.
export const RPG_ITEM_RATE = 200; // Rp per poin value
export const RPG_ITEM_MIN_QTY = 1;
export const RPG_ITEM_MAX_QTY = 100; // maksimal qty per item sekali beli

// Command buat petunjuk batal per jenis pesanan
export const TOPUP_COMMANDS = {
  rpgitem: "buyrpgitem",
};

export function topupCancelHint(type) {
  const it = TOPUP_ITEMS[type];
  return it ? it.command : TOPUP_COMMANDS[type] || type;
}

// ── Data pesanan topup (pending + history) ──
export function ensureTopups(db) {
  if (!db.db.data.topups) db.db.data.topups = { pending: {}, history: [] };
  if (!db.db.data.topups.pending) db.db.data.topups.pending = {};
  if (!Array.isArray(db.db.data.topups.history)) db.db.data.topups.history = [];
  return db.db.data.topups;
}

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
/**
 * Harga beli item game (JALUR ITEM) — dari ITEM_DB.
 * Per item = value × RPG_ITEM_RATE (pembulatan ribuan, min Rp 5.000).
 * @returns {{ rupiah: string, rupiahNum: number, item: object } | null}
 */
export function calcRpgItemPrice(itemId, qty) {
  const def = ITEM_DB[itemId];
  if (!def || !Number.isFinite(qty) || qty <= 0) return null;
  let rupiahNum = def.value * RPG_ITEM_RATE * qty;
  rupiahNum = Math.max(
    MIN_TOPUP_PRICE,
    Math.ceil(rupiahNum / PRICE_ROUNDING) * PRICE_ROUNDING,
  );
  return {
    rupiah: `Rp ${rupiahNum.toLocaleString("id-ID")}`,
    rupiahNum,
    item: { id: itemId, name: def.name, rarity: def.rarity, type: def.type, value: def.value },
  };
}

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
