// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "./nova-database.js";

const db = getDatabase();

const DEFAULT_PLAYER = {
  name: null,
  level: 1,
  hp: 100,
  maxHp: 100,
  atk: 10,
  def: 5,
  exp: 0,
  maxExp: 100,
  gold: 0,
  job: "Pemburu",
  rank: "E",
  wins: 0,
  losses: 0,
  pet: "Tidak ada",
  partner: "Tidak ada",
  lastDaily: null,
  dailyStreak: 0,
};

function ensureUserKey(m) {
  const userId = String(m?.sender || m?.id || "");
  if (!userId) return null;
  return userId.replace(/@.+$/, "");
}

export function getPlayer(m) {
  const userId = ensureUserKey(m);
  if (!userId) return null;
  const user = db.getUser(userId);
  if (!user?.rpg) return null;
  return { ...DEFAULT_PLAYER, ...user.rpg };
}

export function savePlayer(m, data = {}) {
  const userId = ensureUserKey(m);
  if (!userId) return null;
  const user = db.getUser(userId) || {};
  const current = user.rpg || {};
  db.setUser(userId, {
    rpg: {
      ...current,
      ...data,
    },
  });
  return getPlayer(m);
}

export function ensurePlayer(m, pushName = "Player") {
  const userId = ensureUserKey(m);
  if (!userId) return null;
  let player = getPlayer(m);
  if (!player) {
    savePlayer(m, {
      ...DEFAULT_PLAYER,
      name: pushName || m?.pushName || "Player",
    });
    player = getPlayer(m);
  }
  return player;
}

export function addExp(m, amount) {
  const player = getPlayer(m);
  if (!player) return null;

  let exp = player.exp + amount;
  let level = player.level;
  let maxExp = player.maxExp;

  while (exp >= maxExp) {
    exp -= maxExp;
    level += 1;
    maxExp = Math.floor(maxExp * 1.25);
  }

  return savePlayer(m, {
    exp,
    level,
    maxExp,
    atk: player.atk + 2,
    def: player.def + 1,
    maxHp: player.maxHp + 10,
  });
}

export function addGold(m, amount) {
  const player = getPlayer(m);
  if (!player) return 0;
  return savePlayer(m, {
    gold: Math.max(0, player.gold + amount),
  }).gold;
}

export function claimDaily(m) {
  const userId = ensureUserKey(m);
  if (!userId) return { claimed: false, reason: "User tidak valid" };
  const user = db.getUser(userId) || {};
  const rpg = user.rpg || {};
  const today = new Date().toISOString().slice(0, 10);
  if (rpg.lastDaily === today) {
    return { claimed: false, reason: "Sudah claim hari ini" };
  }

  const gold = Math.floor(Math.random() * 500) + 100;
  const exp = Math.floor(Math.random() * 50) + 20;
  const updated = addExp(m, exp);
  const finalGold = addGold(m, gold);

  savePlayer(m, {
    lastDaily: today,
  });

  return {
    claimed: true,
    gold,
    exp,
    level: updated?.level || 1,
    totalGold: finalGold,
  };
}
