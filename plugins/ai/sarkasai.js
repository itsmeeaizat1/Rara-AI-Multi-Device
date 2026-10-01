// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Sarkas — AI generates sarcastic comebacks

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "sarkasai",
  alias: ["sarkasai", "aisarkas", "sarcasm", "nyindirai"],
  category: "ai",
  description: "AI bikin kalimat sarkas/nyindir untuk situasi tertentu",
  usage: ".sarkasai <situasi/pernyataan>",
  example: ".sarkasai dia bilang aku ganteng banget\n.sarkasai temen aku telat lagi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(raraWrap("sarkasai", `Kasih situasinya dulu!\n\nContoh:\n${m.prefix}sarkasai temen aku telat lagi\n${m.prefix}sarkasai dia pamer beli iPhone baru`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan 3 kalimat sarkas/sindiran untuk situasi: "${text}". Sindiran harus:
- Tajam tapi tidak kasar
- Lucu dan bikin ngakak
- Pakai bahasa Indonesia casual/gaul
- Bisa dipakai langsung di chat WhatsApp

Format:
1. [sindiran 1]
2. [sindiran 2]
3. [sindiran 3]

Jangan pakai kata-kata kotor atau SARA.`;

    const result = await UnlimitedAI(prompt, "kobo-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("sarkasai", "AI-nya lagi baper 😤", "error"));
    }

    await m.react("🐣");
    let msg = `Situasi: ${text}\n\n${result.answer.trim()}\n\nPilih satu dan kirim! 😏`;
    return m.reply(msg);
  } catch (err) {
    console.error("sarkasai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("sarkasai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
