// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Tutor — Personalized learning assistant

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "tutorai",
  alias: ["tutorai", "aitutor", "belajarai", "guruai"],
  category: "ai",
  description: "AI jadi tutor pribadi — jelaskan konsep dengan analogi sederhana",
  usage: ".tutorai <topik/pertanyaan>",
  example: ".tutorai jelaskan fotosintesis dengan analogi dapur",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("tutorai", `Mau belajar apa hari ini?\n\nContoh:\n${m.prefix}tutorai jelaskan fotosintesis\n${m.prefix}tutorai cara kerja blockchain\n${m.prefix}tutorai beda AC dan DC`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Kamu adalah seorang guru/tutor yang sabar dan jago menjelaskan konsep sulit dengan analogi sederhana. Jelaskan: "${text}". Format jawaban:

PENGERTIAN: [penjelasan singkat dalam 1-2 kalimat]
ANALOGI: [analogi sederhana dari kehidupan sehari-hari]
PENJELASAN: [penjelasan detail tapi mudah dipahami, maks 4-5 kalimat]
CONTOH: [contoh nyata]
RANGKUMAN: [rangkuman dalam 1 kalimat]

Gunakan bahasa Indonesia yang santai dan mudah dimengerti.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("tutorai", "Tutor-nya lagi istirahat 📚", "error"));
    }

    const lines = result.answer.trim().split("\n");
    let formatted = "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("PENGERTIAN:")) {
        formatted += `│ 📖 *ᴘᴇɴɢᴇʀᴛɪᴀɴ*\n│ ${t.replace("PENGERTIAN:", "").trim()}\n│\n`;
      } else if (t.startsWith("ANALOGI:")) {
        formatted += `│ 💡 *ᴀɴᴀʟᴏɢɪ*\n│ ${t.replace("ANALOGI:", "").trim()}\n│\n`;
      } else if (t.startsWith("PENJELASAN:")) {
        formatted += `│ 📝 *ᴘᴇɴᴊᴇʟᴀsᴀɴ*\n│ ${t.replace("PENJELASAN:", "").trim()}\n│\n`;
      } else if (t.startsWith("CONTOH:")) {
        formatted += `│ ✅ *ᴄᴏɴᴛᴏʜ*\n│ ${t.replace("CONTOH:", "").trim()}\n│\n`;
      } else if (t.startsWith("RANGKUMAN:")) {
        formatted += `│ 📌 *ʀᴀɴɢᴋᴜᴍᴀɴ*\n│ ${t.replace("RANGKUMAN:", "").trim()}\n`;
      } else {
        formatted += `│ ${t}\n`;
      }
    }

    if (!formatted) {
      formatted = `│ ${result.answer.trim()}\n`;
    }

    await m.react("🐣");
    let msg = `╭──「 *ᴛᴜᴛᴏʀ ᴀɪ* 」\n`;
    msg += `│ 📚 Topik: *${text}*\n`;
    msg += `│\n`;
    msg += formatted;
    msg += `│\n`;
    msg += `│ 📌 Mau tanya lagi? Ketik .tutorai <topik>\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("tutorai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tutorai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
