// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Casino — Gamble your gold (slot machine)

import {
  ensureRpg, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "casinorpg",
  alias: ["casinorpg", "casino", "slotrpg"],
  category: "rpg",
  description: "Casino slot machine untuk gambling gold",
  usage: ".casinorpg <jumlah>",
  example: ".casinorpg 100",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CASINO_COOLDOWN = 30 * 1000;
const MIN_BET = 10;
const MAX_BET = 10000;

const SLOTS = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];

const PAYOUT = {
  "💎": 50,   // 3 diamond = 50x
  "7️⃣": 30,  // 3 seven = 30x
  "⭐": 15,   // 3 star = 15x
  "🔔": 10,   // 3 bell = 10x
  "🍇": 7,    // 3 grape = 7x
  "🍊": 5,    // 3 orange = 5x
  "🍋": 3,    // 3 lemon = 3x
  "🍒": 2,    // 3 cherry = 2x
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("casinorpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const bet = parseInt(args[0]);

    if (!bet || bet < MIN_BET) {
      return m.reply(claraWrap("casinorpg", `Minimal bet *${MIN_BET} gold*. Contoh: .casinorpg 100`, "warn"));
    }

    if (bet > MAX_BET) {
      return m.reply(claraWrap("casinorpg", `Maksimal bet *${MAX_BET} gold* per putaran.`, "warn"));
    }

    if (rpg.gold < bet) {
      await m.react("🚫");
      return m.reply(claraWrap("casinorpg", `Gold tidak cukup! Kamu punya *${rpg.gold} gold*, butuh *${bet}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastGacha");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("casinorpg", `Cooldown casino tersisa *${formatTime(cd)}*`, "warn"));
    }

    await m.react("🕒");

    // Spin
    removeGold(m, bet, sock);

    const s1 = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const s2 = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const s3 = SLOTS[Math.floor(Math.random() * SLOTS.length)];

    let multiplier = 0;
    let result = "";

    if (s1 === s2 && s2 === s3) {
      // 3 match
      multiplier = PAYOUT[s1] || 2;
      result = "JACKPOT!";
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      // 2 match
      multiplier = 1.5;
      result = "Mini Win!";
    } else {
      multiplier = 0;
      result = "Zonk!";
    }

    const payout = Math.floor(bet * multiplier);

    if (payout > 0) {
      addGold(m, payout);
    }

    setCooldown(m, "lastGacha", CASINO_COOLDOWN);

    await m.react("🐣");
    let msg = `╭─「 ᴄᴀsɪɴᴏ 」\n`;
    msg += `│ 🎰 ${s1} | ${s2} | ${s3}\n`;
    msg += `│\n`;
    msg += `│ 📊 Hasil: *${result}*\n`;

    if (payout > 0) {
      msg += `│ 💰 Multiplier: *${multiplier}x*\n`;
      msg += `│ 💵 Bet: *${bet} gold*\n`;
      msg += `│ 🎉 Menang: *+${payout - bet} gold* (net)\n`;
    } else {
      msg += `│ 💵 Bet: *${bet} gold*\n`;
      msg += `│ 💸 Kalah: *-${bet} gold*\n`;
    }

    msg += `│\n`;
    msg += `│ 💼 Gold: *${rpg.gold - bet + payout}*\n`;
    msg += `╰──────────`;

    return m.reply(msg);
  } catch (err) {
    console.error("casinorpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("casinorpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
