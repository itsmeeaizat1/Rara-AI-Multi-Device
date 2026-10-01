// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Fortune — AI fortune teller with personality

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "ramalanai",
  alias: ["ramalanai", "airamal", "fortuneai", "dukunai"],
  category: "ai",
  description: "AI dukun/paranormal — ramal masa depan, zodiak, cinta, karir",
  usage: ".ramalanai <topik>",
  example: ".ramalanai cinta\n.ramalanai karir\n.ramalanai keuangan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const TOPICS = {
  cinta: "Cinta dan kehidupan romantis",
  karir: "Karir dan pekerjaan",
  keuangan: "Keuangan dan rezeki",
  kesehatan: "Kesehatan dan energi",
  hoki: "Hoki dan keberuntungan",
  jodoh: "Jodoh dan soulmate",
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim().toLowerCase();
    const topic = TOPICS[text] || "Kehidupan secara umum";

    await m.react("🕒");

    const prompt = `Kamu adalah seorang dukun/paranormal yang ramalannya sering akurat tapi lucu dan santai. Buatkan ramalan untuk seseorang tentang "${topic}". Format:

BINTANG: [rating keberuntungan hari ini 1-5 ⭐]
RAMALAN: [ramalan utama, 2-3 kalimat]
PERINGATAN: [hal yang harus dihindari, 1 kalimat]
KEBERUNTUNGAN: [angka/hari keberuntungan]
PESAN: [pesan motivasi dari dukun, 1 kalimat]

Gunakan bahasa Indonesia santai. Ramalan harus positif, jangan menakut-nakuti.`;

    const result = await UnlimitedAI(prompt, "kobo-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("ramalanai", "Dukunnya lagi sholat 🕌", "error"));
    }

    const lines = result.answer.trim().split("\n");
    let formatted = "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("BINTANG:")) {
        formatted += `${t.replace("BINTANG:", "").trim()}

`;
      } else if (t.startsWith("RAMALAN:")) {
        formatted += `🔮 *ramalan*
${t.replace("RAMALAN:", "").trim()}

`;
      } else if (t.startsWith("PERINGATAN:")) {
        formatted += `⚠️ *peringatan*
${t.replace("PERINGATAN:", "").trim()}

`;
      } else if (t.startsWith("KEBERUNTUNGAN:")) {
        formatted += `🍀 *keberuntungan*
${t.replace("KEBERUNTUNGAN:", "").trim()}

`;
      } else if (t.startsWith("PESAN:")) {
        formatted += `💬 *pesan dukun*
${t.replace("PESAN:", "").trim()}\n`;
      } else {
        formatted += `${t}\n`;
      }
    }

    if (!formatted) {
      formatted = `${result.answer.trim()}\n`;
    }

    await m.react("🐣");
    let msg = "";
    msg += `📌 Topik: *${topic}*\n`;
    msg += `
`;
    msg += formatted;
    msg += `
`;
    msg += `⚠️ Ramalan untuk hiburan, jangan diambil serius 😄\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("ramalanai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ramalanai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
