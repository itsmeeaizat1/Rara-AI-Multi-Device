// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rpg.js — Default stats RPG untuk user baru & owner

export const rpg = {
  // Owner default — langsung dapet stats tinggi
  ownerDefaults: {
    exp: 9000000000,
    koin: 9000000000000,
    saldo: 1000000000,
    gold: 999999999,
    gems: 999999,
    diamonds: 999999,
    tokens: 99999,
    level: 900000,
    role: "👑 Developer",
  },
  // User baru default — mulai dari 0
  userDefaults: {
    exp: 0,
    koin: 0,
    saldo: 0,
    gold: 0,
    gems: 0,
    diamonds: 0,
    tokens: 0,
  },
  // RPG combat defaults untuk user baru
  combatDefaults: {
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    energy: 100,
    maxEnergy: 100,
    stamina: 100,
    maxStamina: 100,
    atk: 10,
    def: 5,
    spd: 10,
    critRate: 5,
    critDmg: 50,
    evasion: 3,
    accuracy: 95,
    lifesteal: 0,
    penetration: 0,
  },
  // RPG luck & bonus defaults
  luckDefaults: {
    luck: 0,
    dropBonus: 0,
    goldFind: 0,
    expBonus: 0,
  },
  // RPG records defaults
  recordDefaults: {
    pvpWins: 0,
    pvpLosses: 0,
    pvpRating: 1000,
    pvpStreak: 0,
    pvpBestStreak: 0,
    totalKills: 0,
    bossKills: 0,
    dungeonClears: 0,
    dailyStreak: 0,
    achievements: [],
    achievementPoints: 0,
  },
  // RPG profession defaults
  professionDefaults: {
    job: "novice",
    jobLevel: 1,
    skillPoints: 0,
    skills: [],
  },
  EXP_PER_LEVEL: 10000,
};
