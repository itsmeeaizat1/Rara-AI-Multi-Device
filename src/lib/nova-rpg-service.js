// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Core Service V2 — Full System Rebuild
// Multi-currency, Equipment, Skills, Profession,
// Achievements, Guild, PvP, Boss Raid, Co-op Farm

import { getDatabase } from "./nova-database.js";

// ═══════════════════════════════════════════════════
// DEFAULT RPG PLAYER DATA
// ═══════════════════════════════════════════════════

export const DEFAULT_RPG = {
  level: 1, exp: 0, expNext: 100, totalExp: 0,
  gold: 0, gems: 0, tokens: 0, cash: 0,
  energy: 100, maxEnergy: 100, mana: 50, maxMana: 50,
  hp: 100, maxHp: 100, atk: 10, def: 5, spd: 10,
  critRate: 5, critDmg: 50, evasion: 3, accuracy: 95,
  lifesteal: 0, penetration: 0,
  luck: 0, dropBonus: 0, goldFind: 0, expBonus: 0,
  equipWeapon: null, equipArmor: null, equipHelmet: null,
  equipBoots: null, equipAccessory: null, equipRing: null, equipShield: null,
  job: "novice", jobLevel: 1, jobExp: 0, jobExpNext: 50,
  skills: [], skillPoints: 0,
  inventory: {},
  lastDaily: 0, lastWork: 0, lastHunt: 0, lastMine: 0, lastFish: 0,
  lastCook: 0, lastAdventure: 0, lastDungeon: 0, lastBossRaid: 0,
  lastPvP: 0, lastGacha: 0, lastPray: 0, lastTrain: 0, lastFarm: 0,
  guildId: null, guildRank: null,
  coupleId: null, coupleName: null, married: false, marriedId: null,
  marriedName: null, marriedDate: null, friends: [],
  pvpWins: 0, pvpLosses: 0, pvpRating: 1000, pvpStreak: 0, pvpBestStreak: 0,
  totalKills: 0, bossKills: 0, dungeonClears: 0,
  achievements: [], achievementPoints: 0,
  dailyStreak: 0, lastDailyStreak: 0, loginStreak: 0,
  farmPlots: [], title: null, createdAt: null, lastActive: null, totalPlayTime: 0,
};

// ═══════════════════════════════════════════════════
// ITEM DATABASE
// ═══════════════════════════════════════════════════

export const ITEM_DB = {
  rawMeat:     { name: "Daging Mentah", type: "material", rarity: "common", value: 5 },
  rawFish:     { name: "Ikan Mentah", type: "material", rarity: "common", value: 3 },
  wolfPelt:    { name: "Bulu Serigala", type: "material", rarity: "uncommon", value: 15 },
  bearClaw:    { name: "Cakar Beruang", type: "material", rarity: "uncommon", value: 20 },
  dragonScale: { name: "Sisik Naga", type: "material", rarity: "epic", value: 100 },
  copperOre:   { name: "Tembaga", type: "material", rarity: "common", value: 8 },
  ironOre:     { name: "Besi", type: "material", rarity: "uncommon", value: 15 },
  goldOre:     { name: "Emas Mentah", type: "material", rarity: "rare", value: 50 },
  mithrilOre:  { name: "Mithril", type: "material", rarity: "epic", value: 200 },
  pearl:       { name: "Mutiara", type: "material", rarity: "rare", value: 80 },
  bread:       { name: "Roti", type: "consumable", rarity: "common", value: 10, heal: 20 },
  cookedMeat:  { name: "Steak", type: "consumable", rarity: "common", value: 25, heal: 50 },
  fishSoup:    { name: "Sup Ikan", type: "consumable", rarity: "uncommon", value: 40, heal: 80, mana: 20 },
  hpPotion:    { name: "Ramuan HP", type: "consumable", rarity: "uncommon", value: 50, heal: 150 },
  mpPotion:    { name: "Ramuan MP", type: "consumable", rarity: "uncommon", value: 50, mana: 80 },
  elixir:      { name: "Eliksir", type: "consumable", rarity: "rare", value: 200, heal: 300, mana: 150 },
  energyDrink: { name: "Minuman Energi", type: "consumable", rarity: "uncommon", value: 30, energy: 50 },
  luckyCharm:  { name: "Jimat Keberuntungan", type: "consumable", rarity: "rare", value: 100, luck: 10 },
  woodenSword: { name: "Pedang Kayu", type: "weapon", rarity: "common", atk: 5 },
  ironSword:   { name: "Pedang Besi", type: "weapon", rarity: "uncommon", atk: 15 },
  steelBlade:  { name: "Baja Tajam", type: "weapon", rarity: "uncommon", atk: 25, spd: 3 },
  dragonSword: { name: "Pedang Naga", type: "weapon", rarity: "epic", atk: 60, critRate: 10 },
  excalibur:   { name: "Excalibur", type: "weapon", rarity: "legendary", atk: 120, critRate: 20, critDmg: 30 },
  leatherArmor:{ name: "Baju Kulit", type: "armor", rarity: "common", def: 8 },
  ironArmor:   { name: "Baju Besi", type: "armor", rarity: "uncommon", def: 20 },
  mithrilArmor:{ name: "Baju Mithril", type: "armor", rarity: "epic", def: 50, hp: 200 },
  dragonArmor: { name: "Armor Naga", type: "armor", rarity: "legendary", def: 80, hp: 500 },
  leatherCap:  { name: "Topi Kulit", type: "helmet", rarity: "common", def: 3, hp: 10 },
  ironHelm:    { name: "Helm Besi", type: "helmet", rarity: "uncommon", def: 8, hp: 30 },
  mithrilHelm: { name: "Helm Mithril", type: "helmet", rarity: "epic", def: 15, hp: 100 },
  leatherBoots:{ name: "Sepatu Kulit", type: "boots", rarity: "common", spd: 2, evasion: 1 },
  swiftBoots:  { name: "Sepatu Kilat", type: "boots", rarity: "uncommon", spd: 5, evasion: 5 },
  windBoots:   { name: "Sepatu Angin", type: "boots", rarity: "epic", spd: 12, evasion: 10 },
  powerAmulet: { name: "Jimat Kekuatan", type: "accessory", rarity: "uncommon", atk: 10, def: 5 },
  wisdomRing:  { name: "Cincin Kebijaksanaan", type: "ring", rarity: "rare", critRate: 15, critDmg: 20 },
  guardianShield:{ name: "Perisai Penjaga", type: "shield", rarity: "rare", def: 25, blockRate: 15 },
  gachaTicket: { name: "Tiket Gacha", type: "ticket", rarity: "rare", value: 100 },
  bossKey:     { name: "Kunci Boss", type: "key", rarity: "epic", value: 500 },
  dungeonKey:  { name: "Kunci Dungeon", type: "key", rarity: "rare", value: 200 },
  rebirthStone:{ name: "Batu Reinkarnasi", type: "special", rarity: "legendary", value: 1000 },
};

