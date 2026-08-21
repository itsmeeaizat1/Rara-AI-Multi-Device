// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraHeader,
  separator,
  tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgdashfeature",
  alias: [
    "dashboardautohunt", "dbautohunt",
    "dashboardkingdom", "dbkingdom",
    "dashboarddarkmarket", "dbdarkmarket",
    "dashboardpetevolve", "dbpetevolve",
    "dashboardexpedition", "dbexpedition",
    "dashboarddungeon", "dbdungeon",
    "dashboardboss", "dbboss",
    "dashboardgacha", "dbgacha",
    "dashboardbreeding", "dbbreeding",
    "dashboardenchant", "dbenchant",
    "dashboardtreasure", "dbtreasure",
  ],
  category: "rpg",
  description: "Dashboard detail per fitur premium RPG",
  usage: ".dbautohunt / .dbkingdom / .dbdarkmarket / dll",
  example: ".dbautohunt",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ─── AUTOHUNT ───
const AUTOHUNT_MONSTERS = [
  { name: "Slime", hp: 50, gold: 30, exp: 20, dmg: 5 },
  { name: "Goblin", hp: 80, gold: 50, exp: 35, dmg: 10 },
  { name: "Wolf", hp: 120, gold: 80, exp: 50, dmg: 15 },
  { name: "Orc", hp: 200, gold: 150, exp: 80, dmg: 25 },
  { name: "Troll", hp: 150, gold: 100, exp: 60, dmg: 20 },
  { name: "Skeleton", hp: 90, gold: 60, exp: 40, dmg: 12 },
  { name: "Dark Knight", hp: 250, gold: 200, exp: 100, dmg: 30 },
  { name: "Dragon", hp: 500, gold: 500, exp: 200, dmg: 50 },
  { name: "Bandit", hp: 70, gold: 40, exp: 25, dmg: 8 },
  { name: "Giant Spider", hp: 110, gold: 70, exp: 45, dmg: 14 },
  { name: "Ice Golem", hp: 300, gold: 250, exp: 120, dmg: 35 },
  { name: "Fire Imp", hp: 60, gold: 35, exp: 22, dmg: 7 },
];

// ─── KINGDOM ───
const KINGDOM_BUILDINGS = [
  { name: "Farm", emoji: "🌾", desc: "Produksi makanan", resource: "food", cost: 2000, prod: 50, max: 10 },
  { name: "Mine", emoji: "⛏️", desc: "Produksi emas", resource: "gold", cost: 5000, prod: 100, max: 10 },
  { name: "Lumber Mill", emoji: "🪥", desc: "Produksi kayu", resource: "wood", cost: 1500, prod: 40, max: 10 },
  { name: "Barrack", emoji: "🏰", desc: "Latih pasukan", resource: "army", cost: 8000, prod: 20, max: 10 },
  { name: "Treasury", emoji: "🏦", desc: "Simpanan emas + bonus", resource: "storage", cost: 10000, prod: 0, max: 10 },
  { name: "Market", emoji: "🏪", desc: "Pendapatan pasif koin", resource: "coin", cost: 6000, prod: 200, max: 10 },
];

// ─── DARKMARKET ───
const DARKMARKET_ITEMS = [
  { name: "Crystal Biasa", emoji: "💎", price: 3000, max: 10 },
  { name: "Crystal Langka", emoji: "🔷", price: 8000, max: 8 },
  { name: "Crystal Epic", emoji: "🟣", price: 20000, max: 6 },
  { name: "Crystal Legendary", emoji: "🟡", price: 50000, max: 4 },
  { name: "Crystal Mythic", emoji: "🔴", price: 120000, max: 3 },
  { name: "Essence Magic", emoji: "✨", price: 6000, max: 8 },
  { name: "Dragon Scale", emoji: "🐲", price: 25000, max: 5 },
  { name: "Phoenix Feather", emoji: "🔥", price: 40000, max: 4 },
  { name: "Soul Stone", emoji: "👻", price: 35000, max: 4 },
  { name: "Rare Potion", emoji: "🧪", price: 500, max: 15 },
  { name: "Elixir", emoji: "⚗️", price: 3000, max: 10 },
  { name: "Mithril Ore", emoji: "⚔️", price: 15000, max: 6 },
  { name: "Ancient Scroll", emoji: "📜", price: 18000, max: 5 },
  { name: "Dark Orb", emoji: "🔮", price: 22000, max: 5 },
  { name: "Holy Water", emoji: "💧", price: 2500, max: 12 },
];

