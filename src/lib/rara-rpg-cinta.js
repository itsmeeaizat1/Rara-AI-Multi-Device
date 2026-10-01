// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta Service — Sistem pacaran battle-style tied to RPG stats
// Affection = HP cinta, Couple War = battle pasangan, Kencan = quest affection

import { getDatabase } from "./rara-database.js";
import {
  ensureRpg, getRpgData, saveRpg,
  addExp, addGold, removeGold,
  useEnergy, checkCooldown
} from "./rara-rpg-service.js";

let _db = null;
function getDb() { if (!_db) _db = getDatabase(); return _db; }

// === RPG CINTA CONSTANTS ===
const DATING_MIN_LEVEL = 3;
const MARRIAGE_MIN_AFFECTION = 200;
const MARRIAGE_MIN_DATING_DAYS = 3;
const AFFECTION_DECAY_HOURS = 48;
const KENCAN_COOLDOWN_HOURS = 6;
const WAR_COOLDOWN_HOURS = 1;

const KENCAN_ACTIVITIES = [
  { name: "Nonton Bioskop", emoji: "🎬", cost: 100, energy: 20, affection: 30, exp: 40 },
  { name: "Makan Malam", emoji: "🍽️", cost: 150, energy: 25, affection: 40, exp: 50 },
  { name: "Jalan-jalan Mal", emoji: "🛍️", cost: 80, energy: 15, affection: 20, exp: 25 },
  { name: "Piknik Taman", emoji: "🌳", cost: 50, energy: 10, affection: 15, exp: 20 },
  { name: "Nonton Konser", emoji: "🎤", cost: 300, energy: 30, affection: 60, exp: 80 },
  { name: "Staycation", emoji: "🏨", cost: 500, energy: 40, affection: 100, exp: 120 },
  { name: "Roadtrip", emoji: "🚗", cost: 250, energy: 35, affection: 70, exp: 90 },
  { name: "Kencan Kopi", emoji: "☕", cost: 30, energy: 8, affection: 12, exp: 15 },
];

// === SESSIONS ===
if (!global.rpgCintaSessions) global.rpgCintaSessions = {};

// === CORE FUNCTIONS ===

export function getCintaData(m) {
  const rpg = getRpgData(m);
  if (!rpg.cinta) rpg.cinta = {};
  return rpg.cinta;
}

export function saveCintaData(m, cinta) {
  const rpg = getRpgData(m);
  rpg.cinta = cinta;
  saveRpg(m, rpg);
}

export function getLovePower(m) {
  const rpg = getRpgData(m);
  const cinta = getCintaData(m);
  const affection = cinta.affection || 0;
  const level = rpg.level || 1;
  const exp = rpg.exp || 0;
  const job = rpg.job || "novice";
  const jobBonus = job === "warrior" ? 50 : job === "mage" ? 30 : job === "archer" ? 40 : 10;
  return affection + (level * 30) + Math.floor(exp * 0.1) + jobBonus;
}

export function getCouplePower(m) {
  const cinta = getCintaData(m);
  if (!cinta.spouse) return 0;
  const myPower = getLovePower(m);
  const partnerPower = getLovePower({ sender: cinta.spouse, pushName: "" });
  return myPower + partnerPower;
}

export function addAffection(m, amount) {
  const cinta = getCintaData(m);
  cinta.affection = Math.max(0, (cinta.affection || 0) + amount);
  saveCintaData(m, cinta);
  return cinta.affection;
}

export function decayAffection(m) {
  const cinta = getCintaData(m);
  if (!cinta.spouse) return 0;
  const lastKencan = cinta.lastKencan || 0;
  const hoursSince = (Date.now() - lastKencan) / 3600000;
  if (hoursSince < AFFECTION_DECAY_HOURS) return 0;
  const decay = Math.floor((hoursSince - AFFECTION_DECAY_HOURS) / 24) * 5;
  if (decay > 0) {
    cinta.affection = Math.max(0, (cinta.affection || 0) - decay);
    saveCintaData(m, cinta);
  }
  return decay;
}

