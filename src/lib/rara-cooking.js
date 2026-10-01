// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-cooking.js — COOKING RPG ENGINE (porting script owner 10 Sep 2026:
// cooking.js + cookingData.js standalone). Game self-contained ala script:
// gold/energy/level/inventory/tools/resep sendiri, state per-user persist
// di src/data/cooking.json. Data bahan/resep/alat VERBATIM script owner.
//
// Mesin: cook → cek level/energy/bahan → animasi scene (via rpgScene di
// plugin) → jual hidangan otomatis (harga × bonus alat Kualitas/resep-
// spesifik) → EXP → level up (maxEnergy +10, energy +30, buka resep baru).
//
// FITUR PORT TAMBAHAN (akar masalah di script):
// - Gold awal Rp 25.000 (script mulai 0 → player baru KEJEBAK, telur dadar
//   saja butuh Rp 19.000 bahan).
// - Resep level 1 langsung ke-unlock saat akun dibuat (script cuma push
//   resep pas LEVEL UP — player baru gak pernah punya resep).
// - .cooking beli [bahan] [jumlah] — qty opsional (script cuma beli 1).
// - Bonus alat dihitung dari % di data (script flat +10% semua alat
//   Kualitas — Oven +20% & Pisau +15% di data gak pernah kebaca) + bonus
//   resep-spesifik (Sushi +30%, Steak +25%).
// - Istirahat cooldown 3 menit (script gak ada cooldown → spam +50 energi
//   infinite).
import fs from "node:fs";
import path from "node:path";
import { formatRp } from "./rara-rpg-service.js";

// ============================================
// ===== DATABASE BAHAN (VERBATIM SCRIPT OWNER) =====
// ============================================
export const INGREDIENTS = {
  // ===== BAHAN DASAR =====
  Beras: { id: "beras", name: "Beras", emoji: "🌾", price: 5000, rarity: "Umum", category: "Karbo" },
  Telur: { id: "telur", name: "Telur", emoji: "🥚", price: 3000, rarity: "Umum", category: "Protein" },
  Ayam: { id: "ayam", name: "Ayam", emoji: "🍗", price: 15000, rarity: "Umum", category: "Protein" },
  "Daging Sapi": { id: "daging_sapi", name: "Daging Sapi", emoji: "🥩", price: 25000, rarity: "Langka", category: "Protein" },
  Ikan: { id: "ikan", name: "Ikan", emoji: "🐟", price: 12000, rarity: "Umum", category: "Protein" },
  Udang: { id: "udang", name: "Udang", emoji: "🦐", price: 20000, rarity: "Langka", category: "Protein" },
  Cumi: { id: "cumi", name: "Cumi", emoji: "🦑", price: 18000, rarity: "Langka", category: "Protein" },

  // ===== SAYURAN =====
  Bayam: { id: "bayam", name: "Bayam", emoji: "🥬", price: 4000, rarity: "Umum", category: "Sayur" },
  Kangkung: { id: "kangkung", name: "Kangkung", emoji: "🥬", price: 3000, rarity: "Umum", category: "Sayur" },
  Wortel: { id: "wortel", name: "Wortel", emoji: "🥕", price: 5000, rarity: "Umum", category: "Sayur" },
  Kentang: { id: "kentang", name: "Kentang", emoji: "🥔", price: 6000, rarity: "Umum", category: "Sayur" },
  Tomat: { id: "tomat", name: "Tomat", emoji: "🍅", price: 4000, rarity: "Umum", category: "Sayur" },
  "Bawang Merah": { id: "bawang_merah", name: "Bawang Merah", emoji: "🧅", price: 8000, rarity: "Umum", category: "Bumbu" },
  "Bawang Putih": { id: "bawang_putih", name: "Bawang Putih", emoji: "🧄", price: 7000, rarity: "Umum", category: "Bumbu" },
  Cabai: { id: "cabai", name: "Cabai", emoji: "🌶️", price: 5000, rarity: "Umum", category: "Bumbu" },

  // ===== BAHAN KHUSUS =====
  Mie: { id: "mie", name: "Mie", emoji: "🍜", price: 8000, rarity: "Umum", category: "Karbo" },
  Tepung: { id: "tepung", name: "Tepung", emoji: "🌾", price: 6000, rarity: "Umum", category: "Karbo" },
  Keju: { id: "keju", name: "Keju", emoji: "🧀", price: 20000, rarity: "Langka", category: "Dairy" },
  Susu: { id: "susu", name: "Susu", emoji: "🥛", price: 10000, rarity: "Umum", category: "Dairy" },
  Coklat: { id: "coklat", name: "Coklat", emoji: "🍫", price: 15000, rarity: "Langka", category: "Dairy" },
  Gula: { id: "gula", name: "Gula", emoji: "🍬", price: 5000, rarity: "Umum", category: "Bumbu" },
  Garam: { id: "garam", name: "Garam", emoji: "🧂", price: 3000, rarity: "Umum", category: "Bumbu" },
  Minyak: { id: "minyak", name: "Minyak", emoji: "🫒", price: 10000, rarity: "Umum", category: "Bumbu" },

  // ===== BAHAN LANGKA =====
  "Daging Kambing": { id: "daging_kambing", name: "Daging Kambing", emoji: "🐐", price: 35000, rarity: "Langka", category: "Protein" },
  Lobster: { id: "lobster", name: "Lobster", emoji: "🦞", price: 50000, rarity: "Langka", category: "Protein" },
  Kepiting: { id: "kepiting", name: "Kepiting", emoji: "🦀", price: 40000, rarity: "Langka", category: "Protein" },
  Truffle: { id: "truffle", name: "Truffle", emoji: "🍄", price: 100000, rarity: "Epic", category: "Spesial" },
  Kaviar: { id: "kaviar", name: "Kaviar", emoji: "🫧", price: 150000, rarity: "Epic", category: "Spesial" },
  Wagyu: { id: "wagyu", name: "Wagyu", emoji: "🥩", price: 200000, rarity: "Legend", category: "Protein" },
};

