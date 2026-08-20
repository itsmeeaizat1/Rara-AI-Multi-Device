// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Aurora — Event aurora borealis, koleksi cahaya langka
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgaurora",
  alias: ["aurorarpg", "cahayakutub", "auroraborealis", "cahayalangka", "kutubcahaya"],
  category: "rpg",
  description: "RPG Aurora — Event aurora borealis langka, koleksi cahaya untuk hadiah",
  usage: ".rpgaurora check — Cek apakah aurora muncul\n.rpgaurora absorb — Serap cahaya aurora\n.rpgaurora info — Statistik & koleksi\n.rpgaurora trade — Tukar cahaya untuk reward",
  example: ".rpgaurora check\n.rpgaurora absorb",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 8,
  isEnabled: true,
};

const STAMINA_COST = 10;
const AURORA_CHANCE = 0.15; // 15% chance per check
const CHECK_COOLDOWN = 60 * 60 * 1000; // 1 hour between checks
const AURORA_DURATION = 15 * 60 * 1000; // 15 min window
const MAX_ABSORB = 5; // max absorbs per aurora

const LIGHT_TYPES = [
  { id: "green", name: "Cahaya Hijau", emoji: "🟢", rarity: "common", weight: 50, value: 200 },
  { id: "purple", name: "Cahaya Ungu", emoji: "🟣", rarity: "rare", weight: 25, value: 800 },
  { id: "red", name: "Cahaya Merah", emoji: "🔴", rarity: "epic", weight: 15, value: 2000 },
  { id: "white", name: "Cahaya Putih", emoji: "⚪", rarity: "legendary", weight: 7, value: 5000 },
  { id: "rainbow", name: "Cahaya Pelangi", emoji: "🌈", rarity: "mythical", weight: 3, value: 15000 },
];

const RARITY_EMOJI = { common: "⚪", rare: "🔵", epic: "🟣", legendary: "🟡", mythical: "🌟" };

const TRADE_REWARDS = [
  { id: "green_10", cost: { green: 10 }, reward: { gold: 3000, exp: 500 }, name: "10 Hijau -> 3000g" },
  { id: "purple_5", cost: { purple: 5 }, reward: { gold: 8000, exp: 2000 }, name: "5 Ungu -> 8000g" },
  { id: "red_3", cost: { red: 3 }, reward: { gold: 15000, exp: 5000 }, name: "3 Merah -> 15000g" },
  { id: "white_2", cost: { white: 2 }, reward: { gold: 30000, exp: 10000 }, name: "2 Putih -> 30000g" },
  { id: "rainbow_1", cost: { rainbow: 1 }, reward: { gold: 50000, exp: 25000 }, name: "1 Pelangi -> 50000g LEGENDARY" },
  { id: "mixed", cost: { green: 5, purple: 2, red: 1 }, reward: { gold: 20000, exp: 8000 }, name: "Mix 5H+2U+1M -> 20000g" },
];