// ═══════════════════════════════════════════════════
// MONSTER DATABASE
// ═══════════════════════════════════════════════════

export const MONSTER_DB = {
  slime:     { name: "Slime", zone: "forest", minLv: 1, maxLv: 5, hp: 30, atk: 5, def: 2, exp: 15, gold: 10, drops: [{ item: "rawMeat", chance: 60 }] },
  wolf:      { name: "Serigala", zone: "forest", minLv: 3, maxLv: 10, hp: 60, atk: 12, def: 5, exp: 30, gold: 20, drops: [{ item: "rawMeat", chance: 40 }, { item: "wolfPelt", chance: 25 }] },
  bear:      { name: "Beruang", zone: "forest", minLv: 5, maxLv: 12, hp: 120, atk: 20, def: 10, exp: 50, gold: 35, drops: [{ item: "rawMeat", chance: 50 }, { item: "bearClaw", chance: 20 }] },
  bat:       { name: "Kelelawar", zone: "cave", minLv: 8, maxLv: 15, hp: 80, atk: 15, def: 3, exp: 40, gold: 25, drops: [] },
  goblin:    { name: "Goblin", zone: "cave", minLv: 10, maxLv: 20, hp: 150, atk: 25, def: 8, exp: 70, gold: 50, drops: [{ item: "copperOre", chance: 30 }] },
  troll:     { name: "Troll", zone: "cave", minLv: 15, maxLv: 25, hp: 300, atk: 40, def: 20, exp: 120, gold: 80, drops: [{ item: "ironOre", chance: 35 }] },
  harpy:     { name: "Harpy", zone: "mountain", minLv: 20, maxLv: 35, hp: 400, atk: 50, def: 15, exp: 180, gold: 120, drops: [{ item: "ironOre", chance: 40 }] },
  golem:     { name: "Golem", zone: "mountain", minLv: 25, maxLv: 45, hp: 800, atk: 70, def: 50, exp: 300, gold: 200, drops: [{ item: "goldOre", chance: 25 }, { item: "ironOre", chance: 50 }] },
  fireDrake: { name: "Fire Drake", zone: "dragon", minLv: 40, maxLv: 60, hp: 1500, atk: 120, def: 60, exp: 600, gold: 500, drops: [{ item: "dragonScale", chance: 15 }, { item: "goldOre", chance: 60 }] },
  ancientDragon: { name: "Naga Kuno", zone: "dragon", minLv: 50, maxLv: 99, hp: 5000, atk: 250, def: 120, exp: 2000, gold: 2000, drops: [{ item: "dragonScale", chance: 50 }, { item: "mithrilOre", chance: 20 }] },
};

// ═══════════════════════════════════════════════════
// JOB CLASSES
// ═══════════════════════════════════════════════════

export const JOB_DB = {
  novice:    { name: "Pemula", atkBonus: 0, defBonus: 0, spdBonus: 0, hpBonus: 0, mpBonus: 0 },
  warrior:   { name: "Petarung", atkBonus: 5, defBonus: 3, spdBonus: 0, hpBonus: 50, mpBonus: 0 },
  mage:      { name: "Penyihir", atkBonus: 8, defBonus: 0, spdBonus: 2, hpBonus: 0, mpBonus: 50 },
  archer:    { name: "Pemanah", atkBonus: 4, defBonus: 1, spdBonus: 8, hpBonus: 20, mpBonus: 10 },
  assassin:  { name: "Pembunuh", atkBonus: 6, defBonus: 0, spdBonus: 10, hpBonus: 0, mpBonus: 20 },
  tank:      { name: "Tank", atkBonus: 0, defBonus: 10, spdBonus: -2, hpBonus: 100, mpBonus: 0 },
  healer:    { name: "Tabib", atkBonus: 2, defBonus: 3, spdBonus: 2, hpBonus: 30, mpBonus: 80 },
  berserker: { name: "Berserker", atkBonus: 12, defBonus: -3, spdBonus: 5, hpBonus: 80, mpBonus: 0 },
};

// ═══════════════════════════════════════════════════
// SKILL DATABASE
// ═══════════════════════════════════════════════════

export const SKILL_DB = {
  powerStrike:   { name: "Power Strike", type: "active", mpCost: 15, power: 1.5, cooldown: 3, job: "warrior", minLevel: 5 },
  shieldBash:    { name: "Shield Bash", type: "active", mpCost: 20, power: 1.2, cooldown: 5, job: "warrior", minLevel: 10 },
  warCry:        { name: "War Cry", type: "buff", mpCost: 30, power: 0, cooldown: 10, job: "warrior", minLevel: 15 },
  fireball:      { name: "Fireball", type: "active", mpCost: 20, power: 2.0, cooldown: 4, job: "mage", minLevel: 5 },
  iceSpear:      { name: "Ice Spear", type: "active", mpCost: 25, power: 1.8, cooldown: 5, job: "mage", minLevel: 10 },
  meteor:        { name: "Meteor", type: "active", mpCost: 60, power: 4.0, cooldown: 15, job: "mage", minLevel: 25 },
  quickShot:     { name: "Quick Shot", type: "active", mpCost: 10, power: 1.3, cooldown: 2, job: "archer", minLevel: 5 },
  piercingArrow: { name: "Piercing Arrow", type: "active", mpCost: 25, power: 2.0, cooldown: 6, job: "archer", minLevel: 10 },
  rainOfArrows:  { name: "Rain of Arrows", type: "active", mpCost: 50, power: 2.5, cooldown: 12, job: "archer", minLevel: 20 },
  shadowSlash:   { name: "Shadow Slash", type: "active", mpCost: 15, power: 1.8, cooldown: 3, job: "assassin", minLevel: 5 },
  vanish:        { name: "Vanish", type: "buff", mpCost: 25, power: 0, cooldown: 8, job: "assassin", minLevel: 10 },
  deathStrike:   { name: "Death Strike", type: "active", mpCost: 50, power: 5.0, cooldown: 20, job: "assassin", minLevel: 25 },
  taunt:         { name: "Taunt", type: "buff", mpCost: 15, power: 0, cooldown: 5, job: "tank", minLevel: 5 },
  ironWall:      { name: "Iron Wall", type: "buff", mpCost: 30, power: 0, cooldown: 10, job: "tank", minLevel: 10 },
  reflect:       { name: "Reflect", type: "buff", mpCost: 40, power: 0, cooldown: 15, job: "tank", minLevel: 20 },
  heal:          { name: "Heal", type: "heal", mpCost: 20, power: 2.0, cooldown: 3, job: "healer", minLevel: 5 },
  greaterHeal:   { name: "Greater Heal", type: "heal", mpCost: 40, power: 4.0, cooldown: 6, job: "healer", minLevel: 15 },
  resurrection:  { name: "Resurrection", type: "special", mpCost: 80, power: 0, cooldown: 30, job: "healer", minLevel: 30 },
  rage:          { name: "Rage", type: "buff", mpCost: 10, power: 0, cooldown: 5, job: "berserker", minLevel: 5 },
  bloodlust:     { name: "Bloodlust", type: "buff", mpCost: 20, power: 0, cooldown: 8, job: "berserker", minLevel: 10 },
  whirlwind:     { name: "Whirlwind", type: "active", mpCost: 45, power: 3.0, cooldown: 10, job: "berserker", minLevel: 20 },
  meditate:      { name: "Meditate", type: "heal", mpCost: 0, power: 0, cooldown: 5, job: "all", minLevel: 1 },
  guard:         { name: "Guard", type: "buff", mpCost: 5, power: 0, cooldown: 3, job: "all", minLevel: 1 },
  focus:         { name: "Focus", type: "buff", mpCost: 10, power: 0, cooldown: 5, job: "all", minLevel: 5 },
};

