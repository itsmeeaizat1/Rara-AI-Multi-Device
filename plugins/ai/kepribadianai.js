// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kepribadianai — AI test kepribadian MBTI
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "kepribadianai",
  alias: ["kepribadianai", "mbtiai", "aikpribadian"],
  category: "ai",
  description: "AI analisis kepribadian MBTI dari deskripsi diri",
  usage: ".kepribadianai <deskripsi diri kamu>",
  example: ".kepribadianai saya suka sendiri, overthinking, suka bantu orang lain\n.kepribadianai gampang bergaul, leader, suka tantangan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("kepribadianai", `Ceritain kepribadian kamu, nanti AI tebak MBTI-mu!\n\nContoh: ${m.prefix}kepribadianai saya introvert, suka planning, overthinking\n${m.prefix}kepribadianai gampang bergaul, spontan, suka party`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Berdasarkan deskripsi ini: "${text}"

Analisis kepribadian MBTI dengan format:

TIPE MBTI: [4 huruf MBTI]
KODE: [contoh: INTJ, ENFP, dll]

KEKUATAN: [3 kekuatan utama]
KELEMAHAN: [3 kelemahan]
KARIR COCOK: [3 rekomendasi karir]
PARTNER COCOK: [tipe MBTI yang cocok sebagai partner]
PENGEMBANGAN: [saran pengembangan diri]

Gunakan bahasa Indonesia. Analisis berdasarkan framework MBTI (Myers-Briggs Type Indicator).`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("kepribadianai", "AI-nya lagi psychology test sendiri 🧠", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴋᴇᴘʀɪʙᴀᴅɪᴀɴ ᴍʙᴛɪ ✦ 」\n`;
    msg += `│ 🧠 Deskripsi: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `│\n`;
    msg += `│ ⚠️ Analisis AI untuk hiburan, bukan diagnosis psikologi\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("kepribadianai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("kepribadianai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
