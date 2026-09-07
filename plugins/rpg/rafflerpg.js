// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Raffle — Lottery ticket for a chance at big jackpot

import {
  ensureRpg, addGold, removeGold, addGems, addExp,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "rafflerpg",
  alias: ["rafflerpg", "raffle", "lotere"],
  category: "rpg",
  description: "Beli tiket lotere — jackpot hingga 50.000 gold",
  usage: ".rafflerpg <buy|cek>",
  example: ".rafflerpg buy",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TICKET_PRICE = 100;
const RAFFLE_COOLDOWN = 60 * 1000;

// Prize tiers
const PRIZES = [
  { chance: 0.5, type: "jackpot", gold: 50000, label: "JACKPOT!" },
  { chance: 2, type: "big", gold: 10000, label: "Big Win!" },
  { chance: 8, type: "medium", gold: 2000, label: "Medium Win" },
  { chance: 25, type: "small", gold: 500, label: "Small Win" },
  { chance: 40, type: "tiny", gold: 150, label: "Tiny Win" },
  // 24.5% = zonk
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("rafflerpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    if (!action || action === "cek" || action === "info") {
      let msg = "";
      msg += `🎫 Lotere RPG — Coba keberuntunganmu!\n`;
      msg += `
`;
      msg += `💵 Harga tiket: *${TICKET_PRICE} gold*\n`;
      msg += `💼 Gold kamu: *${rpg.gold}*\n`;
      msg += `
`;
      msg += `📊 *ᴘʀɪᴢᴇ ᴛɪᴇʀs*\n`;
      msg += `🎯 Jackpot: *50.000 gold* (0.5%)\n`;
      msg += `🥇 Big Win: *10.000 gold* (2%)\n`;
      msg += `🥈 Medium: *2.000 gold* (8%)\n`;
      msg += `🥉 Small: *500 gold* (25%)\n`;
      msg += `🎁 Tiny: *150 gold* (40%)\n`;
      msg += `💀 Zonk: *nothing* (24.5%)\n`;
      msg += `
`;
      msg += `📌 .rafflerpg buy — beli & buka tiket\n`;
      
      return m.reply(novaRpgBox("rafflerpg", msg));
    }

    if (action !== "buy" && action !== "beli") {
  await animGeneric(m, sock, "🎟️", "Raffle Draw");
      return m.reply(novaRpgBox("rafflerpg", "Gunakan .rafflerpg buy atau .rafflerpg cek", "warn"));
    }

    const cd = checkCooldown(m, "lastRaffle");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("rafflerpg", `Cooldown raffle tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.gold < TICKET_PRICE) {
      await m.react("🚫");
      return m.reply(novaRpgBox("rafflerpg", `Gold tidak cukup! Tiket harga *${TICKET_PRICE}*, kamu punya *${rpg.gold}*.`, "warn"));
    }

    await m.react("🕒");

    removeGold(m, TICKET_PRICE, sock);

    // Roll prize
    let roll = Math.random() * 100;
    let prize = null;
    for (const p of PRIZES) {
      if (roll < p.chance) {
        prize = p;
        break;
      }
      roll -= p.chance;
    }

    setCooldown(m, "lastRaffle", RAFFLE_COOLDOWN);

    if (!prize) {
      // Zonk
      await m.react("🐣");
      return m.reply(novaGameBox({
        title: "rafflerpg", icon: "🎟️",
        flavor: "💀 *ZONK!*",
        body: [
          "Tiket dibuka... tapi tidak menang apapun!",
          "",
          `│ • 🎫 Tiket : ${TICKET_PRICE} gold`,
          `│ • 💰 Gold : ${rpg.gold - TICKET_PRICE}`,
          "",
          "Coba lagi ya! Jackpot 50.000 gold menunggu",
        ].join("\n"),
        cta: gameCTA("rafflerpg"),
      }));
    }

    // Give prize
    addGold(m, prize.gold);
    const expGain = Math.floor(prize.gold / 10);
    addExp(m, expGain);

    // Jackpot bonus: gems
    let gemsBonus = 0;
    if (prize.type === "jackpot") {
      addGems(m, 10);
      gemsBonus = 10;
    } else if (prize.type === "big") {
      addGems(m, 3);
      gemsBonus = 3;
    }

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "rafflerpg", icon: "🎟️",
      flavor: `🎉 *${prize.label.toUpperCase()}*`,
      body: [
        `│ • 🎫 Tiket : ${TICKET_PRICE} gold`,
        `│ • 🎁 Hadiah : +${prize.gold} gold`,
        `│ • ✨ EXP : +${expGain}`,
        ...(gemsBonus ? [`│ • 💎 Bonus gems : +${gemsBonus}`] : []),
        `│ • 💰 Gold : ${rpg.gold - TICKET_PRICE + prize.gold}`,
      ].join("\n"),
      cta: gameCTA("rafflerpg"),
    }));
  } catch (err) {
    console.error("rafflerpg error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("rafflerpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
