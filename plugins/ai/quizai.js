// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Quiz — AI generates quiz questions with multiple choice

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "quizai",
  alias: ["quizai", "aiquiz", "kuisai"],
  category: "ai",
  description: "AI bikin kuis pilihan ganda — bisa pilih kategori",
  usage: ".quizai [kategori]",
  example: ".quizai sains\n.quizai sejarah\n.quizai geografi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const CATEGORIES = ["sains", "sejarah", "geografi", "matematika", "teknologi", "olahraga", "musik", "film", "bahasa", "umum"];

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim().toLowerCase();
    const category = CATEGORIES.includes(text) ? text : "umum";

    await m.react("🕒");

    const prompt = `Buatkan satu soal kuis pilihan ganda berbahasa Indonesia dengan kategori "${category}". Format WAJIB seperti ini (jangan tambahkan teks lain):

SOAL: [pertanyaan]
A. [opsi A]
B. [opsi B]
C. [opsi C]
D. [opsi D]
JAWABAN: [huruf opsi yang benar]
PENJELASAN: [penjelasan singkat kenapa jawaban itu benar]

Pastikan soal menantang tapi tidak terlalu sulit. Hanya 1 soal saja.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("quizai", "AI-nya lagi malas bikin soal 😅", "error"));
    }

    // Parse the response
    const lines = result.answer.trim().split("\n");
    let formatted = "";
    let answerHidden = "";
    let explanation = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("SOAL:")) {
        formatted += `│ ❓ ${trimmed.replace("SOAL:", "").trim()}\n│\n`;
      } else if (trimmed.match(/^[ABCD]\./)) {
        formatted += `│ ${trimmed}\n`;
      } else if (trimmed.startsWith("JAWABAN:")) {
        answerHidden = trimmed.replace("JAWABAN:", "").trim();
      } else if (trimmed.startsWith("PENJELASAN:")) {
        explanation = trimmed.replace("PENJELASAN:", "").trim();
      }
    }

    if (!formatted) {
      // Fallback — just show raw
      formatted = `│ ${result.answer.trim()}\n`;
    }

    await m.react("🐣");
    let msg = `╭─「 ǫᴜɪᴢ ᴀɪ 」\n`;
    msg += `│ 📚 Kategori: *${category}*\n`;
    msg += `│\n`;
    msg += formatted;
    msg += `│\n`;
    if (answerHidden) {
      msg += `│ 💡 Jawaban: ||${answerHidden}||\n`;
    }
    if (explanation) {
      msg += `│ 📝 ${explanation}\n`;
    }
    msg += `│\n`;
    msg += `│ 📌 Ketik .quizai ${category} untuk soal baru\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("quizai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("quizai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