// ─── PETEVOLVE ───
const PETEVOLVE_TIERS = [
  { name: "Normal", emoji: "⚪", mult: "1.0x" },
  { name: "Rare", emoji: "🔵", mult: "1.5x" },
  { name: "Epic", emoji: "🟣", mult: "2.0x" },
  { name: "Legendary", emoji: "🟡", mult: "3.0x" },
  { name: "Mythic", emoji: "🔴", mult: "5.0x" },
];
const PETEVOLVE_REQS = [
  { from: "Normal", to: "Rare", gold: 5000, petLevel: 5, items: "Crystal Biasa x3" },
  { from: "Rare", to: "Epic", gold: 15000, petLevel: 15, items: "Crystal Langka x5, Essence Magic x2" },
  { from: "Epic", to: "Legendary", gold: 50000, petLevel: 30, items: "Crystal Epic x10, Dragon Scale x3" },
  { from: "Legendary", to: "Mythic", gold: 150000, petLevel: 50, items: "Crystal Mythic x20, Phoenix Feather x5, Soul Stone x3" },
];

// ─── EXPEDITION ───
const EXPEDITIONS = [
  { name: "Hutan Laba-laba", emoji: "🌲", duration: "30 min", minLevel: 1, exp: 100, rewards: "Wood, Herb, Mushroom" },
  { name: "Gua Kelelawar", emoji: "🍀", duration: "60 min", minLevel: 5, exp: 200, rewards: "Iron, Gold, Gem" },
  { name: "Samudra Kraken", emoji: "🌊", duration: "90 min", minLevel: 10, exp: 300, rewards: "Fish, Pearl, Sea Gem" },
  { name: "Gunung Naga", emoji: "🌋", duration: "2 jam", minLevel: 15, exp: 400, rewards: "Lava, Dragon Scale, Titan Core" },
  { name: "Reruntuhan Kuno", emoji: "🏛", duration: "3 jam", minLevel: 20, exp: 600, rewards: "Ancient Coin, Relic, Mystery Box" },
];

// ─── DUNGEON ───
const DUNGEONS = [
  { name: "Forest Dungeon", emoji: "🌲", difficulty: "Easy", loot: "Wooden Sword" },
  { name: "Fire Cave", emoji: "🔥", difficulty: "Medium", loot: "Fire Ring" },
  { name: "Ice Castle", emoji: "🦍", difficulty: "Hard", loot: "Ice Armor" },
  { name: "Dark Abyss", emoji: "💀", difficulty: "Hell", loot: "Dark Blade" },
];

// ─── BOSS ───
const BOSS_INFO = {
  cooldown: "5 menit",
  damageRange: "50 - 350",
  groupOnly: true,
  rewards: "Gold + EXP berdasarkan damage",
};

// ─── GACHA ───
const GACHA_TIERS = [
  { name: "Common", emoji: "⚪", rate: "60%" },
  { name: "Uncommon", emoji: "🟢", rate: "25%" },
  { name: "Rare", emoji: "🔵", rate: "10%" },
  { name: "Epic", emoji: "🟣", rate: "4%" },
  { name: "Legendary", emoji: "🟡", rate: "1%" },
];

// ─── TREASURE ───
const TREASURE_CHESTS = [
  { name: "Wooden Chest", emoji: "📦", gold: "50-200", exp: "30-80", rarity: "Common" },
  { name: "Iron Chest", emoji: "🗃️", gold: "150-500", exp: "80-150", rarity: "Uncommon" },
  { name: "Gold Chest", emoji: "🎁", gold: "400-1200", exp: "150-300", rarity: "Rare" },
  { name: "Diamond Chest", emoji: "💎", gold: "1000-3000", exp: "300-600", rarity: "Epic" },
];