// ═══════════════════════════════════════════════════
// ACHIEVEMENT DATABASE
// ═══════════════════════════════════════════════════

export const ACHIEVEMENT_DB = {
  firstStep:     { name: "Langkah Pertama", points: 10, check: (p) => p.level >= 1 },
  hunter10:      { name: "Pemburu Pemula", points: 20, check: (p) => p.totalKills >= 10 },
  hunter100:     { name: "Pemburu Handal", points: 50, check: (p) => p.totalKills >= 100 },
  bossSlayer:    { name: "Pembunuh Boss", points: 100, check: (p) => p.bossKills >= 1 },
  bossMaster:    { name: "Master Boss", points: 300, check: (p) => p.bossKills >= 10 },
  level50:       { name: "Veteran", points: 200, check: (p) => p.level >= 50 },
  level100:      { name: "Legenda", points: 500, check: (p) => p.level >= 100 },
  pvp10:         { name: "Petarung Arena", points: 50, check: (p) => p.pvpWins >= 10 },
  pvp50:         { name: "Juara Arena", points: 200, check: (p) => p.pvpWins >= 50 },
  pvpStreak10:   { name: "Tak Terkalahkan", points: 150, check: (p) => p.pvpBestStreak >= 10 },
  dungeon10:     { name: "Penjelajah", points: 100, check: (p) => p.dungeonClears >= 10 },
  goldMillion:   { name: "Konglomerat", points: 150, check: (p) => p.gold >= 1000000 },
  daily7:        { name: "Konsisten", points: 50, check: (p) => p.dailyStreak >= 7 },
  daily30:       { name: "Tidak Bolos", points: 200, check: (p) => p.dailyStreak >= 30 },
  married:       { name: "Sakral", points: 100, check: (p) => p.married === true },
  guildMember:   { name: "Bergengsi", points: 50, check: (p) => p.guildId !== null },
  jobMaster:     { name: "Profesional", points: 150, check: (p) => p.jobLevel >= 50 },
  collector:     { name: "Kolektor", points: 80, check: (p) => Object.keys(p.inventory || {}).length >= 20 },
  fullyEquipped: { name: "Siap Tempur", points: 100, check: (p) => p.equipWeapon && p.equipArmor && p.equipHelmet && p.equipBoots },
};

export const DEFAULT_GUILD = {
  name: "", leader: null, officers: [], members: [],
  level: 1, exp: 0, expNext: 1000, treasury: 0,
  announcement: "", createdAt: null, wins: 0, losses: 0,
};

// ═══════════════════════════════════════════════════
// CORE PLAYER FUNCTIONS
// ═══════════════════════════════════════════════════

export function getRpgData(m) {
  try {
    const db = getDatabase();
    const user = db.getUser(m.sender || "");
    if (!user) return null;
    return user.rpg || null;
  } catch { return null; }
}

export function ensureRpg(m, pushName = "Player") {
  try {
    const db = getDatabase();
    let user = db.getUser(m.sender || "");
    if (!user) { user = db.setUser(m.sender || "", { name: pushName }); }
    // FIX (8 Sep 2026, nemu pas e2e animasi kerja): setUser() selalu bikin stub
    // rpg dari whitelist (hp/atk/job/jobLevel...) yang NON-KOSONG tapi TANPA
    // jobExp/jobExpNext — cek lama "Object.keys(rpg).length === 0" gak pernah
    // ke-trigger → jobExp jadi NaN → level-up job gak pernah jalan untuk user
    // auto-create. Sekarang stub rpg juga di-heal: DEFAULT_RPG mengisi field
    // yang hilang, nilai existing dipertahankan.
    const stubRpg = user.rpg && typeof user.rpg === "object"
      && (user.rpg.jobExpNext === undefined || user.rpg.jobExp === undefined);
    if (!user.rpg || typeof user.rpg !== "object" || Object.keys(user.rpg).length === 0 || stubRpg) {
      const newRpg = { ...DEFAULT_RPG, ...(user.rpg || {}), createdAt: Date.now(), lastActive: Date.now() };
      db.setUser(m.sender || "", { rpg: newRpg });
      user = db.getUser(m.sender || "");
    }
    return user.rpg;
  } catch { return null; }
}

