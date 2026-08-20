// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Tycoon — Investasi bisnis, dapat income pasif setiap hari
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgtycoon",
  alias: ["tycoonrpg", "bisnisrpg", "investasirpg", "investrpg", "usaharpg"],
  category: "rpg",
  description: "RPG Tycoon — Investasi bisnis, kumpul income pasif harian",
  usage: ".rpgtycoon — Dashboard bisnis\n.rpgtycoon buy <id> — Beli bisnis\n.rpgtycoon upgrade <id> — Upgrade level\n.rpgtycoon collect — Kumpul income\n.rpgtycoon sell <id> — Jual bisnis",
  example: ".rpgtycoon buy stall\n.rpgtycoon collect",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const BUSINESSES = [
  { id: "stall", name: "Warung", emoji: "🏪", basePrice: 5000, baseIncome: 200, maxLevel: 10, desc: "Warung kecil di pinggir jalan" },
  { id: "farm", name: "Ladang", emoji: "🌾", basePrice: 12000, baseIncome: 500, maxLevel: 10, desc: "Ladang pertanian" },
  { id: "forge", name: "Pandai Besi", emoji: "🔨", basePrice: 25000, baseIncome: 1000, maxLevel: 10, desc: "Bengkel senjata" },
  { id: "mine", name: "Tambang", emoji: "⛏️", basePrice: 50000, baseIncome: 2500, maxLevel: 10, desc: "Tambang emas" },
  { id: "market", name: "Pasar", emoji: "🏬", basePrice: 100000, baseIncome: 5000, maxLevel: 10, desc: "Pusat perdagangan" },
  { id: "castle", name: "Kastil", emoji: "🏰", basePrice: 500000, baseIncome: 25000, maxLevel: 10, desc: "Kastil penguasa" },
];

function getUpgradeCost(business, currentLevel) {
  return Math.round(business.basePrice * (currentLevel + 1) * 0.6);
}

