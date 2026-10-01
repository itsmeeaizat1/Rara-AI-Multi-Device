// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Casino — Gamble your gold (slot machine)

import {
  ensureRpg, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/rara-rpg-service.js";
import { reactCooldown } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA, raraRpgBox } from "../../src/lib/rara-games.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "casino",
  alias: ["casino", "casinorpg", "slotrpg"],
  category: "rpg",
  description: "Casino slot machine untuk gambling gold",
  usage: ".casino <jumlah>",
  example: ".casino 100",
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
    if (!rpg) return m.reply(raraRpgBox("casinorpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const bet = parseInt(args[0]);

    if (!bet || bet < MIN_BET) {
  await animGeneric(m, sock, "🎰", "Casino");
      return m.reply(raraRpgBox("casinorpg", `Minimal bet *${MIN_BET} gold*. Contoh: .casinorpg 100`, "warn"));
    }

    if (bet > MAX_BET) {
      return m.reply(raraRpgBox("casinorpg", `Maksimal bet *${MAX_BET} gold* per putaran.`, "warn"));
    }

    if (rpg.gold < bet) {
      await m.react("🚫");
      return m.reply(raraRpgBox("casinorpg", `Gold tidak cukup! Kamu punya *${rpg.gold} gold*, butuh *${bet}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastGacha");
    if (cd) {
      await reactCooldown(m);
      return m.reply(raraRpgBox("casinorpg", `Cooldown casino tersisa *${formatTime(cd)}*`, "warn"));
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
    return m.reply(raraGameBox({
      title: "casinorpg", icon: "🎰",
      flavor: result === "JACKPOT!" ? "🎊 *JACKPOT!*" : payout > 0 ? "🎉 *MENANG!*" : "💸 *ZONK!*",
      body: [
        `🎰 ${s1} | ${s2} | ${s3}`,
        "",
        `│ • 📊 Hasil : ${result}`,
        ...(payout > 0 ? [
          `│ • 💰 Multiplier : ${multiplier}x`,
          `│ • 💵 Bet : ${bet} gold`,
          `│ • 🎉 Menang : +${payout - bet} gold (net)`,
        ] : [
          `│ • 💵 Bet : ${bet} gold`,
          `│ • 💸 Kalah : -${bet} gold`,
        ]),
        "",
        `│ • 💼 Gold : ${rpg.gold - bet + payout}`,
      ].join("\n"),
      cta: gameCTA("casinorpg"),
    }));
  } catch (err) {
    console.error("casinorpg error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("casinorpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