export function saveRpg(m, rpgData) {
  try {
    const db = getDatabase();
    const user = db.getUser(m.sender || "");
    if (!user) return false;
    db.setUser(m.sender || "", { rpg: { ...user.rpg, ...rpgData } });
    return true;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════
// EXPERIENCE & LEVELING
// ═══════════════════════════════════════════════════

export function addExp(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { leveledUp: false, levels: 0 };
    const bonus = Math.floor(amount * (rpg.expBonus / 100));
    const total = amount + bonus;
    rpg.exp += total; rpg.totalExp += total;
    // 💵 UANG OTOMATIS (8 Sep 2026, request owner: "semua game ada item uang")
    // EXP = pengalaman (bukan uang), Gold = batang emas (bukan uang) —
    // tiap game yang kasih EXP juga dibayar UANG (Rp), skala naik ikut level:
    // Lv.1 ×50 EXP, Lv.10 ×140, Lv.30 ×340 (kerja profesi tetap gajian besar).
    const cashGain = Math.floor(total * (40 + (rpg.level || 1) * 10));
    rpg.cash = Math.max(0, (rpg.cash || 0) + cashGain);
    let levels = 0;
    while (rpg.exp >= rpg.expNext) {
      rpg.exp -= rpg.expNext; rpg.level += 1;
      rpg.expNext = Math.floor(rpg.expNext * 1.5); levels++;
      rpg.maxHp += 20; rpg.hp = rpg.maxHp;
      rpg.maxMana += 10; rpg.mana = rpg.maxMana;
      rpg.maxEnergy += 5; rpg.atk += 3; rpg.def += 2; rpg.spd += 1;
      rpg.skillPoints += 2;
    }
    saveRpg(m, rpg);
    return { leveledUp: levels > 0, levels, cashGain };
  } catch { return { leveledUp: false, levels: 0, cashGain: 0 }; }
}

export function addJobExp(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { leveledUp: false };
    rpg.jobExp += amount;
    let leveledUp = false;
    while (rpg.jobExp >= rpg.jobExpNext) {
      rpg.jobExp -= rpg.jobExpNext; rpg.jobLevel += 1;
      rpg.jobExpNext = Math.floor(rpg.jobExpNext * 1.3); leveledUp = true;
      const job = JOB_DB[rpg.job];
      if (job) {
        rpg.atk += job.atkBonus; rpg.def += job.defBonus;
        rpg.spd += job.spdBonus; rpg.maxHp += job.hpBonus; rpg.maxMana += job.mpBonus;
      }
    }
    saveRpg(m, rpg);
    return { leveledUp };
  } catch { return { leveledUp: false }; }
}

// ═══════════════════════════════════════════════════
// CURRENCY FUNCTIONS
// ═══════════════════════════════════════════════════

export function addGold(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    const bonus = Math.floor(amount * (rpg.goldFind / 100));
    const total = amount + bonus;
    rpg.gold = Math.max(0, rpg.gold + total);
    saveRpg(m, rpg);
    return total;
  } catch { return 0; }
}

// ── CASH / UANG (Rp) — mata uang RPG terpisah dari Gold ──
// Gold = batang emas (bukan uang), EXP = pengalaman (bukan uang),
// Cash = uang gajian profesi (Rp) — buat belanja/marketplace (8 Sep 2026).
export function addCash(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return 0;
    rpg.cash = Math.max(0, (rpg.cash || 0) + amt);
    saveRpg(m, rpg);
    return amt;
  } catch { return 0; }
}

export function spendCash(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return false;
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0 || (rpg.cash || 0) < amt) return false;
    rpg.cash = Math.max(0, (rpg.cash || 0) - amt);
    saveRpg(m, rpg);
    return true;
  } catch { return false; }
}

export function getCash(m) {
  try {
    const rpg = ensureRpg(m);
    return rpg?.cash || 0;
  } catch { return 0; }
}

export function formatRp(amount) {
  return "Rp " + (Number(amount) || 0).toLocaleString("id-ID");
}

export function removeGold(m, amount, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || rpg.gold < amount) return false;
    rpg.gold -= amount; saveRpg(m, rpg);
    if (sock) {
      const chatId = m.chat || m.sender;
      sock.sendMessage(chatId, { text: amount + " Gold terpakai" }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

export function addGems(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    rpg.gems = Math.max(0, rpg.gems + amount);
    saveRpg(m, rpg); return amount;
  } catch { return 0; }
}

export function removeGems(m, amount, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || rpg.gems < amount) return false;
    rpg.gems -= amount; saveRpg(m, rpg);
    if (sock) {
      const chatId = m.chat || m.sender;
      sock.sendMessage(chatId, { text: amount + " Gems terpakai" }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

export function addTokens(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    rpg.tokens = Math.max(0, rpg.tokens + amount);
    saveRpg(m, rpg); return amount;
  } catch { return 0; }
}

export function removeTokens(m, amount, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || rpg.tokens < amount) return false;
    rpg.tokens -= amount; saveRpg(m, rpg);
    if (sock) {
      const chatId = m.chat || m.sender;
      sock.sendMessage(chatId, { text: amount + " Tokens terpakai" }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════
// ENERGY & MANA & HP
// ═══════════════════════════════════════════════════

export function useEnergy(m, amount, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return false;
    if (rpg.energy < amount) return false;
    rpg.energy -= amount; rpg.lastActive = Date.now();
    saveRpg(m, rpg);
    if (sock) {
      const chatId = m.chat || m.sender;
      sock.sendMessage(chatId, { text: amount + " Energy terpakai" }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

export function regenEnergy(m, amount = 10) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    const before = rpg.energy;
    rpg.energy = Math.min(rpg.maxEnergy, rpg.energy + amount);
    saveRpg(m, rpg); return rpg.energy - before;
  } catch { return 0; }
}

export function useMana(m, amount, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || rpg.mana < amount) return false;
    rpg.mana -= amount; saveRpg(m, rpg);
    if (sock) {
      const chatId = m.chat || m.sender;
      sock.sendMessage(chatId, { text: amount + " Mana terpakai" }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

export function regenMana(m, amount = 20) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    const before = rpg.mana;
    rpg.mana = Math.min(rpg.maxMana, rpg.mana + amount);
    saveRpg(m, rpg); return rpg.mana - before;
  } catch { return 0; }
}

export function regenHP(m, amount) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return 0;
    const before = rpg.hp;
    rpg.hp = Math.min(rpg.maxHp, rpg.hp + amount);
    saveRpg(m, rpg); return rpg.hp - before;
  } catch { return 0; }
}

// ═══════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════

export function addItem(m, itemId, quantity = 1) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return false;
    const itemDef = ITEM_DB[itemId];
    if (!itemDef) return false;
    if (!rpg.inventory) rpg.inventory = {};
    if (rpg.inventory[itemId]) { rpg.inventory[itemId].qty += quantity; }
    else { rpg.inventory[itemId] = { qty: quantity, rarity: itemDef.rarity, type: itemDef.type, value: itemDef.value }; }
    saveRpg(m, rpg); return true;
  } catch { return false; }
}

export function removeItem(m, itemId, quantity = 1, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || !rpg.inventory || !rpg.inventory[itemId]) return false;
    if (rpg.inventory[itemId].qty < quantity) return false;
    rpg.inventory[itemId].qty -= quantity;
    if (rpg.inventory[itemId].qty <= 0) delete rpg.inventory[itemId];
    saveRpg(m, rpg);
    if (sock) {
      const chatId = m.chat || m.sender;
      const itemName = (ITEM_DB[itemId]?.name) || itemId;
      sock.sendMessage(chatId, { text: quantity + "x " + itemName + " terpakai" }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

export function getItem(m, itemId) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || !rpg.inventory || !rpg.inventory[itemId]) return null;
    return { ...rpg.inventory[itemId], ...ITEM_DB[itemId], id: itemId };
  } catch { return null; }
}