// ─── HANDLER ───
async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const usedCmd = (m.command || "").toLowerCase();
    let text = "";

    if (usedCmd === "dashboardautohunt" || usedCmd === "dbautohunt") {
      text = dashAutohunt(prefix);
    } else if (usedCmd === "dashboardkingdom" || usedCmd === "dbkingdom") {
      text = dashKingdom(prefix);
    } else if (usedCmd === "dashboarddarkmarket" || usedCmd === "dbdarkmarket") {
      text = dashDarkmarket(prefix);
    } else if (usedCmd === "dashboardpetevolve" || usedCmd === "dbpetevolve") {
      text = dashPetevolve(prefix);
    } else if (usedCmd === "dashboardexpedition" || usedCmd === "dbexpedition") {
      text = dashExpedition(prefix);
    } else if (usedCmd === "dashboarddungeon" || usedCmd === "dbdungeon") {
      text = dashDungeon(prefix);
    } else if (usedCmd === "dashboardboss" || usedCmd === "dbboss") {
      text = dashBoss(prefix);
    } else if (usedCmd === "dashboardgacha" || usedCmd === "dbgacha") {
      text = dashGacha(prefix);
    } else if (usedCmd === "dashboardbreeding" || usedCmd === "dbbreeding") {
      text = dashBreeding(prefix);
    } else if (usedCmd === "dashboardenchant" || usedCmd === "dbenchant") {
      text = dashEnchant(prefix);
    } else if (usedCmd === "dashboardtreasure" || usedCmd === "dbtreasure") {
      text = dashTreasure(prefix);
    } else {
      return m.reply(
        "Dashboard fitur tidak ditemukan.\n\nTersedia:\n" +
        prefix + "dbautohunt\n" +
        prefix + "dbkingdom\n" +
        prefix + "dbdarkmarket\n" +
        prefix + "dbpetevolve\n" +
        prefix + "dbexpedition\n" +
        prefix + "dbdungeon\n" +
        prefix + "dbboss\n" +
        prefix + "dbgacha\n" +
        prefix + "dbbreeding\n" +
        prefix + "dbenchant\n" +
        prefix + "dbtreasure\n"
      );
    }

    await sendReplyWithNav(sock, m, text, "rpgdashfeature");
  } catch (error) {
    await m.reply("Error: " + error.message);
  }
  return { handled: true };
}

// ─── DASHBOARD FUNCTIONS ───

function dashAutohunt(prefix) {
  let text = claraWrap("Dashboard Autohunt", "🎯") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "autohunt*", "  ┊  ➶ Alias: *" + prefix + "ahunt, " + prefix + "autoburu*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *5 menit*", "  ┊  ➶ Stamina/hunt: *15*", "  ┊  ➶ Total hunt: *5x berturut*", "  ┊  ➶ Min HP: *20%* (auto heal)"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "DAFTAR MONSTER\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const mon of AUTOHUNT_MONSTERS) {
    text += num + ". " + mon.name + "\n";
    text += "   HP: " + mon.hp + " | Gold: " + mon.gold + " | EXP: " + mon.exp + " | DMG: " + mon.dmg + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "autohunt untuk mulai berburu");
  return text;
}

