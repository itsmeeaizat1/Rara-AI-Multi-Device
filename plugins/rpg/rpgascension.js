// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Ascension — Naik ke tier kekuatan yang lebih tinggi, prestige system
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgascension",
  alias: ["ascensionrpg", "ascend", "naiktier", "prestige", "kenaikantier"],
  category: "rpg",
  description: "RPG Ascension — Naik ke tier kekuatan lebih tinggi, prestige dengan bonus",
  usage: ".rpgascension — Status tier & kebutuhan\n.rpgascension ascend — Lakukan ascension (min level 50)\n.rpgascension info — Statistik & bonus\n.rpgascension trial — Ujian ascension (gold untuk kesempatan)",
  example: ".rpgascension\n.rpgascension ascend",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const ASCEND_LEVEL = 50;
const TRIAL_COST = 5000;

const ASCENSION_TIERS = [
  { tier: 0, name: "Mortal", emoji: "👤", goldBonus: 0, expBonus: 0, color: "abu-abu" },
  { tier: 1, name: "Adept", emoji: "🧑‍🎓", goldBonus: 0.1, expBonus: 0.1, color: "hijau" },
  { tier: 2, name: "Master", emoji: "🧑‍🏫", goldBonus: 0.2, expBonus: 0.2, color: "biru" },
  { tier: 3, name: "Grandmaster", emoji: "🧙", goldBonus: 0.35, expBonus: 0.35, color: "ungu" },
  { tier: 4, name: "Saint", emoji: "😇", goldBonus: 0.5, expBonus: 0.5, color: "emas" },
  { tier: 5, name: "Demigod", emoji: "⚡", goldBonus: 0.75, expBonus: 0.75, color: "petir" },
  { tier: 6, name: "God", emoji: "👑", goldBonus: 1.0, expBonus: 1.0, color: "kosmik" },
  { tier: 7, name: "Eternal", emoji: "🌟", goldBonus: 1.5, expBonus: 1.5, color: "abadi" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    const currentTier = player.ascensionTier || 0;
    const tierData = ASCENSION_TIERS[currentTier];

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Ascension", [
        "SISTEM ASCENSION",
        "Naik ke tier kekuatan lebih tinggi!",
        "Reset level untuk bonus permanen",
        "Min level ascend: " + ASCEND_LEVEL,
        "",
        "TIER:",
        "👤 Mortal > 🧑‍🎓 Adept > 🧑‍🏫 Master",
        "🧙 Grandmaster > 😇 Saint > ⚡ Demigod",
        "👑 God > 🌟 Eternal (MAX)",
        "",
        "BONUS PER TIER: +10% gold & exp (naik per tier)",
        "",
        "PERINTAH:",
        usedPrefix + "rpgascension — Status kamu",
        usedPrefix + "rpgascension ascend — Naik tier",
        usedPrefix + "rpgascension trial — Ujian (gold untuk exp)",
        usedPrefix + "rpgascension info — Statistik",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.ascensionStats || {};
      const lines = [
        "STATISTIK ASCENSION",
        "Tier sekarang: " + tierData.emoji + " " + tierData.name,
        "Total ascension: " + (stats.total || 0),
        "Bonus gold: +" + (tierData.goldBonus * 100) + "%",
        "Bonus exp: +" + (tierData.expBonus * 100) + "%",
        "",
        "TIER LIST:",
      ];

      ASCENSION_TIERS.forEach((t, i) => {
        const current = i === currentTier ? " [KAMU]" : "";
        lines.push(t.emoji + " T" + i + " " + t.name + " (+" + (t.goldBonus * 100) + "%)" + current);
      });

      return m.reply(claraWrap("RPG Ascension", lines, "info"));
    }

    if (action === "trial") {
      if ((player.gold || 0) < TRIAL_COST) {
        return m.reply(claraWrap("RPG Ascension", "Gold kurang! Butuh: " + TRIAL_COST, "warn"));
      }

      addGold(m, -TRIAL_COST);

      // Trial gives bonus exp
      const trialExp = 500 + Math.floor(Math.random() * 1500) * (1 + tierData.expBonus);
      addExp(m, Math.round(trialExp));

      if (!player.ascensionStats) player.ascensionStats = {};
      player.ascensionStats.trials = (player.ascensionStats.trials || 0) + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Ascension", [
        "UJIAN ASCENSION!",
        "Tier: " + tierData.emoji + " " + tierData.name,
        "Biaya: " + TRIAL_COST + "g",
        "Exp: +" + Math.round(trialExp) + " (bonus " + (tierData.expBonus * 100) + "%)",
      ], "info"));
    }

    if (action === "ascend") {
      if (currentTier >= ASCENSION_TIERS.length - 1) {
        return m.reply(claraWrap("RPG Ascension", [
          "Sudah di tier MAX!",
          ASCENSION_TIERS[ASCENSION_TIERS.length - 1].emoji + " " + ASCENSION_TIERS[ASCENSION_TIERS.length - 1].name,
        ], "warn"));
      }

      if ((player.level || 0) < ASCEND_LEVEL) {
        return m.reply(claraWrap("RPG Ascension", [
          "Level belum cukup!",
          "Butuh: Level " + ASCEND_LEVEL,
          "Sekarang: Level " + (player.level || 0),
        ], "warn"));
      }

      const newTier = currentTier + 1;
      const newTierData = ASCENSION_TIERS[newTier];
      const bonusGold = 20000 * newTier;
      const bonusExp = 10000 * newTier;

      // Reset level, apply new tier
      const oldLevel = player.level || 0;
      player.level = 1;
      player.exp = 0;
      player.ascensionTier = newTier;

      addGold(m, bonusGold);
      addExp(m, bonusExp);

      if (!player.ascensionStats) player.ascensionStats = {};
      player.ascensionStats.total = (player.ascensionStats.total || 0) + 1;
      player.ascensionStats.lastAscend = Date.now();

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Ascension", [
        "ASCENSION BERHASIL!",
        tierData.emoji + " " + tierData.name + " -> " + newTierData.emoji + " " + newTierData.name,
        "",
        "Level reset: " + oldLevel + " -> 1",
        "Tier bonus baru:",
        "Gold: +" + (newTierData.goldBonus * 100) + "% permanen",
        "Exp: +" + (newTierData.expBonus * 100) + "% permanen",
        "",
        "Hadiah: +" + bonusGold + "g | +" + bonusExp + " exp",
      ], "info"));
    }

    // Default: status
    const nextTier = currentTier < ASCENSION_TIERS.length - 1 ? ASCENSION_TIERS[currentTier + 1] : null;
    const canAscend = (player.level || 0) >= ASCEND_LEVEL;

    const lines = [
      "STATUS ASCENSION",
      "Tier: " + tierData.emoji + " " + tierData.name + " (T" + currentTier + ")",
      "Level: " + (player.level || 0) + (canAscend ? " (SIAP)" : " (butuh " + ASCEND_LEVEL + ")"),
      "",
      "Bonus aktif:",
      "Gold: +" + (tierData.goldBonus * 100) + "% | Exp: +" + (tierData.expBonus * 100) + "%",
    ];

    if (nextTier) {
      lines.push("");
      lines.push("Tier berikutnya: " + nextTier.emoji + " " + nextTier.name);
      lines.push("Bonus: +" + (nextTier.goldBonus * 100) + "% gold & exp");
      if (canAscend) {
        lines.push("");
        lines.push("SIAP ASCEND!");
        lines.push(usedPrefix + "rpgascension ascend");
      }
    } else {
      lines.push("");
      lines.push("MAX TIER TERCAPAI!");
    }

    return m.reply(claraWrap("RPG Ascension", lines, "info"));
  } catch (e) {
    console.error("[RpgAscension]", e);
    return m.reply(claraWrap("RPG Ascension", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