export function getInventory(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || !rpg.inventory) return {};
    return rpg.inventory;
  } catch { return {}; }
}

export function getItemCount(m, itemId) {
  try { const item = getItem(m, itemId); return item ? item.qty : 0; }
  catch { return 0; }
}

// ═══════════════════════════════════════════════════
// EQUIPMENT
// ═══════════════════════════════════════════════════

const SLOT_MAP = { weapon: "equipWeapon", armor: "equipArmor", helmet: "equipHelmet", boots: "equipBoots", accessory: "equipAccessory", ring: "equipRing", shield: "equipShield" };

export function equipItem(m, itemId, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false, reason: "RPG belum siap" };
    const itemDef = ITEM_DB[itemId];
    if (!itemDef) return { success: false, reason: "Item tidak dikenal" };
    if (!rpg.inventory || !rpg.inventory[itemId] || rpg.inventory[itemId].qty < 1) return { success: false, reason: "Item tidak ada di inventory" };
    const slot = SLOT_MAP[itemDef.type];
    if (!slot) return { success: false, reason: "Item bukan equipment" };
    const previous = rpg[slot];
    if (previous) { addItem(m, previous.id, 1); unequipStat(rpg, previous); }
    rpg[slot] = { id: itemId, name: itemDef.name, rarity: itemDef.rarity, enchant: 0, ...extractEquipStats(itemDef) };
    removeItem(m, itemId, 1, sock);
    applyEquipStat(rpg, rpg[slot]);
    saveRpg(m, rpg);
    return { success: true, item: itemDef, slot };
  } catch (e) { return { success: false, reason: String(e) }; }
}

export function unequipItem(m, slot) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false };
    const valid = ["equipWeapon","equipArmor","equipHelmet","equipBoots","equipAccessory","equipRing","equipShield"];
    if (!valid.includes(slot)) return { success: false, reason: "Slot tidak valid" };
    const item = rpg[slot];
    if (!item) return { success: false, reason: "Slot kosong" };
    unequipStat(rpg, item);
    addItem(m, item.id, 1);
    rpg[slot] = null; saveRpg(m, rpg);
    return { success: true, item };
  } catch { return { success: false }; }
}

function extractEquipStats(itemDef) {
  const s = {};
  if (itemDef.atk) s.atk = itemDef.atk;
  if (itemDef.def) s.def = itemDef.def;
  if (itemDef.spd) s.spd = itemDef.spd;
  if (itemDef.hp) s.hp = itemDef.hp;
  if (itemDef.evasion) s.evasion = itemDef.evasion;
  if (itemDef.critRate) s.critRate = itemDef.critRate;
  if (itemDef.critDmg) s.critDmg = itemDef.critDmg;
  if (itemDef.blockRate) s.blockRate = itemDef.blockRate;
  return s;
}

function applyEquipStat(rpg, item) {
  if (!item) return;
  if (item.atk) rpg.atk += item.atk;
  if (item.def) rpg.def += item.def;
  if (item.spd) rpg.spd += item.spd;
  if (item.hp) { rpg.maxHp += item.hp; rpg.hp += item.hp; }
  if (item.evasion) rpg.evasion += item.evasion;
  if (item.critRate) rpg.critRate += item.critRate;
  if (item.critDmg) rpg.critDmg += item.critDmg;
}

function unequipStat(rpg, item) {
  if (!item) return;
  if (item.atk) rpg.atk = Math.max(1, rpg.atk - item.atk);
  if (item.def) rpg.def = Math.max(0, rpg.def - item.def);
  if (item.spd) rpg.spd = Math.max(1, rpg.spd - item.spd);
  if (item.hp) { rpg.maxHp = Math.max(1, rpg.maxHp - item.hp); rpg.hp = Math.min(rpg.hp, rpg.maxHp); }
  if (item.evasion) rpg.evasion = Math.max(0, rpg.evasion - item.evasion);
  if (item.critRate) rpg.critRate = Math.max(0, rpg.critRate - item.critRate);
  if (item.critDmg) rpg.critDmg = Math.max(0, rpg.critDmg - item.critDmg);
}

export function getEquipStats(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return {};
    const total = { atk: 0, def: 0, spd: 0, hp: 0, evasion: 0, critRate: 0, critDmg: 0 };
    for (const slot of ["equipWeapon","equipArmor","equipHelmet","equipBoots","equipAccessory","equipRing","equipShield"]) {
      if (rpg[slot]) { for (const k of Object.keys(total)) { if (rpg[slot][k]) total[k] += rpg[slot][k]; } }
    }
    return total;
  } catch { return {}; }
}

// ═══════════════════════════════════════════════════
// ENCHANTMENT
// ═══════════════════════════════════════════════════

export function enchantItem(m, slot, materialId = "mithrilOre", materialQty = 1, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false, reason: "RPG belum siap" };
    if (!rpg[slot]) return { success: false, reason: "Slot kosong" };
    if (!rpg.inventory || !rpg.inventory[materialId] || rpg.inventory[materialId].qty < materialQty) return { success: false, reason: "Material tidak cukup" };
    const item = rpg[slot];
    const successRate = Math.max(20, 80 - item.enchant * 10);
    removeItem(m, materialId, materialQty, sock);
    if (Math.random() * 100 <= successRate) {
      item.enchant += 1;
      if (item.atk) item.atk = Math.floor(item.atk * 1.1);
      if (item.def) item.def = Math.floor(item.def * 1.1);
      if (item.spd) item.spd = Math.floor(item.spd * 1.1);
      if (item.hp) item.hp = Math.floor(item.hp * 1.1);
      rpg[slot] = item; saveRpg(m, rpg);
      return { success: true, enchant: item.enchant };
    } else { saveRpg(m, rpg); return { success: false, reason: "Enchant gagal", enchant: item.enchant }; }
  } catch (e) { return { success: false, reason: String(e) }; }
}

// ═══════════════════════════════════════════════════
// SKILLS
// ═══════════════════════════════════════════════════

export function unlockSkill(m, skillId) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false, reason: "RPG belum siap" };
    const skillDef = SKILL_DB[skillId];
    if (!skillDef) return { success: false, reason: "Skill tidak dikenal" };
    if (skillDef.job !== "all" && skillDef.job !== rpg.job) return { success: false, reason: `Skill khusus job ${skillDef.job}` };
    if (rpg.level < skillDef.minLevel) return { success: false, reason: `Butuh level ${skillDef.minLevel}` };
    if (rpg.skills && rpg.skills.find((s) => s.id === skillId)) return { success: false, reason: "Skill sudah dibuka" };
    if (rpg.skillPoints < 1) return { success: false, reason: "Skill point tidak cukup" };
    rpg.skillPoints -= 1;
    if (!rpg.skills) rpg.skills = [];
    rpg.skills.push({ id: skillId, name: skillDef.name, level: 1, type: skillDef.type, mpCost: skillDef.mpCost, power: skillDef.power, cooldown: skillDef.cooldown });
    saveRpg(m, rpg);
    return { success: true, skill: skillDef };
  } catch (e) { return { success: false, reason: String(e) }; }
}

