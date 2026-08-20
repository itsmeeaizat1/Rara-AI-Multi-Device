// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Genesis — Ciptakan dunia sendiri, bangun kerajaan dari nol
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpggenesis",
  alias: ["genesisrpg", "ciptadunia", "bangunkerajaan", "kerajaanrpg", "duniacipta"],
  category: "rpg",
  description: "RPG Genesis — Ciptakan dunia, bangun kerajaan, generate income pasif",
  usage: ".rpggenesis — Lihat kerajaan kamu\n.rpggenesis create <nama> — Ciptakan dunia baru\n.rpggenesis build <id> — Bangun struktur\n.rpggenesis upgrade <id> — Upgrade struktur\n.rpggenesis collect — Kumpul income kerajaan\n.rpggenesis info — Statistik",
  example: ".rpggenesis create Avalon\n.rpggenesis build house",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CREATE_COST = 10000;
const MIN_LEVEL = 10;

const STRUCTURES = [
  { id: "house", name: "Rumah", emoji: "🏠", basePrice: 2000, baseIncome: 100, maxLevel: 10, desc: "Rumah penduduk" },
  { id: "farm", name: "Ladang", emoji: "🌾", basePrice: 3000, baseIncome: 200, maxLevel: 10, desc: "Sumber makanan" },
  { id: "market", name: "Pasar", emoji: "🏬", basePrice: 8000, baseIncome: 500, maxLevel: 10, desc: "Pusat dagang" },
  { id: "barracks", name: "Barak", emoji: "⚔️", basePrice: 15000, baseIncome: 1000, maxLevel: 10, desc: "Pasukan" },
  { id: "temple", name: "Candi", emoji: "🏛️", basePrice: 30000, baseIncome: 2000, maxLevel: 10, desc: "Tempat ibadah" },
  { id: "castle", name: "Istana", emoji: "🏰", basePrice: 100000, baseIncome: 8000, maxLevel: 10, desc: "Pusat kerajaan" },
];

