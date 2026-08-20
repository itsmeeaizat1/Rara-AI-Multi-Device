// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Nova RPG System - Leveling & Economy
const growth = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75;

export function xpRange(level, multiplier = 1) {
  level = Math.floor(level);
  const min = level === 0 ? 0 : Math.round(Math.pow(level, growth) * multiplier) + 1;
  const max = Math.round(Math.pow(level + 1, growth) * multiplier);
  return { min, max, xp: max - min };
}

export function findLevel(xp, multiplier = 1) {
  if (xp <= 0) return 0;
  let level = 0;
  do { level++; } while (xpRange(level, multiplier).min <= xp);
  return --level;
}

export function canLevelUp(level, xp, multiplier = 1) {
  return level < findLevel(xp, multiplier);
}

export function getRole(level) {
  if (level <= 2) return "Newbie ㋡";
  else if (level <= 4) return "Beginner I ⚊¹";
  else if (level <= 6) return "Beginner II ⚊²";
  else if (level <= 8) return "Beginner III ⚊³";
  else if (level <= 10) return "Beginner IV ⚊⁴";
  else if (level <= 12) return "Private I ☰¹";
  else if (level <= 14) return "Private II ☰²";
  else if (level <= 16) return "Private III ☰³";
  else if (level <= 18) return "Private IV ☰⁴";
  else if (level <= 20) return "Private V ☰⁵";
  else if (level <= 25) return "Corporal I ≣¹";
  else if (level <= 30) return "Corporal II ≣²";
  else if (level <= 35) return "Sergeant I ﹀¹";
  else if (level <= 40) return "Sergeant II ﹀²";
  else if (level <= 50) return "Staff ★";
  else if (level <= 60) return "Officer ♢";
  else if (level <= 80) return "Commander ♦";
  else if (level <= 100) return "General ⚜";
  else return "Legend 👑";
}

export function getUser(db, sender) {
  if (!db.rpg) db.rpg = {};
  if (!db.rpg[sender]) {
    db.rpg[sender] = {
      level: 0, exp: 0, money: 1000, health: 100, stamina: 100,
      potion: 0, diamond: 0, emerald: 0, iron: 0, wood: 0, rock: 0, string: 0,
      trash: 0, sampah: 0, common: 0, uncommon: 0, mythic: 0, legendary: 0,
      lastAdventure: 0, lastMining: 0, lastHunt: 0, lastFish: 0, lastDaily: 0,
      lastWeekly: 0, lastWork: 0, lastClaim: 0,
      kucing: 0, kuda: 0, naga: 0, rubah: 0, serigala: 0,
      sword: 0, armor: 0, pickaxe: 0, fishingrod: 0,
      totalExp: 0, totalMoney: 0, created: Date.now(),
    };
    db.write();
  }
  return db.rpg[sender];
}

export function addUserExp(db, sender, exp) {
  const user = getUser(db, sender);
  user.exp += exp;
  user.totalExp += exp;
  const oldLevel = user.level;
  user.level = findLevel(user.exp);
  db.write();
  return { leveledUp: user.level > oldLevel, newLevel: user.level, oldLevel };
}

export function addUserMoney(db, sender, amount) {
  const user = getUser(db, sender);
  user.money += amount;
  if (amount > 0) user.totalMoney += amount;
  db.write();
  return user.money;
}

export function formatTime(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  if (d > 0) return `${d} hari ${h} jam ${m} menit`;
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${s} detik`;
  return `${s} detik`;
}

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
