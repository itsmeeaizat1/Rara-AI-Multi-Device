// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Casino v2 — Multi-game gambling hub (Slots, Dice, Coinflip, Roulette)

import {
  ensureRpg, removeGold, addGold, addExp,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "casinov2",
  alias: ["casinov2", "jackpot", "gamblev2"],
  category: "rpg",
  description: "Casino v2 — 4 game: Slot, Dice, Coinflip, Roulette (multi-bet)",
  usage: ".casinov2 <slot|dice|coinflip|roulette> <bet> [pilihan]",
  example: ".casinov2 slot 500",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CASINO_CD = 10 * 1000;
const MIN_BET = 10;
const MAX_BET = 20000;

const SLOTS = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];
const PAYOUT = { "💎": 50, "7️⃣": 30, "⭐": 15, "🔔": 10, "🍇": 7, "🍊": 5, "🍋": 3, "🍒": 2 };

// ── SLOT ──
function playSlot(bet) {
  const s1 = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const s2 = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const s3 = SLOTS[Math.floor(Math.random() * SLOTS.length)];

  let mult = 0, result = "Zonk!";
  if (s1 === s2 && s2 === s3) {
    mult = PAYOUT[s1] || 2;
    result = "JACKPOT!";
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    mult = 1.5;
    result = "Mini Win!";
  }
  return { s1, s2, s3, mult, result, payout: Math.floor(bet * mult) };
}

// ── DICE ──
function playDice(bet, guess) {
  const roll = Math.floor(Math.random() * 6) + 1;
  const win = roll === guess;
  return { roll, win, payout: win ? bet * 5 : 0 };
}

// ── COINFLIP ──
function playCoinflip(bet, guess) {
  const result = Math.random() < 0.5 ? "heads" : "tails";
  const win = result === guess;
  return { result, win, payout: win ? bet * 2 : 0 };
}