function rollLight() {
  const total = LIGHT_TYPES.reduce((s, l) => s + l.weight, 0);
  let roll = Math.random() * total;
  for (const l of LIGHT_TYPES) {
    roll -= l.weight;
    if (roll <= 0) return l;
  }
  return LIGHT_TYPES[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Aurora", [
        "AURORA BOREALIS",
        "Event langka! Serap cahaya untuk hadiah",
        "Chance muncul: 15% per cek (1 jam cooldown)",
        "Stamina: -" + STAMINA_COST + " per serapan | Max " + MAX_ABSORB + "x per aurora",
        "",
        "CAHAYA:",
        "⚪ Hijau 50% - 200g value",
        "🔵 Ungu 25% - 800g value",
        "🟣 Merah 15% - 2000g value",
        "🟡 Putih 7% - 5000g value",
        "🌟 Pelangi 3% - 15000g MYTHICAL",
        "",
        "PERINTAH:",
        usedPrefix + "rpgaurora check - Cek aurora",
        usedPrefix + "rpgaurora absorb - Serap cahaya",
        usedPrefix + "rpgaurora trade - Tukar cahaya",
        usedPrefix + "rpgaurora info - Koleksi",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.auroraStats || {};
      const lights = player.auroraLights || {};

      const lines = [
        "STATISTIK AURORA",
        "Total cek: " + (stats.checks || 0),
        "Aurora ditemukan: " + (stats.found || 0),
        "Total serapan: " + (stats.absorbs || 0),
      ];

      if (Object.keys(lights).length > 0) {
        lines.push("");
        lines.push("KOLEKSI CAHAYA:");
        Object.entries(lights).forEach(([id, count]) => {
          const light = LIGHT_TYPES.find(l => l.id === id);
          if (light && count > 0) {
            lines.push(RARITY_EMOJI[light.rarity] + " " + light.name + " x" + count);
          }
        });
      }

      return m.reply(claraWrap("RPG Aurora", lines, "info"));
    }

    if (action === "trade") {
      if (!args[1]) {
        const lines = ["TUKAR CAHAYA", ""];
        TRADE_REWARDS.forEach(tr => {
          lines.push(tr.id + ". " + tr.name);
        });
        lines.push("");
        lines.push("Tukar: " + usedPrefix + "rpgaurora trade <id>");
        return m.reply(claraWrap("RPG Aurora", lines, "info"));
      }

      const tradeId = args[1].toLowerCase();
      const trade = TRADE_REWARDS.find(t => t.id === tradeId);

      if (!trade) return m.reply(claraWrap("RPG Aurora", "Trade tidak ditemukan", "warn"));

      // Check if player has enough lights
      const lights = player.auroraLights || {};
      for (const [lightId, needed] of Object.entries(trade.cost)) {
        if ((lights[lightId] || 0) < needed) {
          const lightData = LIGHT_TYPES.find(l => l.id === lightId);
          return m.reply(claraWrap("RPG Aurora", "Cahaya kurang! Butuh " + needed + " " + (lightData?.name || lightId) + " (punya " + (lights[lightId] || 0) + ")", "warn"));
        }
      }

      // Consume lights
      for (const [lightId, amount] of Object.entries(trade.cost)) {
        player.auroraLights[lightId] -= amount;
      }

      addGold(m, trade.reward.gold);
      addExp(m, trade.reward.exp);
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aurora", [
        "CAHAYA DITUKAR!",
        "Trade: " + trade.name,
        "",
        "Gold: +" + trade.reward.gold,
        "Exp: +" + trade.reward.exp,
      ], "info"));
    }

    if (action === "check") {
      const lastCheck = player.auroraLastCheck || 0;
      if (Date.now() - lastCheck < CHECK_COOLDOWN) {
        const remaining = Math.round((CHECK_COOLDOWN - (Date.now() - lastCheck)) / 60000);
        return m.reply(claraWrap("RPG Aurora", "Cooldown: " + remaining + " menit lagi", "warn"));
      }

      player.auroraLastCheck = Date.now();
      if (!player.auroraStats) player.auroraStats = {};
      player.auroraStats.checks = (player.auroraStats.checks || 0) + 1;

      if (Math.random() < AURORA_CHANCE) {
        // Aurora appears!
        player.auroraActive = {
          expires: Date.now() + AURORA_DURATION,
          absorbs: 0,
        };
        player.auroraStats.found = (player.auroraStats.found || 0) + 1;
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Aurora", [
          "AURORA BOREALIS MUNCUL! 🌌",
          "Langit bercahaya dengan warna-warni!",
          "Durasi: 15 menit | Max serap: " + MAX_ABSORB + "x",
          "",
          "Serap sekarang: " + usedPrefix + "rpgaurora absorb",
        ], "info"));
      } else {
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Aurora", [
          "Langit gelap, tidak ada aurora...",
          "Coba lagi nanti (1 jam cooldown)",
        ], "warn"));
      }
    }

    if (action === "absorb") {
      if (!player.auroraActive) {
        return m.reply(claraWrap("RPG Aurora", "Tidak ada aurora! Cek: " + usedPrefix + "rpgaurora check", "warn"));
      }

      if (Date.now() > player.auroraActive.expires) {
        delete player.auroraActive;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Aurora", "Aurora sudah hilang!", "warn"));
      }

      if (player.auroraActive.absorbs >= MAX_ABSORB) {
        delete player.auroraActive;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Aurora", "Sudah mencapai max serapan (" + MAX_ABSORB + "x)!", "warn"));
      }

      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Aurora", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);
      player.auroraActive.absorbs++;

      const light = rollLight();
      if (!player.auroraLights) player.auroraLights = {};
      player.auroraLights[light.id] = (player.auroraLights[light.id] || 0) + 1;

      const expGain = Math.round(light.value * 0.2);
      addExp(m, expGain);

      if (!player.auroraStats) player.auroraStats = {};
      player.auroraStats.absorbs = (player.auroraStats.absorbs || 0) + 1;
      savePlayer(m, player);

      const lines = [
        "CAHAYA DISERAP!",
        RARITY_EMOJI[light.rarity] + " " + light.emoji + " " + light.name,
        "Rarity: " + light.rarity.toUpperCase(),
        "Value: " + light.value + "g | Exp: +" + expGain,
        "",
        "Serapan: " + player.auroraActive.absorbs + "/" + MAX_ABSORB,
      ];

      if (light.rarity === "mythical") {
        lines.push("");
        lines.push("MYTHICAL! Cahaya Pelangi! 🌟");
      }

      const remaining = Math.max(0, Math.round((player.auroraActive.expires - Date.now()) / 60000));
      lines.push("Sisa aurora: " + remaining + " menit");

      return m.reply(claraWrap("RPG Aurora", lines, "info"));
    }

    return m.reply(claraWrap("RPG Aurora", "Perintah: check, absorb, trade, info", "warn"));
  } catch (e) {
    console.error("[RpgAurora]", e);
    return m.reply(claraWrap("RPG Aurora", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
