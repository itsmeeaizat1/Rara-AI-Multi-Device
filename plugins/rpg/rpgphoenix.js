// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Phoenix — Sistem rebirth, mati & bangkit lebih kuat
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgphoenix",
  alias: ["phoenixrpg", "rebirthrpg", "rebirth", "bangkit", "feniks"],
  category: "rpg",
  description: "RPG Phoenix — Rebirth system, mati & bangkit lebih kuat dengan bonus permanen",
  usage: ".rpgphoenix — Status phoenix & rebirth\n.rpgphoenix rebirth — Lakukan rebirth (reset level, dapat bonus)\n.rpgphoenix info — Statistik rebirth\n.rpgphoenix flame — Gunakan phoenix flame (revive item)",
  example: ".rpgphoenix\n.rpgphoenix rebirth",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const MIN_REBIRTH_LEVEL = 20;

const REBIRTH_REWARDS = [
  { id: "gold_mult", name: "Gold Multiplier", desc: "+5% gold permanen per rebirth", perRebirth: 0.05 },
  { id: "exp_mult", name: "Exp Multiplier", desc: "+5% exp permanen per rebirth", perRebirth: 0.05 },
  { id: "stamina_max", name: "Max Stamina", desc: "+5 max stamina per rebirth", perRebirth: 5 },
  { id: "start_level_bonus", name: "Starting Level", desc: "+1 level awal per rebirth", perRebirth: 1 },
];

const FLAME_COST = 5000;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Phoenix", [
        "SISTEM REBIRTH PHOENIX",
        "Mati & bangkit lebih kuat! Reset level untuk bonus permanen",
        "Min level rebirth: " + MIN_REBIRTH_LEVEL,
        "",
        "BONUS PER REBIRTH:",
        "Gold: +5% permanen",
        "Exp: +5% permanen",
        "Stamina: +5 max",
        "Start level: +1",
        "",
        "PERINTAH:",
        usedPrefix + "rpgphoenix — Status kamu",
        usedPrefix + "rpgphoenix rebirth — Lakukan rebirth",
        usedPrefix + "rpgphoenix flame — Phoenix flame (revive)",
        usedPrefix + "rpgphoenix info — Statistik",
      ], "info"));
    }

    const rebirths = player.phoenixRebirths || 0;
    const goldMult = 1 + rebirths * 0.05;
    const expMult = 1 + rebirths * 0.05;
    const staminaMax = 100 + rebirths * 5;
    const startLevel = rebirths * 1;

    if (action === "info") {
      const lines = [
        "STATISTIK PHOENIX",
        "Total rebirth: " + rebirths,
        "Gold multiplier: " + goldMult.toFixed(2) + "x",
        "Exp multiplier: " + expMult.toFixed(2) + "x",
        "Max stamina: " + staminaMax,
        "Start level: " + startLevel,
      ];

      if (player.phoenixFlames) {
        lines.push("");
        lines.push("Phoenix Flames: " + player.phoenixFlames);
      }

      if (player.phoenixStats) {
        lines.push("");
        lines.push("Total gold dari rebirth: " + (player.phoenixStats.totalBonus || 0));
        lines.push("Total revive: " + (player.phoenixStats.revives || 0));
      }

      return m.reply(claraWrap("RPG Phoenix", lines, "info"));
    }

    if (action === "flame") {
      if ((player.gold || 0) < FLAME_COST) {
        return m.reply(claraWrap("RPG Phoenix", "Gold kurang! Butuh: " + FLAME_COST, "warn"));
      }

      addGold(m, -FLAME_COST);
      player.phoenixFlames = (player.phoenixFlames || 0) + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Phoenix", [
        "Phoenix Flame diperoleh!",
        "Biaya: " + FLAME_COST + " gold",
        "Total flames: " + player.phoenixFlames,
        "",
        "Gunakan untuk revive saat kalah di boss/hunt",
      ], "info"));
    }

    if (action === "rebirth") {
      if ((player.level || 0) < MIN_REBIRTH_LEVEL) {
        return m.reply(claraWrap("RPG Phoenix", [
          "Level belum cukup untuk rebirth!",
          "Butuh: Level " + MIN_REBIRTH_LEVEL,
          "Sekarang: Level " + (player.level || 0),
        ], "warn"));
      }

      // Calculate rebirth bonus
      const newRebirthCount = rebirths + 1;
      const bonusGold = 10000 * newRebirthCount;
      const bonusExp = 5000 * newRebirthCount;

      // Apply rebirth: reset level but keep rebirth bonuses
      const oldLevel = player.level || 0;
      player.level = startLevel; // new start level
      player.exp = 0;
      player.phoenixRebirths = newRebirthCount;

      addGold(m, bonusGold);
      addExp(m, bonusExp);

      if (!player.phoenixStats) player.phoenixStats = {};
      player.phoenixStats.totalBonus = (player.phoenixStats.totalBonus || 0) + bonusGold;
      player.phoenixStats.lastRebirth = Date.now();

      // Give 1 phoenix flame per rebirth
      player.phoenixFlames = (player.phoenixFlames || 0) + 1;

      savePlayer(m, player);

      const lines = [
        "PHOENIX REBIRTH!",
        "🔥🐦 BANGKIT DARI ABU 🐦🔥",
        "",
        "Level lama: " + oldLevel + " -> Level baru: " + player.level,
        "Rebirth count: " + newRebirthCount,
        "",
        "BONUS REBIRTH:",
        "Gold: +" + bonusGold,
        "Exp: +" + bonusExp,
        "Phoenix Flame: +1 (total: " + (player.phoenixFlames || 0) + ")",
        "",
        "BONUS PERMANEN BARU:",
        "Gold mult: " + (1 + newRebirthCount * 0.05).toFixed(2) + "x",
        "Exp mult: " + (1 + newRebirthCount * 0.05).toFixed(2) + "x",
        "Max stamina: " + (100 + newRebirthCount * 5),
        "Start level: " + newRebirthCount,
      ];

      return m.reply(claraWrap("RPG Phoenix", lines, "info"));
    }

    // Default: show status
    const canRebirth = (player.level || 0) >= MIN_REBIRTH_LEVEL;
    const lines = [
      "STATUS PHOENIX",
      "Rebirth: " + rebirths,
      "Level: " + (player.level || 0) + (canRebirth ? " (SIAP REBIRTH)" : " (butuh " + MIN_REBIRTH_LEVEL + ")"),
      "",
      "BONUS AKTIF:",
      "Gold: " + goldMult.toFixed(2) + "x | Exp: " + expMult.toFixed(2) + "x",
      "Max stamina: " + staminaMax,
      "Phoenix Flames: " + (player.phoenixFlames || 0),
    ];

    if (canRebirth) {
      lines.push("");
      lines.push("SIAP REBIRTH!");
      lines.push(usedPrefix + "rpgphoenix rebirth");
    }

    return m.reply(claraWrap("RPG Phoenix", lines, "info"));
  } catch (e) {
    console.error("[RpgPhoenix]", e);
    return m.reply(claraWrap("RPG Phoenix", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