// ============================================
// ===== DATABASE RESEP (VERBATIM SCRIPT OWNER) =====
// ============================================
export const RECIPES = {
  // ===== RESEP DASAR (Level 1) =====
  "Nasi Goreng": {
    id: "nasi_goreng", name: "Nasi Goreng", emoji: "🍚", level: 1, exp: 15, price: 25000, time: 5000,
    ingredients: { Beras: 1, Telur: 1, "Bawang Merah": 1, Cabai: 1, Minyak: 1 },
    description: "Nasi goreng klasik Indonesia",
  },
  "Mie Goreng": {
    id: "mie_goreng", name: "Mie Goreng", emoji: "🍜", level: 1, exp: 12, price: 20000, time: 4000,
    ingredients: { Mie: 1, Telur: 1, "Bawang Putih": 1, Cabai: 1, Minyak: 1 },
    description: "Mie goreng lezat",
  },
  "Telur Dadar": {
    id: "telur_dadar", name: "Telur Dadar", emoji: "🍳", level: 1, exp: 8, price: 10000, time: 3000,
    ingredients: { Telur: 2, Garam: 1, Minyak: 1 },
    description: "Telur dadar sederhana",
  },
  "Sayur Kangkung": {
    id: "sayur_kangkung", name: "Sayur Kangkung", emoji: "🥬", level: 1, exp: 10, price: 15000, time: 3500,
    ingredients: { Kangkung: 1, "Bawang Putih": 1, Garam: 1, Minyak: 1 },
    description: "Tumis kangkung segar",
  },

  // ===== RESEP MENENGAH (Level 3) =====
  "Sate Ayam": {
    id: "sate_ayam", name: "Sate Ayam", emoji: "🍢", level: 3, exp: 25, price: 35000, time: 7000,
    ingredients: { Ayam: 1, "Bawang Merah": 1, "Bawang Putih": 1, Cabai: 1, Gula: 1 },
    description: "Sate ayam dengan bumbu kacang",
  },
  "Bakso Sapi": {
    id: "bakso_sapi", name: "Bakso Sapi", emoji: "🍲", level: 3, exp: 28, price: 30000, time: 6500,
    ingredients: { "Daging Sapi": 1, Tepung: 1, "Bawang Putih": 1, Garam: 1 },
    description: "Bakso sapi kenyal",
  },
  "Soto Ayam": {
    id: "soto_ayam", name: "Soto Ayam", emoji: "🍜", level: 3, exp: 30, price: 32000, time: 7000,
    ingredients: { Ayam: 1, "Bawang Merah": 1, "Bawang Putih": 1, Wortel: 1, Kentang: 1 },
    description: "Soto ayam kuah kuning",
  },
  "Ikan Bakar": {
    id: "ikan_bakar", name: "Ikan Bakar", emoji: "🐟", level: 3, exp: 26, price: 28000, time: 6000,
    ingredients: { Ikan: 1, Cabai: 1, "Bawang Merah": 1, Gula: 1, Minyak: 1 },
    description: "Ikan bakar bumbu pedas",
  },

  // ===== RESEP LANJUT (Level 5) =====
  Rendang: {
    id: "rendang", name: "Rendang", emoji: "🥘", level: 5, exp: 50, price: 75000, time: 12000,
    ingredients: { "Daging Sapi": 1, "Bawang Merah": 2, "Bawang Putih": 2, Cabai: 2, Gula: 1 },
    description: "Rendang Daging Sapi",
  },
  "Nasi Padang": {
    id: "nasi_padang", name: "Nasi Padang", emoji: "🍛", level: 5, exp: 55, price: 80000, time: 13000,
    ingredients: { Beras: 1, "Daging Sapi": 1, Cabai: 2, "Bawang Merah": 1, Gula: 1 },
    description: "Nasi Padang komplit",
  },
  "Udang Saus Tiram": {
    id: "udang_saus_tiram", name: "Udang Saus Tiram", emoji: "🦐", level: 5, exp: 45, price: 65000, time: 10000,
    ingredients: { Udang: 1, "Bawang Putih": 1, Minyak: 1, Gula: 1, Garam: 1 },
    description: "Udang saus tiram spesial",
  },
  "Cumi Goreng Tepung": {
    id: "cumi_goreng", name: "Cumi Goreng Tepung", emoji: "🦑", level: 5, exp: 42, price: 60000, time: 9000,
    ingredients: { Cumi: 1, Tepung: 1, Telur: 1, Minyak: 1, Garam: 1 },
    description: "Cumi goreng crispy",
  },

  // ===== RESEP SPESIAL (Level 8) =====
  Sushi: {
    id: "sushi", name: "Sushi", emoji: "🍣", level: 8, exp: 80, price: 120000, time: 15000,
    ingredients: { Beras: 1, Ikan: 1, Udang: 1, Tepung: 1, Garam: 1 },
    description: "Sushi Jepang premium",
  },
  Ramen: {
    id: "ramen", name: "Ramen", emoji: "🍜", level: 8, exp: 75, price: 100000, time: 14000,
    ingredients: { Mie: 1, Ayam: 1, Telur: 1, "Bawang Putih": 1, Garam: 1 },
    description: "Ramen Jepang kuah kental",
  },
  "Steak Wagyu": {
    id: "steak_wagyu", name: "Steak Wagyu", emoji: "🥩", level: 8, exp: 90, price: 150000, time: 16000,
    ingredients: { Wagyu: 1, Kentang: 1, Wortel: 1, Minyak: 1, Garam: 1 },
    description: "Steak Wagyu premium",
  },
  "Lobster Thermidor": {
    id: "lobster_thermidor", name: "Lobster Thermidor", emoji: "🦞", level: 8, exp: 85, price: 130000, time: 15000,
    ingredients: { Lobster: 1, Keju: 1, Susu: 1, Tepung: 1, Garam: 1 },
    description: "Lobster premium saus keju",
  },

  // ===== RESEP LEGENDARIS (Level 12) =====
  "Truffle Pasta": {
    id: "truffle_pasta", name: "Truffle Pasta", emoji: "🍝", level: 12, exp: 150, price: 250000, time: 20000,
    ingredients: { Truffle: 1, Mie: 1, Keju: 1, Susu: 1, Minyak: 1 },
    description: "Pasta truffle mewah",
  },
  "Kaviar Sushi": {
    id: "kaviar_sushi", name: "Kaviar Sushi", emoji: "🍣", level: 12, exp: 160, price: 300000, time: 22000,
    ingredients: { Kaviar: 1, Beras: 1, Ikan: 1, Udang: 1, Tepung: 1 },
    description: "Sushi kaviar premium",
  },
  "Wagyu Rendang": {
    id: "wagyu_rendang", name: "Wagyu Rendang", emoji: "🥘", level: 12, exp: 180, price: 350000, time: 25000,
    ingredients: { Wagyu: 1, "Bawang Merah": 2, "Bawang Putih": 2, Cabai: 2, Gula: 1 },
    description: "Rendang Wagyu super premium",
  },
};