function getIncome(business, level) {
  return Math.round(business.baseIncome * level);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      const lines = [
        "RPG TYCOON — BISNIS",
        "Beli & upgrade bisnis untuk income pasif",
        "Income terkumpul otomatis, kumpul kapan saja",
        "",
        "DAFTAR BISNIS:",
      ];
      BUSINESSES.forEach(b => {
        const owned = player.businesses?.[b.id];
        if (owned) {
          lines.push(b.emoji + " " + b.name + " Lv." + owned.level + " (Income: " + getIncome(b, owned.level) + "/hari)");
        } else {
          lines.push(b.emoji + " " + b.name + " - " + b.basePrice + " gold");
          lines.push("   Income: " + b.baseIncome + "/hari | " + b.desc);
        }
      });
      lines.push("");
      lines.push("PERINTAH:");
      lines.push(usedPrefix + "rpgtycoon buy <id> - Beli bisnis");
      lines.push(usedPrefix + "rpgtycoon upgrade <id> - Upgrade level");
      lines.push(usedPrefix + "rpgtycoon collect - Kumpul income");
      lines.push(usedPrefix + "rpgtycoon sell <id> - Jual bisnis (50%)");
      return m.reply(claraWrap("RPG Tycoon", lines, "info"));
    }

    if (action === "buy") {
      const bizId = args[1]?.toLowerCase();
      const biz = BUSINESSES.find(b => b.id === bizId);

      if (!biz) return m.reply(claraWrap("RPG Tycoon", "Bisnis tidak ditemukan", "warn"));
      if (player.businesses?.[biz.id]) return m.reply(claraWrap("RPG Tycoon", "Sudah punya " + biz.name, "warn"));
      if ((player.gold || 0) < biz.basePrice) return m.reply(claraWrap("RPG Tycoon", "Gold kurang! Butuh: " + biz.basePrice, "warn"));

      addGold(m, -biz.basePrice);
      if (!player.businesses) player.businesses = {};
      player.businesses[biz.id] = { level: 1, lastCollect: Date.now() };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Tycoon", [
        "Beli " + biz.emoji + " " + biz.name + "!",
        "Harga: " + biz.basePrice + " gold",
        "Level: 1 | Income: " + getIncome(biz, 1) + "/hari",
        "",
        "Kumpul: " + usedPrefix + "rpgtycoon collect",
      ], "info"));
    }

    if (action === "upgrade") {
      const bizId = args[1]?.toLowerCase();
      const biz = BUSINESSES.find(b => b.id === bizId);

      if (!biz || !player.businesses?.[biz.id]) {
        return m.reply(claraWrap("RPG Tycoon", "Bisnis tidak dimiliki", "warn"));
      }

      const current = player.businesses[biz.id];
      if (current.level >= biz.maxLevel) {
        return m.reply(claraWrap("RPG Tycoon", biz.name + " sudah max level!", "warn"));
      }

      const upCost = getUpgradeCost(biz, current.level);
      if ((player.gold || 0) < upCost) {
        return m.reply(claraWrap("RPG Tycoon", "Gold kurang! Upgrade: " + upCost, "warn"));
      }

      addGold(m, -upCost);
      player.businesses[biz.id].level = current.level + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Tycoon", [
        "Upgrade " + biz.emoji + " " + biz.name + "!",
        "Level: " + current.level + " -> " + (current.level + 1),
        "Biaya: " + upCost + " gold",
        "Income baru: " + getIncome(biz, current.level + 1) + "/hari",
      ], "info"));
    }

    if (action === "collect") {
      if (!player.businesses || Object.keys(player.businesses).length === 0) {
        return m.reply(claraWrap("RPG Tycoon", "Belum punya bisnis. Ketik .rpgtycoon buy <id>", "warn"));
      }

      let totalIncome = 0;
      const details = [];
      const now = Date.now();

      Object.entries(player.businesses).forEach(([id, biz]) => {
        const config = BUSINESSES.find(b => b.id === id);
        if (!config) return;

        const elapsed = (now - (biz.lastCollect || now)) / (24 * 60 * 60 * 1000); // days
        const income = Math.round(getIncome(config, biz.level) * elapsed);

        if (income > 0) {
          totalIncome += income;
          details.push(config.emoji + " " + config.name + " Lv." + biz.level + ": +" + income);
        }
        biz.lastCollect = now;
      });

      if (totalIncome <= 0) {
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Tycoon", [
          "Belum ada income untuk dikumpul",
          "Income terkumpul per hari otomatis",
          "Kembali lagi nanti!",
        ], "warn"));
      }

      addGold(m, totalIncome);
      addExp(m, Math.round(totalIncome * 0.02));
      savePlayer(m, player);

      details.push("");
      details.push("Total income: +" + totalIncome + " gold");
      details.push("Exp: +" + Math.round(totalIncome * 0.02));
      details.push("Gold: " + (player.gold || 0));

      return m.reply(claraWrap("RPG Tycoon", details, "info"));
    }

    if (action === "sell") {
      const bizId = args[1]?.toLowerCase();
      const biz = BUSINESSES.find(b => b.id === bizId);

      if (!biz || !player.businesses?.[biz.id]) {
        return m.reply(claraWrap("RPG Tycoon", "Bisnis tidak dimiliki", "warn"));
      }

      const current = player.businesses[biz.id];
      const sellPrice = Math.round(biz.basePrice * 0.5 * current.level);

      addGold(m, sellPrice);
      delete player.businesses[biz.id];
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Tycoon", [
        "Jual " + biz.emoji + " " + biz.name + " Lv." + current.level,
        "Dapat: " + sellPrice + " gold (50%)",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Tycoon", "Perintah: buy, upgrade, collect, sell", "warn"));
  } catch (e) {
    console.error("[RpgTycoon]", e);
    return m.reply(claraWrap("RPG Tycoon", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
