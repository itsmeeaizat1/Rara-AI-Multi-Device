// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// dicebattle.js — Dice Battle vs AI (2d6, bet gold)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animDice } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "dicebattle",
  alias: ["dicebattle", "dadubattle", "diceduel", "dicefight"],
  category: "rpg",
  description: "Dadu battle vs AI — 2d6, highest total menang",
  usage: ".dicebattle <bet>",
  example: ".dicebattle 500",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const DICE_EMOJI = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

async function handler(m, { sock }) {
  try {
    const bet = parseInt(m.args[0] || "0");
    if (!bet || bet < 50) {
      return m.reply(claraWrap("dicebattle", `Masukkan bet minimal 50 gold.\n\nContoh: ${m.prefix}dicebattle 500`, "guide"));
    }
    if (bet > 5000) {
      return m.reply(claraWrap("dicebattle", "Bet maksimal 5000 gold.", "error"));
    }

    const db = await getDatabase();
    try {
      const gold = await db.getGold?.(m.sender) || 0;
      if (gold < bet) {
        await m.react("❌");
        return m.reply(claraWrap("dicebattle", `Gold tidak cukup! Kamu punya ${gold}, butuh ${bet}.`, "error"));
      }
    } catch {}

    await m.react("🕒");
    await animDice(m, sock);

    // Roll
    const p1 = rollDice(), p2 = rollDice();
    const e1 = rollDice(), e2 = rollDice();
    const pTotal = p1 + p2;
    const eTotal = e1 + e2;
    const isDouble = p1 === p2;
    const isDoubleEnemy = e1 === e2;

    // Determine winner
    let result, reward;
    if (pTotal > eTotal) {
      result = "MENANG";
      reward = isDouble ? Math.floor(bet * 1.5) : bet;
      try { await db.addGold?.(m.sender, reward); } catch {}
    } else if (pTotal < eTotal) {
      result = "KALAH";
      reward = -bet;
      try { await db.minGold?.(m.sender, bet); } catch {}
    } else {
      result = "SERI";
      reward = 0;
    }

    await m.react("🐣");

    let msg = "";
    msg += `Bet: *${bet} gold*\n`;
    msg += `
`;
    msg += `🎲 Kamu: ${DICE_EMOJI[p1-1]} ${DICE_EMOJI[p2-1]} = *${pTotal}*${isDouble ? " (DOUBLE!)" : ""}\n`;
    msg += `🎲 AI:    ${DICE_EMOJI[e1-1]} ${DICE_EMOJI[e2-1]} = *${eTotal}*${isDoubleEnemy ? " (DOUBLE!)" : ""}\n`;
    msg += `
`;
    if (result === "MENANG") {
      msg += `🏆 *${result}!*\n`;
      msg += `Reward: +${reward} gold${isDouble ? " (DOUBLE BONUS +50%)" : ""}\n`;
    } else if (result === "KALAH") {
      msg += `💀 *${result}!*\n`;
      msg += `Kehilangan: ${bet} gold\n`;
    } else {
      msg += `🤝 *SERI!* Bet dikembalikan.\n`;
    }
        return m.reply(msg);
  } catch (err) {
    console.error("dicebattle error:", err);
    await m.react("❌");
    return m.reply(claraWrap("dicebattle", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