function getStructureIncome(struct, level) {
  return Math.round(struct.baseIncome * level);
}
function getUpgradeCost(struct, currentLevel) {
  return Math.round(struct.basePrice * (currentLevel + 1) * 0.5);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Genesis", [
        "CIPTA DUNIA",
        "Bangun kerajaan dari nol, dapat income pasif!",
        "Min Level: " + MIN_LEVEL + " | Biaya cipta: " + CREATE_COST + "g",
        "",
        "PERINTAH:",
        usedPrefix + "rpggenesis create <nama> — Ciptakan dunia",
        usedPrefix + "rpggenesis build <id> — Bangun struktur",
        usedPrefix + "rpggenesis upgrade <id> — Upgrade",
        usedPrefix + "rpggenesis collect — Kumpul income",
        usedPrefix + "rpggenesis info — Statistik",
        "",
        "STRUKTUR:",
        "🏠 Rumah 2Kg/100g | 🌾 Ladang 3Kg/200g",
        "🏬 Pasar 8Kg/500g | ⚔️ Barak 15Kg/1Kg",
        "🏛️ Candi 30Kg/2Kg | 🏰 Istana 100Kg/8Kg",
      ], "info"));
    }

    if (action === "create") {
      const worldName = args.slice(1).join(" ") || "Dunia Tanpa Nama";

      if ((player.level || 0) < MIN_LEVEL) {
        return m.reply(claraWrap("RPG Genesis", "Level belum cukup! Butuh: " + MIN_LEVEL, "warn"));
      }
      if (player.genesis) {
        return m.reply(claraWrap("RPG Genesis", "Sudah punya dunia: " + player.genesis.name, "warn"));
      }
      if ((player.gold || 0) < CREATE_COST) {
        return m.reply(claraWrap("RPG Genesis", "Gold kurang! Butuh: " + CREATE_COST, "warn"));
      }

      addGold(m, -CREATE_COST);
      player.genesis = {
        name: worldName,
        structures: {},
        lastCollect: Date.now(),
        createdAt: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Genesis", [
        "DUNIA CIPTA!",
        "Nama: " + worldName,
        "Biaya: " + CREATE_COST + " gold",
        "",
        "Mulai dengan bangun struktur:",
        usedPrefix + "rpggenesis build house",
        "",
        "Income pasif terkumpul otomatis!",
      ], "info"));
    }

    if (!player.genesis) {
      return m.reply(claraWrap("RPG Genesis", [
        "Belum punya dunia!",
        "Cipta: " + usedPrefix + "rpggenesis create <nama>",
      ], "warn"));
    }

    const world = player.genesis;

    if (action === "build") {
      const structId = args[1]?.toLowerCase();
      const struct = STRUCTURES.find(s => s.id === structId);

      if (!struct) return m.reply(claraWrap("RPG Genesis", "Struktur tidak ditemukan", "warn"));
      if (world.structures[struct.id]) return m.reply(claraWrap("RPG Genesis", struct.name + " sudah dibangun. Upgrade: " + usedPrefix + "rpggenesis upgrade " + struct.id, "warn"));
      if ((player.gold || 0) < struct.basePrice) return m.reply(claraWrap("RPG Genesis", "Gold kurang! Butuh: " + struct.basePrice, "warn"));

      addGold(m, -struct.basePrice);
      world.structures[struct.id] = { level: 1, builtAt: Date.now() };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Genesis", [
        "DIBANGUN!",
        struct.emoji + " " + struct.name + " Lv.1",
        "Biaya: " + struct.basePrice + "g | Income: " + getStructureIncome(struct, 1) + "g/hari",
        "",
        "Upgrade: " + usedPrefix + "rpggenesis upgrade " + struct.id,
      ], "info"));
    }

    if (action === "upgrade") {
      const structId = args[1]?.toLowerCase();
      const struct = STRUCTURES.find(s => s.id === structId);

      if (!struct || !world.structures[struct.id]) {
        return m.reply(claraWrap("RPG Genesis", "Struktur belum dimiliki", "warn"));
      }

      const current = world.structures[struct.id];
      if (current.level >= struct.maxLevel) {
        return m.reply(claraWrap("RPG Genesis", struct.name + " sudah max level!", "warn"));
      }

      const upCost = getUpgradeCost(struct, current.level);
      if ((player.gold || 0) < upCost) {
        return m.reply(claraWrap("RPG Genesis", "Gold kurang! Butuh: " + upCost, "warn"));
      }

      addGold(m, -upCost);
      world.structures[struct.id].level = current.level + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Genesis", [
        "UPGRADE!",
        struct.emoji + " " + struct.name + " Lv." + current.level + " -> " + (current.level + 1),
        "Biaya: " + upCost + "g | Income: " + getStructureIncome(struct, current.level + 1) + "g/hari",
      ], "info"));
    }

    if (action === "collect") {
      const now = Date.now();
      const elapsedDays = (now - (world.lastCollect || now)) / (24 * 60 * 60 * 1000);
      let totalIncome = 0;
      const details = [];

      Object.entries(world.structures).forEach(([id, data]) => {
        const struct = STRUCTURES.find(s => s.id === id);
        if (!struct) return;
        const income = Math.round(getStructureIncome(struct, data.level) * elapsedDays);
        if (income > 0) {
          totalIncome += income;
          details.push(struct.emoji + " " + struct.name + " Lv." + data.level + ": +" + income);
        }
      });

      if (totalIncome <= 0) {
        world.lastCollect = now;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Genesis", [
          "Belum ada income terkumpul",
          "Kembali lagi nanti!",
        ], "warn"));
      }

      addGold(m, totalIncome);
      addExp(m, Math.round(totalIncome * 0.02));
      world.lastCollect = now;
      savePlayer(m, player);

      details.push("");
      details.push("Total: +" + totalIncome + " gold");
      details.push("Exp: +" + Math.round(totalIncome * 0.02));

      return m.reply(claraWrap("RPG Genesis", details, "info"));
    }

    // Default: show kingdom
    const structCount = Object.keys(world.structures).length;
    const lines = [
      "KERAJAAN: " + world.name,
      "Struktur: " + structCount + "/" + STRUCTURES.length,
      "",
    ];

    if (structCount === 0) {
      lines.push("Belum ada struktur!");
      lines.push("Bangun: " + usedPrefix + "rpggenesis build house");
    } else {
      let totalDaily = 0;
      Object.entries(world.structures).forEach(([id, data]) => {
        const struct = STRUCTURES.find(s => s.id === id);
        if (!struct) return;
        const income = getStructureIncome(struct, data.level);
        totalDaily += income;
        lines.push(struct.emoji + " " + struct.name + " Lv." + data.level + " (" + income + "g/hari)");
      });
      lines.push("");
      lines.push("Total income: " + totalDaily + "g/hari");
    }

    lines.push("");
    lines.push("Kumpul: " + usedPrefix + "rpggenesis collect");

    return m.reply(claraWrap("RPG Genesis", lines, "info"));
  } catch (e) {
    console.error("[RpgGenesis]", e);
    return m.reply(claraWrap("RPG Genesis", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
