// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Greenhouse — Rumah kaca, tanam tanaman langka untuk passive income
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpggreenhouse",
  alias: ["greenhouserpg", "rumahkaca", "tanamlangka", "kebunlangka", "kaca"],
  category: "rpg",
  description: "RPG Greenhouse — Tanam tanaman langka untuk passive income",
  usage: ".rpggreenhouse — Lihat rumah kaca\n.rpggreenhouse plant <id> — Tanam benih\n.rpggreenhouse harvest — Panen semua\n.rpggreenhouse shop — Beli benih\n.rpggreenhouse sell <id> — Jual hasil panen",
  example: ".rpggreenhouse shop\n.rpggreenhouse plant orchid\n.rpggreenhouse harvest",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MAX_PLOTS = 6;

const SEEDS = [
  { id: "orchid", name: "Anggrek", emoji: "🌸", seedPrice: 1000, sellPrice: 5000, growTime: 30 * 60 * 1000, exp: 50, rarity: "rare" },
  { id: "rose", name: "Mawar Hitam", emoji: "🌹", seedPrice: 2000, sellPrice: 10000, growTime: 60 * 60 * 1000, exp: 100, rarity: "rare" },
  { id: "lily", name: "Bunga Lily", emoji: "🌷", seedPrice: 500, sellPrice: 3000, growTime: 20 * 60 * 1000, exp: 30, rarity: "common" },
  { id: "bonsai", name: "Bonsai", emoji: "🪴", seedPrice: 5000, sellPrice: 25000, growTime: 120 * 60 * 1000, exp: 300, rarity: "epic" },
  { id: "crystal", name: "Bunga Kristal", emoji: "💎", seedPrice: 10000, sellPrice: 50000, growTime: 180 * 60 * 1000, exp: 500, rarity: "legendary" },
  { id: "sage", name: "Sage", emoji: "🌿", seedPrice: 300, sellPrice: 1500, growTime: 15 * 60 * 1000, exp: 20, rarity: "common" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Greenhouse", [
        "RUMAH KACA",
        "Tanam tanaman langka, panen untuk gold besar",
        "Plot: " + MAX_PLOTS + " | Tanam -> tunggu -> panen",
        "",
        "PERINTAH:",
        usedPrefix + "rpggreenhouse shop - Beli & tanam benih",
        usedPrefix + "rpggreenhouse plant <id> - Tanam benih",
        usedPrefix + "rpggreenhouse harvest - Panen semua",
        usedPrefix + "rpggreenhouse sell <id> - Jual hasil",
        usedPrefix + "rpggreenhouse - Lihat kebun",
      ], "info"));
    }

    if (action === "shop") {
      const lines = ["TOKO BENIH RUMAH KACA", ""];
      SEEDS.forEach(seed => {
        lines.push(seed.emoji + " " + seed.name + " (" + seed.id + ")");
        lines.push("   Benih: " + seed.seedPrice + "g | Jual: " + seed.sellPrice + "g");
        lines.push("   Tumbuh: " + Math.round(seed.growTime / 60000) + " menit | Exp: " + seed.exp);
      });
      lines.push("");
      lines.push("Tanam: " + usedPrefix + "rpggreenhouse plant <id>");
      return m.reply(claraWrap("RPG Greenhouse", lines, "info"));
    }

    if (action === "plant") {
      const seedId = args[1]?.toLowerCase();
      const seed = SEEDS.find(s => s.id === seedId);

      if (!seed) return m.reply(claraWrap("RPG Greenhouse", "Benih tidak ditemukan", "warn"));

      if (!player.greenhouse) player.greenhouse = [];
      if (player.greenhouse.length >= MAX_PLOTS) {
        return m.reply(claraWrap("RPG Greenhouse", "Plot penuh! (" + MAX_PLOTS + " max). Panen dulu.", "warn"));
      }

      if ((player.gold || 0) < seed.seedPrice) {
        return m.reply(claraWrap("RPG Greenhouse", "Gold kurang! Butuh: " + seed.seedPrice, "warn"));
      }

      addGold(m, -seed.seedPrice);
      player.greenhouse.push({
        id: seed.id,
        name: seed.name,
        emoji: seed.emoji,
        plantedAt: Date.now(),
        growTime: seed.growTime,
        sellPrice: seed.sellPrice,
        exp: seed.exp,
      });
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Greenhouse", [
        "Ditanam!",
        seed.emoji + " " + seed.name,
        "Biaya benih: " + seed.seedPrice + " gold",
        "Tumbuh dalam: " + Math.round(seed.growTime / 60000) + " menit",
        "Jual harga: " + seed.sellPrice + " gold",
        "",
        "Plot: " + player.greenhouse.length + "/" + MAX_PLOTS,
        "Panen: " + usedPrefix + "rpggreenhouse harvest",
      ], "info"));
    }

    if (action === "harvest") {
      if (!player.greenhouse || player.greenhouse.length === 0) {
        return m.reply(claraWrap("RPG Greenhouse", "Rumah kaca kosong! Tanam dulu.", "warn"));
      }

      const ready = [];
      const notReady = [];

      player.greenhouse.forEach((plant, idx) => {
        const elapsed = Date.now() - plant.plantedAt;
        if (elapsed >= plant.growTime) {
          ready.push({ ...plant, index: idx });
        } else {
          notReady.push({ ...plant, remaining: Math.round((plant.growTime - elapsed) / 60000) });
        }
      });

      if (ready.length === 0) {
        const lines = ["Belum ada tanaman siap panen!", ""];
        notReady.forEach(p => {
          lines.push(p.emoji + " " + p.name + " - " + p.remaining + " menit lagi");
        });
        return m.reply(claraWrap("RPG Greenhouse", lines, "warn"));
      }

      // Add harvested plants to inventory
      if (!player.harvested) player.harvested = {};
      let totalExp = 0;

      // Remove from greenhouse (reverse to avoid index issues)
      ready.sort((a, b) => b.index - a.index).forEach(r => {
        player.greenhouse.splice(r.index, 1);
        player.harvested[r.id] = (player.harvested[r.id] || 0) + 1;
        totalExp += r.exp;
      });

      addExp(m, totalExp);
      savePlayer(m, player);

      const lines = ["PANEN RUMAH KACA", ""];
      ready.forEach(r => {
        lines.push(r.emoji + " " + r.name + " (+" + r.sellPrice + "g value)");
      });
      lines.push("");
      lines.push("Total exp: +" + totalExp);
      lines.push("Tanaman disimpan. Jual: " + usedPrefix + "rpggreenhouse sell <id>");

      return m.reply(claraWrap("RPG Greenhouse", lines, "info"));
    }

    if (action === "sell") {
      const itemId = args[1]?.toLowerCase();
      if (!player.harvested || !player.harvested[itemId] || player.harvested[itemId] <= 0) {
        return m.reply(claraWrap("RPG Greenhouse", "Tidak ada " + itemId + " untuk dijual", "warn"));
      }

      const seed = SEEDS.find(s => s.id === itemId);
      if (!seed) return m.reply(claraWrap("RPG Greenhouse", "Item tidak ditemukan", "warn"));

      addGold(m, seed.sellPrice);
      player.harvested[itemId]--;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Greenhouse", [
        "Dijual!",
        seed.emoji + " " + seed.name,
        "Harga: +" + seed.sellPrice + " gold",
        "Sisa: " + (player.harvested[itemId] || 0),
      ], "info"));
    }

    // Default: show greenhouse
    if (!player.greenhouse || player.greenhouse.length === 0) {
      return m.reply(claraWrap("RPG Greenhouse", [
        "Rumah kaca kosong! (" + 0 + "/" + MAX_PLOTS + ")",
        "Tanam: " + usedPrefix + "rpggreenhouse plant <id>",
        "Shop: " + usedPrefix + "rpggreenhouse shop",
      ], "warn"));
    }

    const lines = ["RUMAH KACA (" + player.greenhouse.length + "/" + MAX_PLOTS + ")", ""];
    player.greenhouse.forEach((plant, idx) => {
      const elapsed = Date.now() - plant.plantedAt;
      const progress = Math.min(100, Math.round((elapsed / plant.growTime) * 100));
      const bar = "█".repeat(Math.round(progress / 10)) + "░".repeat(10 - Math.round(progress / 10));
      const status = progress >= 100 ? "SIAP PANEN" : progress + "%";

      lines.push((idx + 1) + ". " + plant.emoji + " " + plant.name);
      lines.push("   [" + bar + "] " + status);
    });

    const readyCount = player.greenhouse.filter(p => Date.now() - p.plantedAt >= p.growTime).length;
    lines.push("");
    lines.push(readyCount > 0 ? "Siap panen: " + readyCount + " tanaman! " + usedPrefix + "rpggreenhouse harvest" : "Belum ada siap panen");

    return m.reply(claraWrap("RPG Greenhouse", lines, "info"));
  } catch (e) {
    console.error("[RpgGreenhouse]", e);
    return m.reply(claraWrap("RPG Greenhouse", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
