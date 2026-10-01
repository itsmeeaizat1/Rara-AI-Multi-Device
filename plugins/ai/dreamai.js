// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Dream — AI interprets dreams

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "mimpiai",
  alias: ["mimpiai", "aimimpi", "tafsirmimpiai"],
  category: "ai",
  description: "AI menafsirkan mimpi kamu dengan analisis psikologis dan spiritual",
  usage: ".mimpiai <cerita mimpi kamu>",
  example: ".mimpai saya bermimpi terbang di atas lautan",
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
      return m.reply(claraWrap("mimpiai", `Ceritakan mimpimu!\n\nContoh: ${m.prefix}mimpiai saya bermimpi terbang di atas lautan biru\n${m.prefix}mimpiai mimpi ketemu almarhum nenek`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Saya bermimpi: "${text}". Tolong tafsirkan mimpi saya dengan format:

MAKNA UTAMA: [artian umum mimpi ini]
ASPEK PSIKOLOGIS: [kaitan dengan kondisi mental/emosional]
ASPEK SPIRITUAL: [makna dari sisi spiritual/religious]
PREDIKSI: [jika ada, apa yang mungkin terjadi]
SARAN: [apa yang harus saya lakukan]

Gunakan bahasa Indonesia, tafsir dengan bijak dan positif. Jangan menakut-nakuti.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("mimpiai", "AI-nya lagi tidur nih 😴", "error"));
    }

    const lines = result.answer.trim().split("\n");
    let formatted = "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("MAKNA UTAMA:")) {
        formatted += `🌙 *makna utama*\n`;
        formatted += `${t.replace("MAKNA UTAMA:", "").trim()}

`;
      } else if (t.startsWith("ASPEK PSIKOLOGIS:")) {
        formatted += `🧠 *aspek psikologis*\n`;
        formatted += `${t.replace("ASPEK PSIKOLOGIS:", "").trim()}

`;
      } else if (t.startsWith("ASPEK SPIRITUAL:")) {
        formatted += `*aspek spiritual*\n`;
        formatted += `${t.replace("ASPEK SPIRITUAL:", "").trim()}

`;
      } else if (t.startsWith("PREDIKSI:")) {
        formatted += `🔮 *prediksi*\n`;
        formatted += `${t.replace("PREDIKSI:", "").trim()}

`;
      } else if (t.startsWith("SARAN:")) {
        formatted += `💡 *saran*\n`;
        formatted += `${t.replace("SARAN:", "").trim()}\n`;
      } else {
        formatted += `${t}\n`;
      }
    }

    if (!formatted) {
      formatted = `${result.answer.trim()}\n`;
    }

    await m.react("🐣");
    let msg = "";
    msg += `💭 Mimpi: *${text}*\n`;
    msg += `
`;
    msg += formatted;
    msg += `
`;
    msg += `⚠️ Tafsir mimpi hanya referensi, bukan kepastian\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("mimpiai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("mimpiai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
