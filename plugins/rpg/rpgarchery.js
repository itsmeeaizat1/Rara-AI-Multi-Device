// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Archery — Panah target, semakin akurat semakin besar hadiah
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgarchery",
  alias: ["archeryrpg", "panah", "memanah", "panahrpg", "arrowgame"],
  category: "rpg",
  description: "RPG Archery — Bidik target panah, akurasi menentukan hadiah",
  usage: ".rpgarchery <biaya> — Mulai bidik\n.rpgarchery <biaya> <power 1-10> — Tentukan kekuatan",
  example: ".rpgarchery 500\n.rpgarchery 500 7",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 8,
  isEnabled: true,
};

const MIN_COST = 200;
const MAX_COST = 5000;

// Target rings: bullseye = best, outer = worst
const RINGS = [
  { name: "Bullseye", emoji: "🎯", minDist: 0, maxDist: 5, goldMult: 5, exp: 200, desc: "Sempurna!" },
  { name: "Inner Ring", emoji: "🔴", minDist: 6, maxDist: 15, goldMult: 3, exp: 100, desc: "Sangat bagus!" },
  { name: "Middle Ring", emoji: "🟡", minDist: 16, maxDist: 30, goldMult: 2, exp: 50, desc: "Cukup bagus" },
  { name: "Outer Ring", emoji: "🔵", minDist: 31, maxDist: 50, goldMult: 1, exp: 20, desc: "Lumayan" },
  { name: "Miss", emoji: "❌", minDist: 51, maxDist: 999, goldMult: 0, exp: 0, desc: "Meleset!" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const cost = parseInt(args[0]) || 0;
    const power = parseInt(args[1]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Archery", [
        "Biaya main: " + MIN_COST + " - " + MAX_COST + " gold",
        "",
        "CARA PAKAI:",
        usedPrefix + "rpgarchery <biaya> <power 1-10>",
        "Power 1-3: Lemah tapi stabil",
        "Power 4-7: Optimal",
        "Power 8-10: Kuat tapi riskan",
        "",
        "Contoh: " + usedPrefix + "rpgarchery 500 7",
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Archery", "Max biaya: " + MAX_COST + " gold", "warn"));
    }

    const player = ensurePlayer(m);
    if ((player.gold || 0) < cost) {
      return m.reply(claraWrap("RPG Archery", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
    }

    if ((player.stamina || 100) < 10) {
      return m.reply(claraWrap("RPG Archery", "Stamina kurang! Butuh 10. Punya: " + (player.stamina || 0), "warn"));
    }

    // If no power specified, show aim screen
    if (!power || power < 1 || power > 10) {
      return m.reply(claraWrap("RPG Archery", [
        "BIDIK PANAH",
        "Biaya: " + cost + " gold",
        "Stamina: -10",
        "",
        "Pilih kekuatan tarikan busur (1-10):",
        "1-3: Lemah, akurat tapi hadiah kecil",
        "4-7: Optimal, balance power & akurasi",
        "8-10: Kuat, hadiah besar tapi mudah meleset",
        "",
        "Ketik: " + usedPrefix + "rpgarchery " + cost + " <power>",
      ], "info"));
    }

    // Deduct cost & stamina
    addGold(m, -cost);
    player.stamina = Math.max(0, (player.stamina || 100) - 10);

    // Calculate accuracy
    // Ideal power = 5-7. Too low or too high = less accurate
    const idealPower = 6;
    const powerDeviation = Math.abs(power - idealPower);

    // Random factor (skill + luck)
    const windFactor = (Math.random() - 0.5) * 20; // -10 to +10
    const accuracyScore = 50 - (powerDeviation * 8) + windFactor;
    const distance = Math.max(0, Math.round(accuracyScore * -1 + 50));

    // Find ring
    const ring = RINGS.find(r => distance >= r.minDist && distance <= r.maxDist) || RINGS[RINGS.length - 1];

    // Calculate reward
    let goldReward = 0;
    let expReward = ring.exp;

    if (ring.goldMult > 0) {
      goldReward = cost * ring.goldMult;
      addGold(m, goldReward);
    }

    if (expReward > 0) addExp(m, expReward);

    savePlayer(m, player);

    // Visual target
    const targetVisual = [
      "      🎯      ",
      "    ┌─────┐    ",
      "   /  " + (distance <= 5 ? "X" : "·") + "  \\   ",
      "  /  " + (distance <= 15 && distance > 5 ? "X" : "·") + " " + (distance <= 5 ? "X" : "·") + "  \\  ",
      "  \\ " + (distance <= 30 && distance > 15 ? "X" : "·") + " " + (distance <= 5 ? "X" : "·") + " " + (distance <= 15 && distance > 5 ? "X" : "·") + " / ",
      "   \\  " + (distance <= 50 && distance > 30 ? "X" : "·") + "  /   ",
      "    └─────┘    ",
    ];

    const lines = [
      "HASIL PANAHAN",
      "Power: " + power + "/10 | Biaya: " + cost + " gold",
      "Akurasi: " + Math.max(0, Math.round(100 - distance * 2)) + "%",
      "",
      ring.emoji + " " + ring.name + " — " + ring.desc,
      "",
    ];

    if (goldReward > 0) {
      lines.push("Gold: +" + goldReward + " (" + ring.goldMult + "x)");
      lines.push("Exp: +" + expReward);
    } else {
      lines.push("Meleset! Tidak dapat hadiah");
    }

    lines.push("");
    lines.push("Stamina: " + (player.stamina || 0) + "/100");
    lines.push("Gold: " + (player.gold || 0));

    return m.reply(claraWrap("RPG Archery", lines, ring.goldMult > 0 ? "info" : "warn"));
  } catch (e) {
    console.error("[RpgArchery]", e);
    return m.reply(claraWrap("RPG Archery", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
