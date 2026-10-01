// ═══════════════════════════════════════════════════════════════
// RARA GAME REWARDS — profil reward PER GAME + JACKPOT BONUS
// (request owner 8 Sep 2026: "semua item lengkap — uang, exp, koin,
// limit, diamond, token, dll — TAPI gak semua game naikin semua item,
// masing-masing game punya item tersendiri + bonus jackpot tiap game")
// ═══════════════════════════════════════════════════════════════
// Cara kerja:
// - Tiap game punya PROFIL sendiri: item mana aja yang bisa di-drop +
//   peluang + range-nya. Item di luar profil GAK pernah keluar.
// - Tiap kemenangan ada peluang JACKPOT (default 5%, per-profil bisa
//   beda): semua item yang ke-roll dikali 3 + bonus langka token & diamonds.
// - gameType di-map otomatis ke profil (pattern nama), bisa explicit.

import { addGameCash } from './rara-rpg-service.js';

const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const JACKPOT_CHANCE = 0.05; // 5% default tiap menang
export const JACKPOT_MULT = 3;       // jackpot = semua reward ×3

// ── PROFIL ITEM PER GAME ──
// format item: [peluang, min, max] — peluang 1 = selalu keluar.
// "uang" = base buat formula addGameCash (×(40+level×10)).
export const GAME_REWARD_PROFILES = {
  // game tebak* pengetahuan umum (default factory)
  default:    { exp: [1, 1000, 3000], koin: [1, 500, 2000], uang: [1, 30, 80], limit: [0.35, 3, 8] },
  // teka-teki sulit (asahotak, caklontong, tekateki, logika)
  tekaSulit:  { exp: [1, 1500, 3500], uang: [1, 40, 100], koin: [0.3, 800, 2500] },
  // game musik (tebaklagu, tebaklirik, tebakmusik) — koin utama
  musik:      { koin: [1, 1500, 4000], uang: [1, 40, 100], limit: [0.5, 4, 10], exp: [0.4, 500, 1500] },
  // game visual (tebakgambar, tebakbendera, tebaklogo) — exp + gems langka
  visual:     { exp: [1, 1000, 2500], uang: [1, 35, 90], gems: [0.25, 1, 3], koin: [0.5, 500, 1500] },
  // kuis/trivia/siapakahaku — lengkap
  kuis:       { exp: [1, 1200, 3000], koin: [1, 600, 2000], uang: [1, 30, 80], limit: [0.4, 3, 8] },
  // game refleks cepat (suit, bomb, koboy, tebakangka) — uang + limit
  refleks:    { uang: [1, 40, 100], limit: [1, 3, 8], exp: [0.3, 300, 800] },
  // papan multiplayer (uno, gaple, ulartangga) — uang + koin
  papan:      { uang: [1, 30, 90], koin: [1, 400, 1500], exp: [0.4, 300, 1000] },
  // game hoki (dadu, slot) — uang gede + jackpot chance besar
  luck:       { uang: [1, 60, 150], koin: [0.5, 300, 1200], jackpotChance: 0.12 },

  // ── profil EXPLICIT per game standalone ──
  family100:  { exp: [1, 1000, 3000], koin: [1, 500, 2000], uang: [1, 50, 120], limit: [1, 3, 8], jackpotChance: 0.10 },
  suit:       { uang: [1, 25, 60], limit: [0.4, 2, 5] },
  tebakangka: { uang: [1, 30, 80], exp: [0.5, 200, 600] },
  hangman:    { uang: [1, 25, 70], exp: [0.4, 300, 800] },
  typingrace: { uang: [1, 30, 90], limit: [0.4, 3, 6] },
  bomb:       { uang: [1, 40, 100], limit: [1, 3, 8] },
  koboy:      { uang: [1, 35, 90], limit: [1, 2, 6] },
  ulartangga: { uang: [1, 30, 90], koin: [1, 400, 1500] },
  uno:        { uang: [1, 30, 90], koin: [1, 300, 1000] },
  gaple:      { uang: [1, 30, 90], koin: [1, 300, 1000] },
  tebaksurah: { uang: [1, 30, 80], exp: [0.5, 500, 1500] },
};

