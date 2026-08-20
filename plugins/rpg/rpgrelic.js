// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Relic — Gali relic kuno, kumpulkan set untuk hadiah legendaris
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgrelic",
  alias: ["relicrpg", "galirelik", "relilkuno", "arkaeologi", "digrelic"],
  category: "rpg",
  description: "RPG Relic — Gali relic kuno, kumpulkan set untuk hadiah legendaris",
  usage: ".rpgrelic dig — Gali situs arkeologi (stamina + gold)\n.rpgrelic assemble <setId> — Rakit set relic\n.rpgrelic info — Koleksi & statistik\n.rpgrelic sets — Daftar set relic",
  example: ".rpgrelic dig\n.rpgrelic assemble warrior",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 10,
  isEnabled: true,
};

const DIG_COST = 800;
const STAMINA_COST = 15;

const RELICS = [
  { id: "sword_shard", name: "Pecahan Pedang", emoji: "⚔️", rarity: "common", setValue: 1 },
  { id: "shield_frag", name: "Pecahan Perisai", emoji: "🛡️", rarity: "common", setValue: 1 },
  { id: "crown_gem", name: "Permata Mahkota", emoji: "👑", rarity: "rare", setValue: 5 },
  { id: "dragon_scale", name: "Sisik Naga", emoji: "🐲", rarity: "rare", setValue: 5 },
  { id: "god_tear", name: "Air Mata Dewa", emoji: "💎", rarity: "epic", setValue: 10 },
  { id: "eternal_flame", name: "Api Abadi", emoji: "🔥", rarity: "epic", setValue: 10 },
  { id: "void_crystal", name: "Kristal Void", emoji: "🌌", rarity: "legendary", setValue: 25 },
  { id: "genesis_seed", name: "Benih Genesis", emoji: "🌱", rarity: "legendary", setValue: 25 },
];

const RELIC_SETS = [
  {
    id: "warrior",
    name: "Set Pejuang Kuno",
    emoji: "⚔️",
    relics: ["sword_shard", "shield_frag"],
    reward: { gold: 10000, exp: 2000 },
    desc: "Pecahan pedang + perisai",
  },
  {
    id: "dragon",
    name: "Set Naga Kuno",
    emoji: "🐲",
    relics: ["dragon_scale", "crown_gem"],
    reward: { gold: 25000, exp: 5000 },
    desc: "Sisik naga + permata mahkota",
  },
  {
    id: "divine",
    name: "Set Dewa",
    emoji: "✨",
    relics: ["god_tear", "eternal_flame"],
    reward: { gold: 50000, exp: 10000 },
    desc: "Air mata dewa + api abadi",
  },
  {
    id: "genesis",
    name: "Set Genesis LEGENDARY",
    emoji: "🌟",
    relics: ["void_crystal", "genesis_seed"],
    reward: { gold: 150000, exp: 30000 },
    desc: "Kristal void + benih genesis",
  },
];

const RARITY_WEIGHTS = { common: 45, rare: 30, epic: 18, legendary: 7 };
const RARITY_EMOJI = { common: "⚪", rare: "🔵", epic: "🟣", legendary: "🟡" };