// ============================================
// ===== DATA ALAT MASAK (VERBATIM SCRIPT OWNER) =====
// ============================================
export const TOOLS = {
  Wajan: { id: "wajan", name: "Wajan", emoji: "🍳", price: 50000, bonus: "Kecepatan +10%" },
  Panci: { id: "panci", name: "Panci", emoji: "🍲", price: 60000, bonus: "Kecepatan +15%" },
  Oven: { id: "oven", name: "Oven", emoji: "🔥", price: 150000, bonus: "Kualitas +20%" },
  Blender: { id: "blender", name: "Blender", emoji: "🥤", price: 80000, bonus: "Bahan +10%" },
  "Kompor Premium": { id: "kompor_premium", name: "Kompor Premium", emoji: "🔥", price: 200000, bonus: "Kecepatan +25%" },
  "Pisau Set": { id: "pisau_set", name: "Pisau Set", emoji: "🔪", price: 100000, bonus: "Kualitas +15%" },
  "Cetakan Sushi": { id: "cetakan_sushi", name: "Cetakan Sushi", emoji: "🍣", price: 120000, bonus: "Sushi +30%" },
  "Grill Pan": { id: "grill_pan", name: "Grill Pan", emoji: "🥩", price: 180000, bonus: "Steak +25%" },
};