export function startDating(m, targetJid, targetName) {
  ensureRpg(m, m.pushName || "Player");
  ensureRpg({ sender: targetJid, pushName: targetName }, targetName);

  const cinta = getCintaData(m);
  cinta.spouse = targetJid;
  cinta.spouseName = targetName;
  cinta.affection = 50;
  cinta.datingDate = Date.now();
  cinta.lastKencan = Date.now();

  const targetCinta = getCintaData({ sender: targetJid, pushName: targetName });
  targetCinta.spouse = m.sender;
  targetCinta.spouseName = m.pushName || "Player";
  targetCinta.affection = 50;
  targetCinta.datingDate = Date.now();
  targetCinta.lastKencan = Date.now();

  saveCintaData(m, cinta);
  saveCintaData({ sender: targetJid, pushName: targetName }, targetCinta);
}

export function breakUp(m) {
  const cinta = getCintaData(m);
  const partner = cinta.spouse;
  if (!partner) return false;

  const myName = m.pushName || "Player";
  const partnerData = getDb().getUser(partner) || {};
  const partnerName = partnerData.name || partner.split("@")[0];

  // Clear both
  delete cinta.spouse;
  delete cinta.spouseName;
  delete cinta.affection;
  delete cinta.datingDate;
  delete cinta.lastKencan;
  delete cinta.married;
  delete cinta.marriedDate;
  cinta.breakupCount = (cinta.breakupCount || 0) + 1;
  saveCintaData(m, cinta);

  if (partner) {
    const pCinta = getCintaData({ sender: partner, pushName: partnerName });
    delete pCinta.spouse;
    delete pCinta.spouseName;
    delete pCinta.affection;
    delete pCinta.datingDate;
    delete pCinta.lastKencan;
    delete pCinta.married;
    delete pCinta.marriedDate;
    pCinta.breakupCount = (pCinta.breakupCount || 0) + 1;
    saveCintaData({ sender: partner, pushName: partnerName }, pCinta);
  }
  return true;
}

export function marry(m) {
  const cinta = getCintaData(m);
  const partner = cinta.spouse;
  if (!partner) return false;

  cinta.married = true;
  cinta.marriedDate = Date.now();
  saveCintaData(m, cinta);

  const partnerData = getDb().getUser(partner) || {};
  const partnerName = partnerData.name || partner.split("@")[0];
  const pCinta = getCintaData({ sender: partner, pushName: partnerName });
  pCinta.married = true;
  pCinta.marriedDate = Date.now();
  saveCintaData({ sender: partner, pushName: partnerName }, pCinta);
  return true;
}

export function divorce(m) {
  const cinta = getCintaData(m);
  if (!cinta.married) return false;

  cinta.married = false;
  delete cinta.marriedDate;
  cinta.divorceCount = (cinta.divorceCount || 0) + 1;
  cinta.affection = Math.max(0, (cinta.affection || 0) - 50);
  saveCintaData(m, cinta);

  const partner = cinta.spouse;
  if (partner) {
    const partnerData = getDb().getUser(partner) || {};
    const partnerName = partnerData.name || partner.split("@")[0];
    const pCinta = getCintaData({ sender: partner, pushName: partnerName });
    pCinta.married = false;
    delete pCinta.marriedDate;
    pCinta.divorceCount = (pCinta.divorceCount || 0) + 1;
    pCinta.affection = Math.max(0, (pCinta.affection || 0) - 50);
    saveCintaData({ sender: partner, pushName: partnerName }, pCinta);
  }
  return true;
}

export function getMarriageBonus(m) {
  const cinta = getCintaData(m);
  if (!cinta.married || !cinta.spouse) return null;

  const affection = cinta.affection || 0;
  const bonus = {
    hp: Math.floor(affection * 0.2),
    atk: Math.floor(affection * 0.05),
    def: Math.floor(affection * 0.05),
    exp: Math.floor(affection * 0.01),
    gold: Math.floor(affection * 0.01),
  };
  return bonus;
}

export function formatDurasi(ms) {
  if (!ms) return "Tidak diketahui";
  const hari = Math.floor(ms / 86400000);
  const jam = Math.floor((ms % 86400000) / 3600000);
  if (hari > 0) return `${hari} hari ${jam} jam`;
  if (jam > 0) return `${jam} jam`;
  const menit = Math.floor((ms % 3600000) / 60000);
  return `${menit} menit`;
}

export {
  DATING_MIN_LEVEL,
  MARRIAGE_MIN_AFFECTION,
  MARRIAGE_MIN_DATING_DAYS,
  KENCAN_COOLDOWN_HOURS,
  WAR_COOLDOWN_HOURS,
  KENCAN_ACTIVITIES,
};