// ── mapping gameType → profil (pattern nama + explicit) ──
export function profileFor(gameType) {
  const g = String(gameType || '').toLowerCase();
  if (GAME_REWARD_PROFILES[g]) return GAME_REWARD_PROFILES[g];
  if (/lagu|lirik|musik/.test(g)) return GAME_REWARD_PROFILES.musik;
  if (/gambar|bendera|logo/.test(g)) return GAME_REWARD_PROFILES.visual;
  if (/kuis|trivia|siapa|quiz/.test(g)) return GAME_REWARD_PROFILES.kuis;
  if (/asahotak|caklontong|tekateki|logika|riddle|susunkata|kataacak/.test(g)) return GAME_REWARD_PROFILES.tekaSulit;
  return GAME_REWARD_PROFILES.default;
}

// ── roll reward lengkap (buat factory & family100) ──
// return { items: {exp,koin,uang,limit,gold,gems,diamonds,tokens}, jackpot }
export function rollGameReward(gameType, { forceJackpot = false } = {}) {
  const prof = profileFor(gameType);
  const jackpot = forceJackpot || Math.random() < (prof.jackpotChance ?? JACKPOT_CHANCE);
  const items = {};
  for (const [name, spec] of Object.entries(prof)) {
    if (name === 'jackpotChance') continue;
    const [chance, min, max] = spec;
    if (Math.random() > chance) continue; // item di luar roll → skip
    items[name] = randBetween(min, max) * (jackpot ? JACKPOT_MULT : 1);
  }
  // jackpot selalu bawa bonus langka biar spesial
  if (jackpot) {
    items.tokens = (items.tokens || 0) + randBetween(5, 15);
    items.diamonds = (items.diamonds || 0) + randBetween(1, 3);
  }
  return { items, jackpot };
}

// ── roll bonus uang standalone (bomb/koboy/hangman/dll) ──
// uang sesuai profil game + jackpot ×3. return { gain, saldo, jackpot }.
export function rollBonus(m, gameType, { forceJackpot = false } = {}) {
  try {
    const prof = profileFor(gameType);
    const jackpot = forceJackpot || Math.random() < (prof.jackpotChance ?? JACKPOT_CHANCE);
    const u = prof.uang || [1, 30, 80];
    let base = randBetween(u[1], u[2]);
    if (jackpot) base *= JACKPOT_MULT;
    const res = addGameCash(m, base);
    return { ...res, jackpot };
  } catch { return { gain: 0, saldo: 0, jackpot: false }; }
}

// ── baris display reward (factory) ──
export function rewardLines(roll, fmtNum) {
  const it = roll.items || {};
  const f = fmtNum || ((v) => v);
  const lines = [];
  if (roll.jackpot) lines.push(`• 🎰 JACKPOT! Semua bonus ×${JACKPOT_MULT} + token & diamonds!\n`);
  if (it.limit > 0) lines.push(`• 🎫 Limit: +${it.limit}\n`);
  if (it.koin > 0) lines.push(`• 🪙 Koin: +${f(it.koin)}\n`);
  if (it.exp > 0) lines.push(`• ✨ EXP: +${f(it.exp)}\n`);
  if (it.gold > 0) lines.push(`• 🪭 Gold: +${f(it.gold)}\n`);
  if (it.gems > 0) lines.push(`• 💎 Gems: +${it.gems}\n`);
  if (it.diamonds > 0) lines.push(`• 💎 Diamonds: +${it.diamonds}\n`);
  if (it.tokens > 0) lines.push(`• 🎟️ Token: +${it.tokens}\n`);
  return lines;
}
