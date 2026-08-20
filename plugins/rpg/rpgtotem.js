// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Totem — Kumpulkan totem untuk bonus pasif permanen
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgtotem",
  alias: ["totemrpg", "koleksitotem", "totem", "jimatrpg", "patungrpg"],
  category: "rpg",
  description: "RPG Totem — Kumpulkan totem untuk bonus pasif permanen",
  usage: ".rpgtotem — Lihat koleksi & bonus\n.rpgtotem summon — Summon totem acak (gold)\n.rpgtotem activate <id> — Aktifkan totem\n.rpgtotem deactivate — Matikan totem\n.rpgtotem list — Daftar semua totem",
  example: ".rpgtotem summon\n.rpgtotem activate fire",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const SUMMON_COST = 2500;

const TOTEMS = [
  { id: "fire", name: "Totem Api", emoji: "🔥", rarity: "common", bonus: "atk", bonusVal: 5, desc: "+5 atk permanen" },
  { id: "water", name: "Totem Air", emoji: "💧", rarity: "common", bonus: "def", bonusVal: 5, desc: "+5 def permanen" },
  { id: "earth", name: "Totem Bumi", emoji: "🌍", rarity: "common", bonus: "hp", bonusVal: 20, desc: "+20 max HP" },
  { id: "wind", name: "Totem Angin", emoji: "💨", rarity: "rare", bonus: "speed", bonusVal: 10, desc: "+10 speed" },
  { id: "lightning", name: "Totem Petir", emoji: "⚡", rarity: "rare", bonus: "crit", bonusVal: 10, desc: "+10% crit chance" },
  { id: "ice", name: "Totem Es", emoji: "❄️", rarity: "rare", bonus: "stamina", bonusVal: 15, desc: "+15 max stamina" },
  { id: "shadow", name: "Totem Bayangan", emoji: "🌑", rarity: "epic", bonus: "gold", bonusVal: 15, desc: "+15% gold dari aksi" },
  { id: "light", name: "Totem Cahaya", emoji: "✨", rarity: "epic", bonus: "exp", bonusVal: 15, desc: "+15% exp dari aksi" },
  { id: "dragon", name: "Totem Naga", emoji: "🐉", rarity: "legendary", bonus: "all", bonusVal: 10, desc: "+10% semua stat" },
  { id: "phoenix", name: "Totem Phoenix", emoji: "🦅", rarity: "legendary", bonus: "revive", bonusVal: 1, desc: "Revive 1x saat kalah" },
];

const RARITY_WEIGHTS = { common: 50, rare: 30, epic: 15, legendary: 5 };
const RARITY_EMOJI = { common: "⚪", rare: "🔵", epic: "🟣", legendary: "🟡" };

function rollTotem() {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let selectedRarity = "common";
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { selectedRarity = rarity; break; }
  }
  const pool = TOTEMS.filter(t => t.rarity === selectedRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Totem", [
        "SISTEM TOTEM",
        "Kumpulkan & aktifkan totem untuk bonus pasif",
        "Hanya 1 totem bisa aktif sekaligus",
        "",
        "PERINTAH:",
        usedPrefix + "rpgtotem summon - Summon acak (" + SUMMON_COST + " gold)",
        usedPrefix + "rpgtotem activate <id> - Aktifkan",
        usedPrefix + "rpgtotem deactivate - Matikan",
        usedPrefix + "rpgtotem list - Koleksi kamu",
        "",
        "RARITY:",
        "⚪ Common 50% | 🔵 Rare 30%",
        "🟣 Epic 15% | 🟡 Legendary 5%",
      ], "info"));
    }

    if (action === "list") {
      if (!player.totems || Object.keys(player.totems).length === 0) {
        return m.reply(claraWrap("RPG Totem", [
          "Belum punya totem!",
          "Summon: " + usedPrefix + "rpgtotem summon (" + SUMMON_COST + " gold)",
        ], "warn"));
      }

      const lines = ["KOLEKSI TOTEM", ""];
      Object.entries(player.totems).forEach(([id, data]) => {
        const totem = TOTEMS.find(t => t.id === id);
        if (!totem) return;
        const active = player.activeTotem === id ? " [AKTIF]" : "";
        const count = data.count || 1;
        lines.push(totem.emoji + " " + totem.name + " x" + count + active);
        lines.push("   " + RARITY_EMOJI[totem.rarity] + " " + totem.rarity.toUpperCase() + " | " + totem.desc);
      });

      if (player.activeTotem) {
        const active = TOTEMS.find(t => t.id === player.activeTotem);
        lines.push("");
        lines.push("Totem aktif: " + active.emoji + " " + active.name);
      }

      return m.reply(claraWrap("RPG Totem", lines, "info"));
    }

    if (action === "summon") {
      if ((player.gold || 0) < SUMMON_COST) {
        return m.reply(claraWrap("RPG Totem", "Gold kurang! Butuh: " + SUMMON_COST, "warn"));
      }

      addGold(m, -SUMMON_COST);

      const result = rollTotem();
      if (!player.totems) player.totems = {};
      if (!player.totems[result.id]) {
        player.totems[result.id] = { count: 1, obtained: Date.now() };
      } else {
        player.totems[result.id].count = (player.totems[result.id].count || 1) + 1;
      }
      savePlayer(m, player);

      const lines = [
        "SUMMON TOTEM",
        "Biaya: " + SUMMON_COST + " gold",
        "",
        "Hasil: " + RARITY_EMOJI[result.rarity] + " " + result.emoji + " " + result.name,
        "Rarity: " + result.rarity.toUpperCase(),
        "Bonus: " + result.desc,
      ];

      if (result.rarity === "legendary") {
        lines.push("");
        lines.push("LEGENDARY! Selamat!");
      }

      lines.push("");
      lines.push("Aktifkan: " + usedPrefix + "rpgtotem activate " + result.id);

      return m.reply(claraWrap("RPG Totem", lines, result.rarity === "legendary" ? "info" : "info"));
    }

    if (action === "activate") {
      const totemId = args[1]?.toLowerCase();
      const totem = TOTEMS.find(t => t.id === totemId);

      if (!totem) return m.reply(claraWrap("RPG Totem", "Totem tidak ditemukan", "warn"));
      if (!player.totems?.[totemId]) return m.reply(claraWrap("RPG Totem", "Belum punya totem ini", "warn"));

      player.activeTotem = totemId;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Totem", [
        "Totem diaktifkan!",
        totem.emoji + " " + totem.name,
        "Bonus: " + totem.desc,
        "",
        "Bonus pasif sekarang aktif!",
      ], "info"));
    }

    if (action === "deactivate") {
      if (!player.activeTotem) {
        return m.reply(claraWrap("RPG Totem", "Tidak ada totem aktif", "warn"));
      }
      const old = TOTEMS.find(t => t.id === player.activeTotem);
      player.activeTotem = null;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Totem", (old?.name || "Totem") + " dimatikan", "info"));
    }

    return m.reply(claraWrap("RPG Totem", "Perintah: summon, activate, deactivate, list", "warn"));
  } catch (e) {
    console.error("[RpgTotem]", e);
    return m.reply(claraWrap("RPG Totem", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