export function upgradeSkill(m, skillId) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || !rpg.skills) return { success: false, reason: "Tidak ada skill" };
    const skill = rpg.skills.find((s) => s.id === skillId);
    if (!skill) return { success: false, reason: "Skill belum dibuka" };
    if (rpg.skillPoints < 1) return { success: false, reason: "Skill point tidak cukup" };
    if (skill.level >= 10) return { success: false, reason: "Skill sudah max" };
    rpg.skillPoints -= 1; skill.level += 1;
    skill.power = Math.floor(skill.power * 1.15); skill.mpCost = Math.floor(skill.mpCost * 1.1);
    saveRpg(m, rpg);
    return { success: true, skill };
  } catch { return { success: false }; }
}

export function getAvailableSkills(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return [];
    const unlocked = (rpg.skills || []).map((s) => s.id);
    return Object.entries(SKILL_DB)
      .filter(([id, def]) => { if (unlocked.includes(id)) return false; if (def.job !== "all" && def.job !== rpg.job) return false; if (rpg.level < def.minLevel) return false; return true; })
      .map(([id, def]) => ({ id, ...def }));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════
// JOB CLASS
// ═══════════════════════════════════════════════════

export function changeJob(m, newJob) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false, reason: "RPG belum siap" };
    const jobDef = JOB_DB[newJob];
    if (!jobDef) return { success: false, reason: "Job tidak dikenal" };
    if (rpg.job === newJob) return { success: false, reason: "Sudah job ini" };
    if (rpg.level < 10) return { success: false, reason: "Butuh level 10 untuk ganti job" };
    const oldJob = JOB_DB[rpg.job];
    if (oldJob) {
      rpg.atk = Math.max(1, rpg.atk - oldJob.atkBonus * rpg.jobLevel);
      rpg.def = Math.max(0, rpg.def - oldJob.defBonus * rpg.jobLevel);
      rpg.spd = Math.max(1, rpg.spd - oldJob.spdBonus * rpg.jobLevel);
      rpg.maxHp = Math.max(1, rpg.maxHp - oldJob.hpBonus * rpg.jobLevel);
      rpg.maxMana = Math.max(1, rpg.maxMana - oldJob.mpBonus * rpg.jobLevel);
    }
    rpg.job = newJob; rpg.jobLevel = 1; rpg.jobExp = 0; rpg.jobExpNext = 50;
    rpg.skills = []; rpg.skillPoints = Math.floor(rpg.level / 5);
    rpg.atk += jobDef.atkBonus; rpg.def += jobDef.defBonus; rpg.spd += jobDef.spdBonus;
    rpg.maxHp += jobDef.hpBonus; rpg.maxMana += jobDef.mpBonus;
    rpg.hp = rpg.maxHp; rpg.mana = rpg.maxMana;
    saveRpg(m, rpg);
    return { success: true, job: jobDef };
  } catch (e) { return { success: false, reason: String(e) }; }
}

// ═══════════════════════════════════════════════════
// COOLDOWN
// ═══════════════════════════════════════════════════

export function checkCooldown(m, field) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return false;
    const last = rpg[field] || 0;
    if (!last) return false;
    return last > Date.now() ? Math.ceil((last - Date.now()) / 1000) : false;
  } catch { return false; }
}

export function setCooldown(m, field, cooldownMs) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return false;
    rpg[field] = Date.now() + cooldownMs;
    saveRpg(m, rpg); return true;
  } catch { return false; }
}

export function formatTime(seconds) {
  if (!seconds || seconds <= 0) return "0 detik";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let r = "";
  if (h > 0) r += `${h}j `;
  if (m > 0) r += `${m}m `;
  if (s > 0) r += `${s}d`;
  return r.trim();
}

// ═══════════════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════════════

export function checkAchievements(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return [];
    const newly = [];
    if (!rpg.achievements) rpg.achievements = [];
    for (const [id, def] of Object.entries(ACHIEVEMENT_DB)) {
      if (rpg.achievements.find((a) => a.id === id)) continue;
      try {
        if (def.check(rpg)) {
          rpg.achievements.push({ id, name: def.name, unlockedAt: Date.now() });
          rpg.achievementPoints += def.points;
          newly.push({ id, ...def });
        }
      } catch {}
    }
    if (newly.length > 0) saveRpg(m, rpg);
    return newly;
  } catch { return []; }
}

// ═══════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════

// ── Stat counter per-game untuk leaderboard ──
// Naikkan rpg.<key>.<field> sebanyak amount, tersimpan via setPlayerData
// (aman bersama fix whitelist setUser — key per-game tidak terhapus lagi).
export async function bumpPlayerStat(m, key, field, amount = 1) {
  try {
    if (!m?.sender || amount <= 0) return 0;
    const db = getDatabase();
    const data = (await db.getPlayerData(m.sender, key)) || {};
    data[field] = (data[field] || 0) + amount;
    await db.setPlayerData(m.sender, key, data);
    return data[field];
  } catch { return 0; }
}

export function getLeaderboard(type = "level", limit = 10) {
  try {
    const db = getDatabase();
    const users = db.getAllUsers();
    const players = [];
    for (const user of Object.values(users)) {
      if (!user.rpg) continue;
      const rpg = user.rpg;
      let value = 0;
      switch (type) {
        case "level": value = rpg.level || 1; break;
        case "gold": value = rpg.gold || 0; break;
        case "cash": value = rpg.cash || 0; break;
        case "pvp": value = rpg.pvpRating || 1000; break;
        case "kills": value = rpg.totalKills || 0; break;
        case "boss": value = rpg.bossKills || 0; break;
        case "achievement": value = rpg.achievementPoints || 0; break;
        case "gems": value = rpg.gems || 0; break;
        case "tokens": value = rpg.tokens || 0; break;
        case "joblevel": value = rpg.jobLevel || 1; break;
        default: {
          // Deep path per-game: "survival.daysSurvived", "slotmachine.wins",
          // "gachawaifu.pulls", "cookingv2.cookedHistory", dll.
          // Array di ujung path dihitung sebagai jumlah item (length).
          let v = rpg;
          for (const k of String(type).split(".")) v = v?.[k];
          if (Array.isArray(v)) v = v.length;
          value = typeof v === "number" ? v : 0;
        }
      }
      players.push({ name: user.name || user.number || "Unknown", number: user.number || "", value, rpg });
    }
    players.sort((a, b) => b.value - a.value);
    return players.slice(0, limit);
  } catch { return []; }
}

