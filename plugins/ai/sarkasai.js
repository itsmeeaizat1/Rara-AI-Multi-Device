// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Sarkas — AI generates sarcastic comebacks

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

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
      return m.reply(claraWrap("sarkasai", `Kasih situasinya dulu!\n\nContoh:\n${m.prefix}sarkasai temen aku telat lagi\n${m.prefix}sarkasai dia pamer beli iPhone baru`, "guide"));
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
      return m.reply(claraWrap("sarkasai", "AI-nya lagi baper 😤", "error"));
    }

    await m.react("🐣");
    let msg = `╭──「 *sᴀʀᴋᴀs ᴀɪ* 」\n`;
    msg += `│ 🗯️ Situasi: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `│\n`;
    msg += `│ 📌 Pilih satu dan kirim! 😏\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("sarkasai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("sarkasai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