function dashKingdom(prefix) {
  let text = claraWrap("Dashboard Kingdom", "🏰") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "kingdom*", "  ┊  ➶ Alias: *" + prefix + "kerajaan, " + prefix + "build*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *10 detik*", "  ┊  ➶ Max level: *10 per bangunan*", "  ┊  ➶ Upgrade cost: *base x (level+1) x 1.5*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "DAFTAR BANGUNAN\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const b of KINGDOM_BUILDINGS) {
    text += num + ". " + b.emoji + " " + b.name + "\n";
    text += "   " + b.desc + "\n";
    text += "   Resource: " + b.resource + " | Cost: " + b.cost + " | Prod: " + b.prod + "/jam | Max: " + b.max + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += "SUBCOMMAND:\n";
  text += prefix + "kingdom — Lihat status kerajaan\n";
  text += prefix + "kingdom build <nama> — Bangun baru\n";
  text += prefix + "kingdom upgrade <nama> — Upgrade level\n";
  text += prefix + "kingdom collect — Kumpulkan resource\n\n";
  text += tipText("Ketik " + prefix + "kingdom untuk mulai");
  return text;
}

function dashDarkmarket(prefix) {
  let text = claraWrap("Dashboard Darkmarket", "🔮") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "darkmarket*", "  ┊  ➶ Alias: *" + prefix + "pasargelap*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *10 detik*", "  ┊  ➶ Stok: *8-10 item random*", "  ┊  ➶ Restock: *Setiap 6 jam*", "  ┊  ➶ Discount: *20%-60% lebih murah*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "DAFTAR ITEM POOL\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const item of DARKMARKET_ITEMS) {
    text += num + ". " + item.emoji + " " + item.name + "\n";
    text += "   Base: " + item.price + " gold | Max stok: " + item.max + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += "SUBCOMMAND:\n";
  text += prefix + "darkmarket — Lihat stok hari ini\n";
  text += prefix + "darkmarket buy <item> — Beli item\n\n";
  text += tipText("Stok berubah tiap 6 jam! Cek sekarang");
  return text;
}

function dashPetevolve(prefix) {
  let text = claraWrap("Dashboard Petevolve", "🐉") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "petevolve*", "  ┊  ➶ Alias: *" + prefix + "petevolusi, " + prefix + "evolvepet*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *10 detik*", "  ┊  ➶ Max tier: *Mythic (5.0x stats)*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "TIER PROGRESSION\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const t of PETEVOLVE_TIERS) {
    text += num + ". " + t.emoji + " " + t.name + " — " + t.mult + " stats\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += "REQUIREMENT EVOLUSI\n";
  text += separator("━", 30) + "\n\n";
  let num2 = 1;
  for (const r of PETEVOLVE_REQS) {
    text += num2 + ". " + r.from + " -> " + r.to + "\n";
    text += "   Gold: " + r.gold + " | Pet Lv: " + r.petLevel + "\n";
    text += "   Items: " + r.items + "\n";
    num2++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += "SUBCOMMAND:\n";
  text += prefix + "petevolve — Cek status evolusi\n";
  text += prefix + "petevolve go — Mulai evolusi\n\n";
  text += tipText("Ketik " + prefix + "petevolve untuk cek status");
  return text;
}

function dashExpedition(prefix) {
  let text = claraWrap("Dashboard Expedition", "🌲") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "expedition*", "  ┊  ➶ Alias: *" + prefix + "ekspedisi, " + prefix + "exp*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *10 detik*", "  ┊  ➶ Mode: *Passive (otomatis)*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "DAFTAR EKSPEDISI\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const exp of EXPEDITIONS) {
    text += num + ". " + exp.emoji + " " + exp.name + "\n";
    text += "   Durasi: " + exp.duration + " | Min Lv: " + exp.minLevel + " | EXP: " + exp.exp + "\n";
    text += "   Rewards: " + exp.rewards + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += "SUBCOMMAND:\n";
  text += prefix + "expedition start <lokasi> — Mulai ekspedisi\n";
  text += prefix + "expedition status — Cek progress\n";
  text += prefix + "expedition claim — Klaim hasil\n\n";
  text += tipText("Ketik " + prefix + "expedition untuk mulai");
  return text;
}

function dashDungeon(prefix) {
  let text = claraWrap("Dashboard Dungeon", "🕳️") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "dungeon*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Reward: *Loot langka (equipment)*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "DAFTAR DUNGEON\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const dg of DUNGEONS) {
    text += num + ". " + dg.emoji + " " + dg.name + "\n";
    text += "   Difficulty: " + dg.difficulty + " | Loot: " + dg.loot + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "dungeon untuk masuk");
  return text;
}

