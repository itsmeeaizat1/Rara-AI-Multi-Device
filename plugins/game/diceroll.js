// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Dadu — Random dice sticker
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "diceroll",
  alias: ["dadu"],
  aliases: ["dadu", "dice", "kocokdadu"],
  category: "game",
  description: "Kocok dadu acak (sticker)",
  usage: ".diceroll",
  example: ".diceroll",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 1, isEnabled: true,
};

const DICE = [
  "https://telegra.ph/file/9f60e4cdbeb79fc6aff7.png",
  "https://telegra.ph/file/797f86e444755282374ef.png",
  "https://telegra.ph/file/970d2a7656ada7c579b69.png",
  "https://telegra.ph/file/0470d295e00ebe789fb4d.png",
  "https://telegra.ph/file/a9d7332e7ba1d1d26a2be.png",
  "https://telegra.ph/file/99dcd999991a79f9ba0c0.png",
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const url = DICE[Math.floor(Math.random() * DICE.length)];
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    await sock.sendImageAsSticker(m.chat, buf, m, { packname: "Nova AI", author: "Dadu" });
    await m.react("🐣");
  } catch (e) {
    console.error("dadu error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("dadu", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