// ═══════════════════════════════════════════════════
// PVP SYSTEM
// ═══════════════════════════════════════════════════

export function pvpResult(m, isWin, opponentRating = 1000) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return null;
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (opponentRating - rpg.pvpRating) / 400));
    const score = isWin ? 1 : 0;
    const ratingChange = Math.round(K * (score - expected));
    rpg.pvpRating = Math.max(100, rpg.pvpRating + ratingChange);
    if (isWin) {
      rpg.pvpWins += 1; rpg.pvpStreak += 1;
      if (rpg.pvpStreak > rpg.pvpBestStreak) rpg.pvpBestStreak = rpg.pvpStreak;
      addTokens(m, Math.max(5, Math.floor(ratingChange / 2)));
    } else { rpg.pvpLosses += 1; rpg.pvpStreak = 0; }
    saveRpg(m, rpg);
    return { isWin, ratingChange, newRating: rpg.pvpRating, streak: rpg.pvpStreak };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════
// GUILD SYSTEM
// ═══════════════════════════════════════════════════

export function getGuild(guildId) {
  try {
    const db = getDatabase();
    const guilds = db.db.data.guilds || {};
    return guilds[guildId] || null;
  } catch { return null; }
}

export function createGuild(m, name) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false, reason: "RPG belum siap" };
    if (rpg.guildId) return { success: false, reason: "Sudah di guild" };
    if (rpg.level < 20) return { success: false, reason: "Butuh level 20 untuk buat guild" };
    if (!name || name.length < 3) return { success: false, reason: "Nama guild minimal 3 karakter" };
    const db = getDatabase();
    if (!db.db.data.guilds) db.db.data.guilds = {};
    for (const g of Object.values(db.db.data.guilds)) {
      if (g.name && g.name.toLowerCase() === name.toLowerCase()) return { success: false, reason: "Nama guild sudah dipakai" };
    }
    const guildId = `guild_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.db.data.guilds[guildId] = { ...DEFAULT_GUILD, name, leader: m.sender, members: [m.sender], createdAt: Date.now() };
    rpg.guildId = guildId; rpg.guildRank = "leader";
    saveRpg(m, rpg); db.markDirty("users");
    return { success: true, guildId, name };
  } catch (e) { return { success: false, reason: String(e) }; }
}

export function joinGuild(m, guildId) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false };
    if (rpg.guildId) return { success: false, reason: "Sudah di guild" };
    const db = getDatabase();
    const guild = getGuild(guildId);
    if (!guild) return { success: false, reason: "Guild tidak ditemukan" };
    if (guild.members.length >= 50) return { success: false, reason: "Guild penuh" };
    guild.members.push(m.sender);
    rpg.guildId = guildId; rpg.guildRank = "member";
    saveRpg(m, rpg); db.markDirty("users");
    return { success: true, guild };
  } catch (e) { return { success: false, reason: String(e) }; }
}

export function leaveGuild(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg || !rpg.guildId) return { success: false, reason: "Tidak ada guild" };
    const db = getDatabase();
    const guild = getGuild(rpg.guildId);
    if (!guild) { rpg.guildId = null; rpg.guildRank = null; saveRpg(m, rpg); return { success: true }; }
    guild.members = guild.members.filter((id) => id !== m.sender);
    guild.officers = guild.officers.filter((id) => id !== m.sender);
    if (guild.leader === m.sender) {
      if (guild.members.length > 0) { guild.leader = guild.members[0]; }
      else { delete db.db.data.guilds[rpg.guildId]; }
    }
    rpg.guildId = null; rpg.guildRank = null;
    saveRpg(m, rpg); db.markDirty("users");
    return { success: true };
  } catch { return { success: false }; }
}

// ═══════════════════════════════════════════════════
// DAILY STREAK
// ═══════════════════════════════════════════════════

export function claimDaily(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false };
    const now = Date.now();
    const lastClaim = rpg.lastDaily || 0;
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - lastClaim < dayMs) { return { success: false, reason: "cooldown", remaining: dayMs - (now - lastClaim) }; }
    if (lastClaim && now - lastClaim < dayMs * 2) { rpg.dailyStreak += 1; } else { rpg.dailyStreak = 1; }
    const baseGold = 100 + (rpg.dailyStreak - 1) * 50;
    const baseExp = 50 + (rpg.dailyStreak - 1) * 25;
    const baseGems = rpg.dailyStreak % 7 === 0 ? 10 : 0;
    addGold(m, baseGold); addExp(m, baseExp);
    if (baseGems > 0) addGems(m, baseGems);
    rpg.lastDaily = now; saveRpg(m, rpg);
    return { success: true, gold: baseGold, exp: baseExp, gems: baseGems, streak: rpg.dailyStreak };
  } catch { return { success: false }; }
}

// ═══════════════════════════════════════════════════
// DROP SYSTEM
// ═══════════════════════════════════════════════════

export function rollDrop(dropTable, luck = 0, dropBonus = 0) {
  try {
    const drops = [];
    for (const drop of dropTable) {
      const chance = Math.min(100, drop.chance + luck + dropBonus);
      if (Math.random() * 100 <= chance) {
        const qty = Math.floor(Math.random() * 3) + 1;
        drops.push({ item: drop.item, qty });
      }
    }
    return drops;
  } catch { return []; }
}

export function getMonstersByLevel(level) {
  try {
    return Object.entries(MONSTER_DB)
      .filter(([id, mon]) => level >= mon.minLv && level <= mon.maxLv)
      .map(([id, mon]) => ({ id, ...mon }));
  } catch { return []; }
}

export function getRandomMonster(level) {
  try {
    const available = getMonstersByLevel(level);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  } catch { return null; }
}

// ═══════════════════════════════════════════════════
// REBIRTH / PRESTIGE
// ═══════════════════════════════════════════════════

export function rebirth(m, sock) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return { success: false, reason: "RPG belum siap" };
    if (rpg.level < 100) return { success: false, reason: "Butuh level 100 untuk reinkarnasi" };
    if (!rpg.inventory || !rpg.inventory["rebirthStone"] || rpg.inventory["rebirthStone"].qty < 1) return { success: false, reason: "Butuh Batu Reinkarnasi" };
    removeItem(m, "rebirthStone", 1, sock);
    const bonusPercent = 5; // 5% permanent stat bonus per rebirth
    const rebirthCount = (rpg.rebirthCount || 0) + 1;
    const newRpg = {
      ...DEFAULT_RPG,
      createdAt: rpg.createdAt,
      lastActive: Date.now(),
      rebirthCount,
      permBonus: (rpg.permBonus || 0) + bonusPercent,
      gems: rpg.gems,
      tokens: rpg.tokens,
      achievements: rpg.achievements,
      achievementPoints: rpg.achievementPoints,
      title: rpg.title,
    };
    // Apply permanent bonus
    newRpg.atk = Math.floor(newRpg.atk * (1 + newRpg.permBonus / 100));
    newRpg.def = Math.floor(newRpg.def * (1 + newRpg.permBonus / 100));
    newRpg.maxHp = Math.floor(newRpg.maxHp * (1 + newRpg.permBonus / 100));
    newRpg.hp = newRpg.maxHp;
    newRpg.maxMana = Math.floor(newRpg.maxMana * (1 + newRpg.permBonus / 100));
    newRpg.mana = newRpg.maxMana;
    saveRpg(m, newRpg);
    return { success: true, rebirthCount, bonusPercent: newRpg.permBonus };
  } catch (e) { return { success: false, reason: String(e) }; }
}

// ═══════════════════════════════════════════════════
// PLAYER INFO FORMATTER
// ═══════════════════════════════════════════════════

export function getPlayerInfo(m) {
  try {
    const rpg = ensureRpg(m);
    if (!rpg) return "RPG belum diinisialisasi";
    const equip = getEquipStats(m);
    const job = JOB_DB[rpg.job] || { name: "Pemula" };
    let text = "";
    text += `*RPG PROFILE*\n\n`;
    text += `Nama: *${m.pushName || m.sender}*\n`;
    text += `Level: *${rpg.level}* | EXP: *${rpg.exp}/${rpg.expNext}*\n`;
    text += `Total EXP: *${rpg.totalExp.toLocaleString()}*\n`;
    if (rpg.rebirthCount) text += `Rebirth: *${rpg.rebirthCount}x* (Bonus: *${rpg.permBonus || 0}%*)\n`;
    text += `Title: *${rpg.title || "Tidak ada"}*\n\n`;
    text += `*CURRENCIES*\n`;
    text += `Uang: *${formatRp(rpg.cash || 0)}*\n`;
    text += `Gold (batang emas): *${rpg.gold.toLocaleString()}*\n`;
    text += `Gems: *${rpg.gems.toLocaleString()}*\n`;
    text += `Tokens: *${rpg.tokens.toLocaleString()}*\n`;
    text += `Energy: *${rpg.energy}/${rpg.maxEnergy}*\n`;
    text += `Mana: *${rpg.mana}/${rpg.maxMana}*\n\n`;
    text += `*COMBAT STATS*\n`;
    text += `HP: *${rpg.hp}/${rpg.maxHp}*\n`;
    text += `ATK: *${rpg.atk}* (+${equip.atk} equip)\n`;
    text += `DEF: *${rpg.def}* (+${equip.def} equip)\n`;
    text += `SPD: *${rpg.spd}* (+${equip.spd} equip)\n`;
    text += `Crit Rate: *${rpg.critRate}%*\n`;
    text += `Crit DMG: *${rpg.critDmg}%*\n`;
    text += `Evasion: *${rpg.evasion}%*\n`;
    text += `Accuracy: *${rpg.accuracy}%*\n`;
    text += `Lifesteal: *${rpg.lifesteal}%*\n`;
    text += `Penetration: *${rpg.penetration}%*\n\n`;
    text += `*LUCK & BONUS*\n`;
    text += `Luck: *${rpg.luck}*\n`;
    text += `Drop Bonus: *${rpg.dropBonus}%*\n`;
    text += `Gold Find: *${rpg.goldFind}%*\n`;
    text += `EXP Bonus: *${rpg.expBonus}%*\n\n`;
    text += `*PROFESSION*\n`;
    text += `Job: *${job.name}* (${rpg.job})\n`;
    text += `Job Lv: *${rpg.jobLevel}* | Job EXP: *${rpg.jobExp}/${rpg.jobExpNext}*\n`;
    text += `Skill Points: *${rpg.skillPoints}*\n`;
    text += `Skills: *${(rpg.skills || []).length}*\n\n`;
    text += `*EQUIPMENT*\n`;
    text += `Weapon: *${rpg.equipWeapon ? rpg.equipWeapon.name + " +" + rpg.equipWeapon.enchant : "Kosong"}*\n`;
    text += `Armor: *${rpg.equipArmor ? rpg.equipArmor.name + " +" + rpg.equipArmor.enchant : "Kosong"}*\n`;
    text += `Helmet: *${rpg.equipHelmet ? rpg.equipHelmet.name + " +" + rpg.equipHelmet.enchant : "Kosong"}*\n`;
    text += `Boots: *${rpg.equipBoots ? rpg.equipBoots.name + " +" + rpg.equipBoots.enchant : "Kosong"}*\n`;
    text += `Accessory: *${rpg.equipAccessory ? rpg.equipAccessory.name + " +" + rpg.equipAccessory.enchant : "Kosong"}*\n`;
    text += `Ring: *${rpg.equipRing ? rpg.equipRing.name + " +" + rpg.equipRing.enchant : "Kosong"}*\n`;
    text += `Shield: *${rpg.equipShield ? rpg.equipShield.name + " +" + rpg.equipShield.enchant : "Kosong"}*\n\n`;
    text += `*RECORDS*\n`;
    text += `PvP: *${rpg.pvpWins}W / ${rpg.pvpLosses}L*\n`;
    text += `PvP Rating: *${rpg.pvpRating}*\n`;
    text += `PvP Streak: *${rpg.pvpStreak}* (Best: *${rpg.pvpBestStreak}*)\n`;
    text += `Total Kills: *${rpg.totalKills}*\n`;
    text += `Boss Kills: *${rpg.bossKills}*\n`;
    text += `Dungeon Clears: *${rpg.dungeonClears}*\n\n`;
    text += `*SOCIAL*\n`;
    text += `Guild: *${rpg.guildId ? "Ya (" + rpg.guildRank + ")" : "Tidak ada"}*\n`;
    text += `Couple: *${rpg.coupleName || "Jomblo"}*\n`;
    text += `Married: *${rpg.married ? rpg.marriedName : "Belum"}*\n`;
    text += `Friends: *${(rpg.friends || []).length}*\n\n`;
    text += `*MISC*\n`;
    text += `Daily Streak: *${rpg.dailyStreak} hari*\n`;
    text += `Achievements: *${(rpg.achievements || []).length}* (Points: *${rpg.achievementPoints}*)\n`;
    text += `Inventory: *${Object.keys(rpg.inventory || {}).length} jenis item*\n`;
    text += `RPG Created: *${rpg.createdAt ? new Date(rpg.createdAt).toLocaleDateString("id-ID") : "Unknown"}*\n`;
    return text;
  } catch (e) { return `Error: ${e}`; }
}