function dashBoss(prefix) {
  let text = claraWrap("Dashboard Boss Raid", "👹") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "boss*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *" + BOSS_INFO.cooldown + "*", "  ┊  ➶ Damage: *" + BOSS_INFO.damageRange + "*", "  ┊  ➶ Mode: *Grup only*", "  ┊  ➶ Reward: *" + BOSS_INFO.rewards + "*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "CARA KERJA\n";
  text += separator("━", 30) + "\n\n";
  text += "1. Ketik " + prefix + "boss di grup\n";
  text += "2. Bot spawn boss dengan HP acak\n";
  text += "3. Semua member bisa serang\n";
  text += "4. Yang deal damage terbesar dapat loot\n";
  text += "5. Boss kalah = semua yang ikut dapat reward\n\n";
  text += separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "boss di grup untuk mulai raid");
  return text;
}

function dashGacha(prefix) {
  let text = claraWrap("Dashboard Gacha", "🎯") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "gacha*", "  ┊  ➶ Alias: *" + prefix + "pull, " + prefix + "summon*", "  ┊  ➶ Premium: *Wajib 💎*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "TIER & DROP RATE\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const t of GACHA_TIERS) {
    text += num + ". " + t.emoji + " " + t.name + " — " + t.rate + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "gacha untuk pull");
  return text;
}

function dashBreeding(prefix) {
  let text = claraWrap("Dashboard Breeding", "🐾") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "breeding*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *1 jam*", "  ┊  ➶ Result: *Pet baru dari kombinasi 2 pet*", "  ┊  ➶ Risk: *Gagal = kehilangan 1 parent*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "CARA KERJA\n";
  text += separator("━", 30) + "\n\n";
  text += "1. Pastikan punya 2 pet\n";
  text += "2. Ketik " + prefix + "breeding <pet1> <pet2>\n";
  text += "3. Tunggu cooldown 1 jam\n";
  text += "4. Dapat pet baru dari kombinasi parent\n\n";
  text += separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "breeding untuk mulai");
  return text;
}

function dashEnchant(prefix) {
  let text = claraWrap("Dashboard Enchant", "✨") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "enchant*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *10 detik*", "  ┊  ➶ Bonus: *+1% sampai +10% stats*", "  ┊  ➶ Cost: *Crystal + Gold*", "  ┊  ➶ Target: *Equipment (Weapon, Armor, Accessory)*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "CARA KERJA\n";
  text += separator("━", 30) + "\n\n";
  text += "1. Punya equipment di inventory\n";
  text += "2. Punya Crystal + Gold untuk biaya\n";
  text += "3. Ketik " + prefix + "enchant <equipment>\n";
  text += "4. Dapat bonus +1% sampai +10% stats\n\n";
  text += separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "enchant untuk upgrade equipment");
  return text;
}

function dashTreasure(prefix) {
  let text = claraWrap("Dashboard Treasure", "📜") + "\n\n";
  text += claraWrap("INFO", ["  ┊  ➶ Command: *" + prefix + "treasure*", "  ┊  ➶ Alias: *" + prefix + "chest, " + prefix + "peti*", "  ┊  ➶ Premium: *Wajib 💎*", "  ┊  ➶ Cooldown: *30 detik*"].join("\n")) + "\n\n";
  text += separator("━", 30) + "\n";
  text += "DAFTAR CHEST\n";
  text += separator("━", 30) + "\n\n";
  let num = 1;
  for (const c of TREASURE_CHESTS) {
    text += num + ". " + c.emoji + " " + c.name + "\n";
    text += "   Gold: " + c.gold + " | EXP: " + c.exp + " | Rarity: " + c.rarity + "\n";
    num++;
  }
  text += "\n" + separator("━", 30) + "\n";
  text += tipText("Ketik " + prefix + "treasure untuk buka chest");
  return text;
}

export { pluginConfig as config, handler };
