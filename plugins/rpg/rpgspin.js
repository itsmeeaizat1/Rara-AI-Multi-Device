// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Spin Wheel — Roda keberuntungan, putar untuk hadiah acak
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { pickRandom } from "../../src/lib/nova-rpg.js";

const pluginConfig = {
  name: "rpgspin",
  alias: ["spinwheel", "rodauntung", "putarroda", "spinrpg", "roda"],
  category: "rpg",
  description: "RPG Spin Wheel — Putar roda keberuntungan untuk hadiah acak",
  usage: ".rpgspin (biaya 500 gold)",
  example: ".rpgspin",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const SPIN_COST = 500;

// Roda: emoji, label, gold reward, exp reward, type
const WHEEL = [
  { emoji: "💩", label: "Kotoran", gold: 0, exp: 5, type: "miss" },
  { emoji: "🪙", label: "100 Gold", gold: 100, exp: 10, type: "small" },
  { emoji: "⚔️", label: "Exp Boost", gold: 50, exp: 80, type: "exp" },
  { emoji: "💎", label: "Diamond!", gold: 500, exp: 50, type: "big" },
  { emoji: "🪙", label: "200 Gold", gold: 200, exp: 15, type: "small" },
  { emoji: "💀", label: "Zonk", gold: 0, exp: 0, type: "miss" },
  { emoji: "💰", label: "Jackpot!", gold: 2000, exp: 200, type: "jackpot" },
  { emoji: "🪙", label: "50 Gold", gold: 50, exp: 5, type: "small" },
  { emoji: "🍀", label: "Lucky 300", gold: 300, exp: 30, type: "medium" },
  { emoji: "🎯", label: "Bullseye", gold: 800, exp: 100, type: "big" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    if (!player) return m.reply(claraWrap("RPG Spin", "Belum ada data RPG. Ketik .rpgmenu untuk mulai.", "warn"));

    if ((player.gold || 0) < SPIN_COST) {
      return m.reply(claraWrap("RPG Spin", [
        "Gold tidak cukup!",
        "Butuh: " + SPIN_COST + " gold",
        "Punya: " + (player.gold || 0) + " gold",
        "",
        "Kumpulkan gold lewat .daily .work .hunt",
      ], "warn"));
    }

    // Deduct cost
    addGold(m, -SPIN_COST);

    // Spin animation messages
    await m.reply(claraWrap("RPG Spin", [
      "Roda berputar...",
      "Biaya: " + SPIN_COST + " gold",
    ]));

    // Pick result
    const result = pickRandom(WHEEL);

    // Give rewards
    if (result.gold > 0) addGold(m, result.gold);
    if (result.exp > 0) addExp(m, result.exp);
    savePlayer(m, player);

    const netGold = result.gold - SPIN_COST;
    const lines = [
      "RODA BERHENTI DI:",
      result.emoji + " " + result.label,
      "",
      "Gold: " + (result.gold > 0 ? "+" : "") + result.gold + " (net: " + (netGold >= 0 ? "+" : "") + netGold + ")",
      "Exp: +" + result.exp,
    ];

    if (result.type === "jackpot") {
      lines.push("");
      lines.push("JACKPOT! Selamat!");
    } else if (result.type === "miss") {
      lines.push("");
      lines.push("Yah, coba lagi next time!");
    }

    lines.push("");
    lines.push("Gold sekarang: " + (player.gold || 0));
    lines.push("Cooldown: 10 detik");

    return m.reply(claraWrap("RPG Spin", lines, result.type === "miss" ? "warn" : "info"));
  } catch (e) {
    console.error("[RpgSpin]", e);
    return m.reply(claraWrap("RPG Spin", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