// ============================================
// ===== FUNGSI HELPER DATA =====
// ============================================
export function getRecipeByName(name) {
  const q = String(name || "").trim().toLowerCase();
  const key = Object.keys(RECIPES).find((k) => k.toLowerCase() === q);
  return key ? RECIPES[key] : null;
}
/** Loose match: "nasigoreng" / "Nasi-Goreng" → Nasi Goreng (kemudahan user HP). */
export function getRecipeLoose(name) {
  const exact = getRecipeByName(name);
  if (exact) return exact;
  const q = String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const key = Object.keys(RECIPES).find((k) => k.toLowerCase().replace(/[\s_-]+/g, "") === q);
  return key ? RECIPES[key] : null;
}
export function getRecipesByLevel(level) {
  return Object.values(RECIPES).filter((r) => r.level <= level);
}
export function getIngredientByName(name) {
  const q = String(name || "").trim().toLowerCase();
  const key = Object.keys(INGREDIENTS).find((k) => k.toLowerCase() === q);
  return key ? INGREDIENTS[key] : null;
}
export function getIngredientLoose(name) {
  const exact = getIngredientByName(name);
  if (exact) return exact;
  const q = String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const key = Object.keys(INGREDIENTS).find((k) => k.toLowerCase().replace(/[\s_-]+/g, "") === q);
  return key ? INGREDIENTS[key] : null;
}
export function getToolByName(name) {
  const q = String(name || "").trim().toLowerCase();
  const key = Object.keys(TOOLS).find((k) => k.toLowerCase() === q);
  return key ? TOOLS[key] : null;
}
export function getToolLoose(name) {
  const exact = getToolByName(name);
  if (exact) return exact;
  const q = String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const key = Object.keys(TOOLS).find((k) => k.toLowerCase().replace(/[\s_-]+/g, "") === q);
  return key ? TOOLS[key] : null;
}

// ============================================
// ===== STATE (persist src/data/cooking.json) =====
// ============================================
const START_GOLD = 25000;       // fix: script mulai 0 → player kejebak
const ENERGY_PER_COOK = 20;
const REST_AMOUNT = 50;
const REST_COOLDOWN_MS = 3 * 60 * 1000;   // fix: script gak ada cooldown istirahat

let STATE_FILE = path.join(process.cwd(), "src", "database", "game", "cooking.json");
let state = null;

/** Seam e2e: arahkan state ke path khusus test. */
export function setCookingStatePath(p) {
  STATE_FILE = p;
  state = null;
}

function loadState() {
  if (state) return state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    if (!state || typeof state !== "object" || !state.players) state = { players: {} };
  } catch {
    state = { players: {} };
  }
  return state;
}

export function saveCooking() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state || { players: {} }, null, 2));
  } catch {}
}