// ── ROULETTE ──
function playRoulette(bet, betType) {
  const number = Math.floor(Math.random() * 37); // 0-36
  const color = number === 0 ? "green" : (number % 2 === 0 ? "red" : "black");

  let win = false, mult = 0;

  if (betType === "red") { win = color === "red"; mult = 2; }
  else if (betType === "black") { win = color === "black"; mult = 2; }
  else if (betType === "green") { win = color === "green"; mult = 36; }
  else if (betType === "even") { win = number !== 0 && number % 2 === 0; mult = 2; }
  else if (betType === "odd") { win = number % 2 === 1; mult = 2; }
  else if (betType === "low") { win = number >= 1 && number <= 18; mult = 2; }
  else if (betType === "high") { win = number >= 19 && number <= 36; mult = 2; }
  else {
    const num = parseInt(betType);
    if (!isNaN(num) && num >= 0 && num <= 36) { win = number === num; mult = 36; }
  }

  return { number, color, win, payout: win ? Math.floor(bet * mult) : 0 };
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("casinov2", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const game = args[0]?.toLowerCase();
    const bet = parseInt(args[1]);

    // No game specified — show menu
    if (!game || game === "menu" || game === "list") {
      let msg = "";
      msg += `💰 Gold: *${rpg.gold}*\n`;
      msg += `
`;
      msg += `📋 *ɢᴀᴍᴇs*\n`;
      msg += `🎰 Slot — 3 reel, jackpot up to 50x\n`;
      msg += `.casinov2 slot <bet>\n`;
      msg += `🎲 Dice — tebak angka 1-6 (5x payout)\n`;
      msg += `.casinov2 dice <bet> <1-6>\n`;
      msg += `🪙 Coinflip — heads/tails (2x)\n`;
      msg += `.casinov2 coinflip <bet> <heads|tails>\n`;
      msg += `🎡 Roulette — red/black/green/number (2-36x)\n`;
      msg += `.casinov2 roulette <bet> <red|black|green|even|odd|low|high|0-36>\n`;
      msg += `
`;
      msg += `💵 Min: *${MIN_BET}* | Max: *${MAX_BET}*\n`;
            return m.reply(msg);
    }

    if (!bet || bet < MIN_BET) {
      return m.reply(claraWrap("casinov2", `Minimal bet *${MIN_BET} gold*.`, "warn"));
    }

    if (bet > MAX_BET) {
      return m.reply(claraWrap("casinov2", `Maksimal bet *${MAX_BET} gold*.`, "warn"));
    }

    if (rpg.gold < bet) {
      await m.react("🚫");
      return m.reply(claraWrap("casinov2", `Gold tidak cukup! Kamu punya *${rpg.gold}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastCasinoV2");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("casinov2", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
    }

    await m.react("🕒");
    removeGold(m, bet, sock);

    let result, msg = "";

    switch (game) {
      case "slot": {
        result = playSlot(bet);
        if (result.payout > 0) { addGold(m, result.payout); addExp(m, Math.floor(result.payout / 20)); }
        msg = "";
        msg += `🎰 ${result.s1} | ${result.s2} | ${result.s3}\n`;
        msg += `📊 ${result.result}\n`;
        msg += `
`;
        if (result.payout > 0) {
          msg += `💰 Multiplier: *${result.mult}x*\n`;
          msg += `💵 Payout: *${result.payout} gold*\n`;
        } else {
          msg += `💸 Rugi: *-${bet} gold*\n`;
        }
        break;
      }

      case "dice": {
        const guess = parseInt(args[2]);
        if (!guess || guess < 1 || guess > 6) {
          addGold(m, bet); // refund
          return m.reply(claraWrap("casinov2", "Tebak angka 1-6. Contoh: .casinov2 dice 500 3", "warn"));
        }
        result = playDice(bet, guess);
        if (result.win) { addGold(m, result.payout); addExp(m, 20); }
        msg = "";
        msg += `🎲 Kamu tebak: *${guess}*\n`;
        msg += `🎲 Hasil: *${result.roll}*\n`;
        msg += `
`;
        if (result.win) {
          msg += `🎉 Menang! (5x payout)\n`;
          msg += `💰 Payout: *${result.payout} gold*\n`;
        } else {
          msg += `💸 Rugi: *-${bet} gold*\n`;
        }
        break;
      }

      case "coinflip": {
        const guess = args[2]?.toLowerCase();
        if (!guess || !["heads", "tails", "kepala", "ekor"].includes(guess)) {
          addGold(m, bet); // refund
          return m.reply(claraWrap("casinov2", "Pilih heads/tails. Contoh: .casinov2 coinflip 500 heads", "warn"));
        }
        const normalized = ["kepala", "heads"].includes(guess) ? "heads" : "tails";
        result = playCoinflip(bet, normalized);
        if (result.win) { addGold(m, result.payout); addExp(m, 10); }
        msg = "";
        msg += `🪙 Kamu pilih: *${normalized}*\n`;
        msg += `🪙 Hasil: *${result.result}*\n`;
        msg += `
`;
        if (result.win) {
          msg += `🎉 Menang! (2x payout)\n`;
          msg += `💰 Payout: *${result.payout} gold*\n`;
        } else {
          msg += `💸 Rugi: *-${bet} gold*\n`;
        }
        break;
      }

      case "roulette": {
        const betType = args[2]?.toLowerCase();
        if (!betType) {
          addGold(m, bet); // refund
          return m.reply(claraWrap("casinov2", "Pilih: red/black/green/even/odd/low/high/0-36. Contoh: .casinov2 roulette 500 red", "warn"));
        }
        result = playRoulette(bet, betType);
        if (result.win) { addGold(m, result.payout); addExp(m, Math.floor(result.payout / 30)); }
        const colorEmoji = { red: "🔴", black: "⚫", green: "🟢" }[result.color];
        msg = "";
        msg += `🎡 Hasil: *${colorEmoji} ${result.number}*\n`;
        msg += `📌 Bet: *${betType}*\n`;
        msg += `
`;
        if (result.win) {
          msg += `🎉 Menang!\n`;
          msg += `💰 Payout: *${result.payout} gold*\n`;
        } else {
          msg += `💸 Rugi: *-${bet} gold*\n`;
        }
        break;
      }

      default:
        addGold(m, bet); // refund
        return m.reply(claraWrap("casinov2", "Game tidak dikenal. Ketik .casinov2 menu", "warn"));
    }

    setCooldown(m, "lastCasinoV2", CASINO_CD);
    msg += `💼 Gold: *${rpg.gold - bet + (result.payout || 0)}*\n`;
    
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("casinov2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("casinov2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
