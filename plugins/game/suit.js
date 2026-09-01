// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// suit.js — Batu Gunting Kertas vs Bot (single player, no API needed)

import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";

const pluginConfig = {
  name: "suit",
  alias: ["suit", "batuguntingkertas", "suitor"],
  category: "game",
  description: "Batu Gunting Kertas vs Bot",
  usage: ".suit <batu/gunting/kertas>",
  example: ".suit batu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const CHOICES = ["batu", "gunting", "kertas"];
const EMOJI = { batu: "🪨", gunting: "✂️", kertas: "📄" };

function getResult(player, bot) {
  if (player === bot) return "seri";
  const wins = { batu: "gunting", gunting: "kertas", kertas: "batu" };
  return wins[player] === bot ? "menang" : "kalah";
}

async function handler(m, { args, prefix }) {
  const pilihan = (args[0] || "").toLowerCase().trim();

  if (!pilihan) {
    return m.reply(novaGuide("Suit", "Pilih batu, gunting, atau kertas nih!", ".suit batu"));
  }

  if (!CHOICES.includes(pilihan)) {
    return m.reply(novaError("Suit", `Pilihan gak valid nih! Ketik: batu, gunting, atau kertas`));
  }

  // Bot picks random
  const botPick = CHOICES[Math.floor(Math.random() * CHOICES.length)];
  const result = getResult(pilihan, botPick);

  let text = "";
  if (result === "menang") {
    const expGain = 5 + Math.floor(Math.random() * 10);
    text = `╭─「 SUIT 」\n`;
    text += `┊ Kamu: ${EMOJI[pilihan]} ${pilihan}\n`;
    text += `┊ Bot: ${EMOJI[botPick]} ${botPick}\n`;
    text += `┊\n`;
    text += `┊ 🎉 Kamu menang! +${expGain} EXP\n`;
    text += `╰──────────`;
    try { await addExpWithLevelCheck(m.sender, expGain, m); } catch {}
  } else if (result === "kalah") {
    text = `╭─「 SUIT 」\n`;
    text += `┊ Kamu: ${EMOJI[pilihan]} ${pilihan}\n`;
    text += `┊ Bot: ${EMOJI[botPick]} ${botPick}\n`;
    text += `┊\n`;
    text += `┊ 😂 Kamu kalah! Coba lagi ya\n`;
    text += `╰──────────`;
  } else {
    text = `╭─「 SUIT 」\n`;
    text += `┊ Kamu: ${EMOJI[pilihan]} ${pilihan}\n`;
    text += `┊ Bot: ${EMOJI[botPick]} ${botPick}\n`;
    text += `┊\n`;
    text += `┊ 🤝 Seri! Pilih lagi\n`;
    text += `╰──────────`;
  }

  await m.reply(text);
}

export { pluginConfig as config, handler };