export function getLevelExp(level) {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export function getCookingPlayer(userId, name = "Chef") {
  const st = loadState();
  if (!st.players[userId]) {
    st.players[userId] = {
      name,
      level: 1,
      exp: 0,
      maxExp: getLevelExp(1),
      energy: 100,
      maxEnergy: 100,
      gold: START_GOLD,
      inventory: {},     // { ingredientName: quantity }
      tools: [],         // [toolName]
      recipes: Object.values(RECIPES).filter((r) => r.level <= 1).map((r) => r.id), // fix: unlock resep lv1 di awal
      totalCook: 0,
      bestDish: null,    // { name, price }
      lastRest: 0,
      joinedAt: new Date().toISOString(),
    };
    saveCooking();
  }
  return st.players[userId];
}

// ─── INVENTORY ───
export function addIngredient(player, ingredientName, qty = 1) {
  player.inventory[ingredientName] = (player.inventory[ingredientName] || 0) + qty;
  saveCooking();
}
export function removeIngredient(player, ingredientName, qty = 1) {
  if ((player.inventory[ingredientName] || 0) >= qty) {
    player.inventory[ingredientName] -= qty;
    if (player.inventory[ingredientName] <= 0) delete player.inventory[ingredientName];
    saveCooking();
    return true;
  }
  return false;
}
export function hasIngredients(player, recipe) {
  return Object.entries(recipe.ingredients).every(([ing, qty]) => (player.inventory[ing] || 0) >= qty);
}
export function missingIngredients(player, recipe) {
  return Object.entries(recipe.ingredients)
    .filter(([ing, qty]) => (player.inventory[ing] || 0) < qty)
    .map(([ing, qty]) => ({ ing, qty, have: player.inventory[ing] || 0 }));
}

// ============================================
// ===== BONUS ALAT (parse % dari data, bukan flat) =====
// ============================================
export function toolBonusMult(player, recipe) {
  let mult = 1;
  for (const toolName of player.tools || []) {
    const tool = TOOLS[toolName];
    if (!tool) continue;
    const m = tool.bonus.match(/([^\s+]+)\s*\+(\d+)%/);
    if (!m) continue;
    const [, kind, pct] = m;
    const value = Number(pct) / 100;
    if (kind === "Kualitas") mult += value;                       // semua hidangan
    else if (recipe && (recipe.name.includes(kind) || recipe.id.includes(kind.toLowerCase().replace(/\s+/g, "_"))))
      mult += value;                                              // Sushi/Steak spesifik
  }
  return mult;
}

// ============================================
// ===== TOKO =====
// ============================================
const BUY_QTY_CAP = 20;

export function buyIngredient(userId, ingredientName, qty = 1) {
  const player = getCookingPlayer(userId);
  const ing = getIngredientLoose(ingredientName);
  if (!ing) return { ok: false, code: "unknown", error: `Bahan "${ingredientName}" tidak ditemukan! Ketik .cooking toko` };
  const n = Math.max(1, Math.min(BUY_QTY_CAP, Math.floor(Number(qty) || 1)));
  const total = ing.price * n;
  if (player.gold < total) {
    return { ok: false, code: "gold", error: `Gold tidak cukup! Butuh ${formatRp(total)} (x${n})\nGold kamu: ${formatRp(player.gold)}` };
  }
  player.gold -= total;
  addIngredient(player, ing.name, n);
  return { ok: true, ing, qty: n, total, gold: player.gold };
}

export function buyTool(userId, toolName) {
  const player = getCookingPlayer(userId);
  const tool = getToolLoose(toolName);
  if (!tool) return { ok: false, code: "unknown", error: `Alat "${toolName}" tidak ditemukan! Ketik .cooking alat` };
  if (player.tools.includes(tool.name)) return { ok: false, code: "owned", error: `Kamu sudah punya ${tool.emoji} ${tool.name}!` };
  if (player.gold < tool.price) {
    return { ok: false, code: "gold", error: `Gold tidak cukup! Butuh ${formatRp(tool.price)}\nGold kamu: ${formatRp(player.gold)}` };
  }
  player.gold -= tool.price;
  player.tools.push(tool.name);
  saveCooking();
  return { ok: true, tool, gold: player.gold };
}

// ============================================
// ===== ISTIRAHAT (+50 energy, cooldown 3 mnt) =====
// ============================================
export function restCook(userId) {
  const player = getCookingPlayer(userId);
  const now = Date.now();
  const missing = player.maxEnergy - player.energy;
  if (missing <= 0) return { ok: false, code: "full", error: `Energy penuh! ${player.energy}/${player.maxEnergy}` };
  const sinceRest = now - (player.lastRest || 0);
  if (sinceRest < REST_COOLDOWN_MS) {
    const sisa = Math.ceil((REST_COOLDOWN_MS - sinceRest) / 60000);
    return { ok: false, code: "cooldown", error: `Masih lelah! Istirahat lagi ${sisa} menit lagi\n⚡ Energy: ${player.energy}/${player.maxEnergy}` };
  }
  const gained = Math.min(REST_AMOUNT, missing);
  player.energy += gained;
  player.lastRest = now;
  saveCooking();
  return { ok: true, gained, energy: player.energy, maxEnergy: player.maxEnergy };
}

// ============================================
// ===== MASAK — inti engine =====
// ============================================
/**
 * cookPhases — ANIMASI EDIT BERULANG ala script owner v2 (upgrade "biar g
 * bosen"): masak = 7 FASE, tiap fase SATU pesan yang di-edit morphing
 * (rpgScene). Pola khas cooking — gak boleh sama dgn game lain:
 * potong 🔪 bolak-balik → kompor 🔥 membesar → aduk 🥄 → progress 🟩 →
 * uap 💨 naik → plating 🍽️.
 */
export function cookPhases(player, recipe) {
  const R = recipe.emoji;
  const phases = [];

  // ── FASE 1: PEMBUKA ──
  phases.push({
    title: "cooking",
    frames: [
      `🍳 MEMULAI MASAKAN 🍳\n\n👨‍🍳 ${player.name}\n📖 ${R} ${recipe.name}`,
    ],
  });

  // ── FASE 2: PERSIAPAN BAHAN — tiap bahan dipotong (morphing) ──
  const prep = ["🔪 PERSIAPAN BAHAN 🔪"];
  for (const [ing, qty] of Object.entries(recipe.ingredients)) {
    const e = INGREDIENTS[ing]?.emoji || "📦";
    prep.push(`📦 ${ing} x${qty}\n\n🔪      ${e}`);
    prep.push(`📦 ${ing} x${qty}\n\n  🔪 🔪  ${e} 🔪`);
    prep.push(`✅ ${ing} x${qty} selesai dipotong! ${e}`);
  }
  phases.push({ title: "persiapan", frames: prep });

  // ── FASE 3: KOMPOR MENYALA (🔥 membesar verbatim script) ──
  phases.push({
    title: "kompor",
    frames: [
      "🔥",
      "🔥🔥",
      "🔥🔥🔥",
      `🍳 🔥🔥🔥`,
      `🍳🔥🔥🔥`,
      `🍳🔥🔥🔥 💨`,
      `🍳🔥🔥🔥 💨💨`,
      `🍳🔥🔥🔥 💨💨✨`,
    ],
  });

  // ── FASE 4: MENGADUK (🥄 bolak-balik verbatim script) ──
  phases.push({
    title: "mengaduk",
    frames: [
      `🥄 ${R}`,
      `🥄 ${R} 🥄`,
      `🥄🥄 ${R}`,
      `🥄🥄🥄 ${R}`,
      `🥄🥄 ${R} 🥄`,
      `🥄 ${R} 🥄🥄`,
      `✨ ${R} ✨`,
    ],
  });

  // ── FASE 5: PROGRESS BAR (🟩 isi 0→100% verbatim script) ──
  const bars = ["⬛⬛⬛⬛⬛", "🟩⬛⬛⬛⬛", "🟩🟩⬛⬛⬛", "🟩🟩🟩⬛⬛", "🟩🟩🟩🟩⬛", "🟩🟩🟩🟩🟩"];
  phases.push({
    title: "memasak",
    frames: bars.map((b, i) => `🕒 Memasak... ${Math.round((i / (bars.length - 1)) * 100)}%\n${b}`),
  });

  // ── FASE 6: UAP NAIK (💨 turun-baris verbatim script) ──
  phases.push({
    title: "uap",
    frames: [
      `${R}`,
      `${R}\n 💨`,
      `${R}\n 💨\n  💨`,
      `${R}\n 💨\n  💨\n   ✨`,
      `✨ ${R} ✨`,
    ],
  });

  // ── FASE 7: PLATING (🍽️ verbatim script) ──
  phases.push({
    title: "plating",
    frames: [
      `🍽️`,
      `🍽️ ${R}`,
      `🍽️ ${R} ✨`,
      `🍽️ ${R} ✨🎨`,
      `✨🍽️ ${R} 🎨✨`,
      `✅ ${R} SIAP DISAJIKAN!`,
    ],
  });

  return phases;
}

/** Animasi beli bahan (morphing 3 frame verbatim script). */
export function beliScenes(ing) {
  return [
    `🛒 Membeli ${ing.emoji}...`,
    `💰💨`,
    `✅ ${ing.emoji} ${ing.name}`,
  ];
}

/** Animasi istirahat (morphing 6 frame verbatim script). */
export function restScenes(player, gained) {
  return [
    `😴 ${player.name} istirahat...`,
    `😴 💤`,
    `😴 💤 💤`,
    `😴 💤 💤 💤`,
    `😊 ✨`,
    `⚡ Energy pulih +${gained}!`,
  ];
}

/**
 * cookDish — cek semua syarat → konsumsi bahan & energy → jual otomatis
 * (harga × bonus alat) → EXP → level-up berantai (maxEnergy +10, energy
 * +30, buka resep level baru). Return struktur utk diformat plugin.
 */
export function cookDish(userId, recipeName, playerName = "Chef") {
  const player = getCookingPlayer(userId, playerName);
  const recipe = getRecipeLoose(recipeName);
  if (!recipe) return { ok: false, code: "unknown", error: `Resep "${recipeName}" tidak ditemukan! Ketik .cooking resep` };
  if (player.level < recipe.level)
    return { ok: false, code: "level", error: `Butuh Level ${recipe.level} untuk masak ${recipe.emoji} ${recipe.name}!\nLevel kamu: ${player.level}`, needLevel: recipe.level };
  if (player.energy < ENERGY_PER_COOK)
    return { ok: false, code: "energy", error: `Energy kurang! Butuh ${ENERGY_PER_COOK} energy.\n⚡ Energy: ${player.energy}/${player.maxEnergy}\n💡 Ketik .cooking istirahat` };
  if (!hasIngredients(player, recipe)) {
    const missing = missingIngredients(player, recipe);
    return { ok: false, code: "ingredients", error: "Bahan tidak cukup!", missing };
  }

  // konsumsi bahan
  for (const [ing, qty] of Object.entries(recipe.ingredients)) removeIngredient(player, ing, qty);

  // bonus alat (parse % dari data — Kualitas semua hidangan + resep-spesifik)
  const bonusMult = toolBonusMult(player, recipe);
  const sellPrice = Math.floor(recipe.price * bonusMult);
  const expGain = recipe.exp + Math.floor(Math.random() * 5);

  player.gold += sellPrice;
  player.exp += expGain;
  player.energy -= ENERGY_PER_COOK;
  player.totalCook += 1;
  const isBest = !player.bestDish || sellPrice > player.bestDish.price;
  if (isBest) player.bestDish = { name: recipe.name, price: sellPrice };

  // level-up berantai + buka resep baru
  const levelUps = [];
  while (player.exp >= player.maxExp) {
    const from = player.level;
    player.exp -= player.maxExp;
    player.level += 1;
    player.maxExp = getLevelExp(player.level);
    player.maxEnergy += 10;
    player.energy = Math.min(player.energy + 30, player.maxEnergy);
    const newRecipes = Object.values(RECIPES).filter((r) => r.level === player.level && !player.recipes.includes(r.id));
    newRecipes.forEach((r) => player.recipes.push(r.id));
    levelUps.push({ from, to: player.level, newRecipes });
  }
  saveCooking();

  return {
    ok: true,
    recipe,
    phases: cookPhases(player, recipe),
    result: {
      playerName: player.name,
      sellPrice,
      basePrice: recipe.price,
      expGain,
      bonusPct: Math.round((bonusMult - 1) * 100),
      energy: player.energy,
      maxEnergy: player.maxEnergy,
      gold: player.gold,
      totalCook: player.totalCook,
      isBest,
      levelUps,
    },
  };
}
