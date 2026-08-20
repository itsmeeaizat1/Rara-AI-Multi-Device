// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Roulette — Roda roulette, taruh angka/warna untuk menang besar
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgroulette",
  alias: ["rouletterpg", "rolet", "roletgame", "spinrolet", "rodaangka"],
  category: "rpg",
  description: "RPG Roulette — Roda roulette, taruh angka/warna untuk menang",
  usage: ".rpgroulette <tipe> <nomor/warna> <gold>\n.rpgroulette help — Panduan",
  example: ".rpgroulette number 7 1000\n.rpgroulette color red 500",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const MIN_BET = 100;
const MAX_BET = 10000;

// European roulette 0-36
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

function spin() {
  return Math.floor(Math.random() * 37); // 0-36
}

function getColor(num) {
  if (num === 0) return "green";
  if (RED_NUMBERS.includes(num)) return "red";
  return "black";
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const betType = args[0]?.toLowerCase();

    if (!betType || betType === "help") {
      return m.reply(claraWrap("RPG Roulette", [
        "ROULETTE RPG (Eropa 0-36)",
        "",
        "JENIS TARUHAN:",
        "1. number <0-36> — 36x payout",
        "2. color <red/black> — 2x payout",
        "3. even / odd — 2x payout",
        "4. low (1-18) / high (19-36) — 2x payout",
        "5. dozen <1/2/3> — 3x payout",
        "",
        "Min bet: " + MIN_BET + " | Max bet: " + MAX_BET,
        "",
        "CONTOH:",
        usedPrefix + "rpgroulette number 7 1000",
        usedPrefix + "rpgroulette color red 500",
        usedPrefix + "rpgroulette even 300",
        usedPrefix + "rpgroulette dozen 1 2000",
      ], "info"));
    }

    let goldBet = 0;
    let target = null;

    if (betType === "number") {
      target = parseInt(args[1]);
      goldBet = parseInt(args[2]) || 0;
      if (isNaN(target) || target < 0 || target > 36) {
        return m.reply(claraWrap("RPG Roulette", "Nomor tidak valid (0-36)", "warn"));
      }
    } else if (betType === "color") {
      target = args[1]?.toLowerCase();
      goldBet = parseInt(args[2]) || 0;
      if (!["red", "black"].includes(target)) {
        return m.reply(claraWrap("RPG Roulette", "Warna: red atau black", "warn"));
      }
    } else if (["even", "odd"].includes(betType)) {
      goldBet = parseInt(args[1]) || 0;
    } else if (["low", "high"].includes(betType)) {
      goldBet = parseInt(args[1]) || 0;
    } else if (betType === "dozen") {
      target = parseInt(args[1]);
      goldBet = parseInt(args[2]) || 0;
      if (isNaN(target) || target < 1 || target > 3) {
        return m.reply(claraWrap("RPG Roulette", "Dozen: 1 (1-12), 2 (13-24), 3 (25-36)", "warn"));
      }
    } else {
      return m.reply(claraWrap("RPG Roulette", "Tipe tidak valid. Ketik " + usedPrefix + "rpgroulette help", "warn"));
    }

    if (goldBet < MIN_BET) return m.reply(claraWrap("RPG Roulette", "Min bet: " + MIN_BET, "warn"));
    if (goldBet > MAX_BET) return m.reply(claraWrap("RPG Roulette", "Max bet: " + MAX_BET, "warn"));

    const player = ensurePlayer(m);
    if ((player.gold || 0) < goldBet) {
      return m.reply(claraWrap("RPG Roulette", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
    }

    addGold(m, -goldBet);

    // Spin
    const result = spin();
    const color = getColor(result);

    // Determine payout
    let won = false;
    let multiplier = 0;

    if (betType === "number" && result === target) {
      won = true; multiplier = 36;
    } else if (betType === "color" && color === target) {
      won = true; multiplier = 2;
    } else if (betType === "even" && result !== 0 && result % 2 === 0) {
      won = true; multiplier = 2;
    } else if (betType === "odd" && result % 2 === 1) {
      won = true; multiplier = 2;
    } else if (betType === "low" && result >= 1 && result <= 18) {
      won = true; multiplier = 2;
    } else if (betType === "high" && result >= 19 && result <= 36) {
      won = true; multiplier = 2;
    } else if (betType === "dozen") {
      const min = (target - 1) * 12 + 1;
      const max = target * 12;
      if (result >= min && result <= max) { won = true; multiplier = 3; }
    }

    const colorEmoji = color === "red" ? "🔴" : color === "black" ? "⚫" : "🟢";

    const lines = [
      "ROULETTE RPG",
      "Taruhan: " + goldBet + " gold (" + betType + (target !== null ? " " + target : "") + ")",
      "",
      "Roda berhenti di: " + colorEmoji + " " + result + " (" + color + ")",
    ];

    if (won) {
      const winnings = goldBet * multiplier;
      addGold(m, winnings);
      addExp(m, Math.round(winnings * 0.05));
      lines.push("");
      lines.push("MENANG! +" + winnings + " gold (" + multiplier + "x)");
      lines.push("Exp: +" + Math.round(winnings * 0.05));
    } else {
      lines.push("");
      lines.push("Kalah! -" + goldBet + " gold");
    }

    savePlayer(m, player);
    lines.push("Gold: " + (player.gold || 0));

    return m.reply(claraWrap("RPG Roulette", lines, won ? "info" : "warn"));
  } catch (e) {
    console.error("[RpgRoulette]", e);
    return m.reply(claraWrap("RPG Roulette", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