function rollRelic() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let selectedRarity = "common";
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { selectedRarity = rarity; break; }
  }
  const pool = RELICS.filter(r => r.rarity === selectedRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Relic", [
        "GALI RELIK KUNO",
        "Gali situs arkeologi untuk relic langka",
        "Kumpulkan set relic untuk hadiah besar!",
        "Biaya: " + DIG_COST + "g | Stamina: -" + STAMINA_COST,
        "",
        "PERINTAH:",
        usedPrefix + "rpgrelic dig - Gali situs",
        usedPrefix + "rpgrelic assemble <setId> - Rakit set",
        usedPrefix + "rpgrelic sets - Daftar set",
        usedPrefix + "rpgrelic info - Koleksi kamu",
        "",
        "Rarity: ⚪45% 🔵30% 🟣18% 🟡7%",
      ], "info"));
    }

    if (action === "sets") {
      const lines = ["DAFTAR SET RELIC", ""];
      RELIC_SETS.forEach(set => {
        const owned = set.relics.every(r => (player.relics?.[r] || 0) > 0);
        lines.push(set.emoji + " " + set.name + (owned ? " [SIAP RAKIT]" : ""));
        lines.push("   Butuh: " + set.relics.map(r => RELICS.find(x => x.id === r)?.emoji + " " + RELICS.find(x => x.id === r)?.name).join(" + "));
        lines.push("   Hadiah: " + set.reward.gold + "g + " + set.reward.exp + " exp");
      });
      lines.push("");
      lines.push("Rakit: " + usedPrefix + "rpgrelic assemble <setId>");
      return m.reply(claraWrap("RPG Relic", lines, "info"));
    }

    if (action === "info") {
      if (!player.relics || Object.keys(player.relics).length === 0) {
        return m.reply(claraWrap("RPG Relic", "Belum punya relic. Gali: " + usedPrefix + "rpgrelic dig", "warn"));
      }

      const lines = ["KOLEKSI RELIC", ""];
      Object.entries(player.relics).forEach(([id, count]) => {
        if (count > 0) {
          const relic = RELICS.find(r => r.id === id);
          if (relic) {
            lines.push(RARITY_EMOJI[relic.rarity] + " " + relic.emoji + " " + relic.name + " x" + count);
          }
        }
      });

      const stats = player.relicStats || {};
      lines.push("");
      lines.push("Total gali: " + (stats.digs || 0));
      lines.push("Set dirakit: " + (stats.assembled || 0));
      lines.push("Total gold: " + (stats.totalGold || 0));

      return m.reply(claraWrap("RPG Relic", lines, "info"));
    }

    if (action === "dig") {
      if ((player.gold || 0) < DIG_COST) {
        return m.reply(claraWrap("RPG Relic", "Gold kurang! Butuh: " + DIG_COST, "warn"));
      }
      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Relic", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      addGold(m, -DIG_COST);
      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);

      // 85% chance to find relic, 15% empty
      if (Math.random() < 0.15) {
        if (!player.relicStats) player.relicStats = {};
        player.relicStats.digs = (player.relicStats.digs || 0) + 1;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Relic", [
          "Gali selesai, tapi kosong!",
          "Stamina: -" + STAMINA_COST + " | Gold: -" + DIG_COST,
          "Coba lagi di situs lain!",
        ], "warn"));
      }

      const relic = rollRelic();
      if (!player.relics) player.relics = {};
      player.relics[relic.id] = (player.relics[relic.id] || 0) + 1;

      if (!player.relicStats) player.relicStats = {};
      player.relicStats.digs = (player.relicStats.digs || 0) + 1;
      savePlayer(m, player);

      const expGain = relic.setValue * 50;
      addExp(m, expGain);

      const lines = [
        "RELIC DITEMUKAN!",
        RARITY_EMOJI[relic.rarity] + " " + relic.emoji + " " + relic.name,
        "Rarity: " + relic.rarity.toUpperCase(),
        "Exp: +" + expGain,
        "",
        "Stamina: " + (player.stamina || 0) + "/100",
      ];

      if (relic.rarity === "legendary") {
        lines.push("");
        lines.push("LEGENDARY RELIC! 🟡");
      }

      // Check if any set is now completable
      const completable = RELIC_SETS.filter(set =>
        set.relics.every(r => (player.relics[r] || 0) > 0)
      );
      if (completable.length > 0) {
        lines.push("");
        lines.push("SET SIAP DIRAKIT:");
        completable.forEach(s => lines.push(s.emoji + " " + s.id + " — " + usedPrefix + "rpgrelic assemble " + s.id));
      }

      return m.reply(claraWrap("RPG Relic", lines, "info"));
    }

    if (action === "assemble") {
      const setId = args[1]?.toLowerCase();
      const set = RELIC_SETS.find(s => s.id === setId);

      if (!set) {
        return m.reply(claraWrap("RPG Relic", "Set tidak ditemukan. Lihat: " + usedPrefix + "rpgrelic sets", "warn"));
      }

      // Check if player has all relics
      const missing = set.relics.filter(r => (player.relics?.[r] || 0) <= 0);
      if (missing.length > 0) {
        return m.reply(claraWrap("RPG Relic", [
          "Relic kurang!",
          "Butuh: " + missing.map(r => RELICS.find(x => x.id === r)?.name).join(", "),
        ], "warn"));
      }

      // Consume relics
      set.relics.forEach(r => {
        player.relics[r]--;
      });

      // Give rewards
      addGold(m, set.reward.gold);
      addExp(m, set.reward.exp);

      if (!player.relicStats) player.relicStats = {};
      player.relicStats.assembled = (player.relicStats.assembled || 0) + 1;
      player.relicStats.totalGold = (player.relicStats.totalGold || 0) + set.reward.gold;

      savePlayer(m, player);

      const lines = [
        "SET RELIC DIRAKIT!",
        set.emoji + " " + set.name,
        "",
        "Relic dikonsumsi: " + set.relics.map(r => RELICS.find(x => x.id === r)?.emoji).join(" + "),
        "Gold: +" + set.reward.gold,
        "Exp: +" + set.reward.exp,
      ];

      if (set.id === "genesis") {
        lines.push("");
        lines.push("LEGENDARY SET COMPLETE! 🌟");
      }

      return m.reply(claraWrap("RPG Relic", lines, "info"));
    }

    return m.reply(claraWrap("RPG Relic", "Perintah: dig, assemble, sets, info", "warn"));
  } catch (e) {
    console.error("[RpgRelic]", e);
    return m.reply(claraWrap("RPG Relic", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
