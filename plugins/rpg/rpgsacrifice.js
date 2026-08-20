// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Sacrifice — Korbankan item/gold untuk blessing dewa
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgsacrifice",
  alias: ["sacrificerpg", "korban", "persembahan", "ritualsacrifice", "persembahandeawa"],
  category: "rpg",
  description: "RPG Sacrifice — Korbankan item/gold untuk blessing dewa",
  usage: ".rpgsacrifice gold <jumlah> — Korban gold\n.rpgsacrifice item <item> <jumlah> — Korban item\n.rpgsacrifice info — Statistik & blessing aktif\n.rpgsacrifice status — Cek altar",
  example: ".rpgsacrifice gold 5000\n.rpgsacrifice item diamond 2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 15,
  isEnabled: true,
};

const MIN_GOLD = 1000;
const ITEM_VALUES = {
  wood: 50, rock: 80, iron: 200, string: 100,
  diamond: 2000, emerald: 3000, gold_ore: 500,
};

const BLESSINGS = [
  { id: "fortune", name: "Blessing of Fortune", emoji: "💰", threshold: 1000, goldMult: 0.2, expMult: 0, duration: 3600, desc: "+20% gold (1 jam)" },
  { id: "wisdom", name: "Blessing of Wisdom", emoji: "📖", threshold: 2000, goldMult: 0, expMult: 0.3, duration: 3600, desc: "+30% exp (1 jam)" },
  { id: "power", name: "Blessing of Power", emoji: "⚡", threshold: 3000, goldMult: 0.15, expMult: 0.15, duration: 3600, desc: "+15% gold & exp (1 jam)" },
  { id: "divine", name: "Divine Blessing", emoji: "🌟", threshold: 5000, goldMult: 0.25, expMult: 0.25, duration: 1800, desc: "+25% semua (30 menit)" },
  { id: "eternal", name: "Eternal Blessing", emoji: "👑", threshold: 10000, goldMult: 0.5, expMult: 0.5, duration: 1800, desc: "+50% semua (30 menit) LEGENDARY" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Sacrifice", [
        "ALTAR PENGORBANAN",
        "Korbankan gold/item untuk blessing dewa",
        "Makin besar korban, makin kuat blessing",
        "",
        "BLESSING TIERS:",
        "💰 Fortune (1000+ value) +20% gold",
        "📖 Wisdom (2000+) +30% exp",
        "⚡ Power (3000+) +15% gold & exp",
        "🌟 Divine (5000+) +25% semua",
        "👑 Eternal (10000+) +50% semua LEGENDARY",
        "",
        "PERINTAH:",
        usedPrefix + "rpgsacrifice gold <jumlah>",
        usedPrefix + "rpgsacrifice item <item> <jumlah>",
        usedPrefix + "rpgsacrifice info",
      ], "info"));
    }

    if (action === "info" || action === "status") {
      const stats = player.sacrificeStats || {};
      const buff = player.sacrificeBlessing;

      const lines = [
        "STATISTIK ALTAR",
        "Total korban: " + (stats.total || 0),
        "Total value: " + (stats.totalValue || 0),
        "Blessing diterima: " + (stats.blessings || 0),
        "Eternal blessing: " + (stats.eternal || 0),
      ];

      if (buff && buff.expires > Date.now()) {
        const remaining = Math.round((buff.expires - Date.now()) / 60000);
        lines.push("");
        lines.push("BLESSING AKTIF:");
        lines.push(buff.emoji + " " + buff.name);
        lines.push(buff.desc);
        lines.push("Sisa: " + remaining + " menit");
      } else {
        lines.push("");
        lines.push("Blessing: Tidak ada");
      }

      return m.reply(claraWrap("RPG Sacrifice", lines, "info"));
    }

    if (action === "gold") {
      const amount = parseInt(args[1]) || 0;
      if (amount < MIN_GOLD) {
        return m.reply(claraWrap("RPG Sacrifice", "Min korban: " + MIN_GOLD + " gold", "warn"));
      }
      if ((player.gold || 0) < amount) {
        return m.reply(claraWrap("RPG Sacrifice", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
      }

      addGold(m, -amount);
      return processSacrifice(m, player, amount, usedPrefix);
    }

    if (action === "item") {
      const itemName = args[1]?.toLowerCase();
      const count = parseInt(args[2]) || 1;

      if (!ITEM_VALUES[itemName]) {
        return m.reply(claraWrap("RPG Sacrifice", [
          "Item tidak valid!",
          "Tersedia: " + Object.keys(ITEM_VALUES).join(", "),
        ], "warn"));
      }

      if ((player[itemName] || 0) < count) {
        return m.reply(claraWrap("RPG Sacrifice", "Punya " + itemName + ": " + (player[itemName] || 0) + ", butuh: " + count, "warn"));
      }

      player[itemName] -= count;
      const value = ITEM_VALUES[itemName] * count;
      return processSacrifice(m, player, value, usedPrefix);
    }

    return m.reply(claraWrap("RPG Sacrifice", "Perintah: gold, item, info", "warn"));
  } catch (e) {
    console.error("[RpgSacrifice]", e);
    return m.reply(claraWrap("RPG Sacrifice", "Error: " + e.message, "error"));
  }
}

function processSacrifice(m, player, value, usedPrefix) {
  // Determine blessing tier
  let blessing = null;
  for (const b of BLESSINGS) {
    if (value >= b.threshold) blessing = b;
  }

  if (!blessing) {
    addExp(m, 50);
    savePlayer(m, player);
    return m.reply(claraWrap("RPG Sacrifice", [
      "Korban diterima tapi terlalu kecil!",
      "Value: " + value,
      "Min untuk blessing: " + MIN_GOLD,
      "Consolation exp: +50",
    ], "warn"));
  }

  // 85% chance success, 15% fail
  if (Math.random() < 0.15) {
    addExp(m, Math.round(value / 20));
    savePlayer(m, player);
    return m.reply(claraWrap("RPG Sacrifice", [
      "Dewa menolak persembahan!",
      "Value: " + value + " hilang",
      "Consolation exp: +" + Math.round(value / 20),
      "",
      "Coba lagi nanti...",
    ], "warn"));
  }

  // Apply blessing
  player.sacrificeBlessing = {
    id: blessing.id,
    name: blessing.name,
    emoji: blessing.emoji,
    goldMult: blessing.goldMult,
    expMult: blessing.expMult,
    expires: Date.now() + blessing.duration * 1000,
  };

  if (!player.sacrificeStats) player.sacrificeStats = {};
  player.sacrificeStats.total = (player.sacrificeStats.total || 0) + 1;
  player.sacrificeStats.totalValue = (player.sacrificeStats.totalValue || 0) + value;
  player.sacrificeStats.blessings = (player.sacrificeStats.blessings || 0) + 1;
  if (blessing.id === "eternal") player.sacrificeStats.eternal = (player.sacrificeStats.eternal || 0) + 1;

  addExp(m, Math.round(value / 10));
  savePlayer(m, player);

  const lines = [
    "PERSEMBAHAN DITERIMA!",
    "Value: " + value,
    "",
    blessing.emoji + " " + blessing.name,
    blessing.desc,
    "Durasi: " + Math.round(blessing.duration / 60) + " menit",
    "",
    blessing.id === "eternal" ? "LEGENDARY BLESSING! 👑" : "",
  ].filter(l => l !== "");

  return m.reply(claraWrap("RPG Sacrifice", lines, "info"));
}

export { pluginConfig as config, handler };
