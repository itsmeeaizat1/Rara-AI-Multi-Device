// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Hilo — Guess higher or lower card game

import {
  ensureRpg, addExp, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap, reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { animHiLo } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "hilorpg",
  alias: ["hilorpg", "hilo", "tinggirendah"],
  category: "rpg",
  description: "Tebak kartu lebih tinggi atau lebih rendah (mini-game)",
  usage: ".hilorpg <bet> <high|low>",
  example: ".hilorpg 100 high",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const HILO_COOLDOWN = 15 * 1000;
const MIN_BET = 10;
const MAX_BET = 5000;
const MAX_ROUNDS = 5;

const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function drawCard() {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const value = RANKS.indexOf(rank) + 1; // 1-13
  return { rank, suit, value, display: `${rank}${suit}` };
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("hilorpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const bet = parseInt(args[0]);
    const guess = args[1]?.toLowerCase();

    if (!bet || bet < MIN_BET) {
      return m.reply(claraWrap("hilorpg", `Minimal bet *${MIN_BET} gold*. Contoh: .hilorpg 100 high`, "warn"));
    }

    if (bet > MAX_BET) {
      return m.reply(claraWrap("hilorpg", `Maksimal bet *${MAX_BET} gold*.`, "warn"));
    }

    if (!guess || !["high", "low", "tinggi", "rendah", "h", "l"].includes(guess)) {
      return m.reply(claraWrap("hilorpg", "Pilih *high* (tinggi) atau *low* (rendah). Contoh: .hilorpg 100 high", "warn"));
    }

    if (rpg.gold < bet) {
      await m.react("🚫");
      return m.reply(claraWrap("hilorpg", `Gold tidak cukup! Kamu punya *${rpg.gold}*, butuh *${bet}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastHilo");
    if (cd) {
      await reactCooldown(m);
      return m.reply(claraWrap("hilorpg", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
    }

    await m.react("🕒");
    await animHiLo(m, sock);

    removeGold(m, bet, sock);

    const isHigh = ["high", "tinggi", "h"].includes(guess);
    let currentCard = drawCard();
    let round = 1;
    let wins = 0;
    let multiplier = 0;
    let log = [];

    // Multi-round: draw up to MAX_ROUNDS, each correct doubles multiplier
    while (round <= MAX_ROUNDS) {
      const nextCard = drawCard();
      const correct = isHigh ? nextCard.value > currentCard.value : nextCard.value < currentCard.value;
      const same = nextCard.value === currentCard.value;

      log.push(`R${round}: ${currentCard.display} → ${nextCard.display} ${correct ? "✅" : same ? "🟰" : "❌"}`);

      if (same) {
        // Tie = lose
        break;
      }

      if (correct) {
        wins++;
        multiplier = Math.pow(2, wins); // 2x, 4x, 8x, 16x, 32x
        currentCard = nextCard;
        round++;
      } else {
        break;
      }
    }

    const payout = wins > 0 ? Math.floor(bet * multiplier) : 0;
    if (payout > 0) addGold(m, payout);

    // Small EXP reward
    const expGain = wins * 20;
    if (expGain > 0) addExp(m, expGain);

    setCooldown(m, "lastHilo", HILO_COOLDOWN);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "hilorpg", icon: "🃏",
      flavor: wins > 0 ? "🎉 *MENANG!*" : "💀 *KALAH!*",
      body: [
        `│ • 🃏 Tebakan : ${isHigh ? "TINGGI" : "RENDAH"}`,
        `│ • 💵 Bet : ${bet} gold`,
        "",
        ...log,
        "",
        ...(wins > 0
          ? [
              `│ • 🎉 Ronde menang : ${wins}`,
              `│ • 📊 Multiplier : ${multiplier}x`,
              `│ • 💰 Payout : ${payout} gold`,
              `│ • ✨ EXP : +${expGain}`,
            ]
          : [
              "Kalah di ronde pertama!",
              `│ • 💸 Rugi : -${bet} gold`,
            ]),
        "",
        `│ • 💼 Sisa gold : ${rpg.gold - bet + payout}`,
      ].join("\n"),
      cta: gameCTA("hilorpg"),
    }));
  } catch (err) {
    console.error("hilorpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("hilorpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
