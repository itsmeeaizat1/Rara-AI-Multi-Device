// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { askFunAI } from "../../src/lib/rara-fun-ai.js";

const pluginConfig = {
  name: "kerangajaib",
  alias: ["kerangajaib"],
  category: "fun",
  description: "Kerang ajaib (Magic Conch Shell) — Tanya apa pun, kerang menjawab",
  usage: ".kerangajaib <pertanyaan> — Tanya kerang ajaib",
  example: ".kerangajaib aku ganteng gak?\n.kerangajaib hari ini hujan gak?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

const RESPONSES = [
  "Ya.",
  "Tidak.",
  "Mungkin.",
  "Coba tanya lagi.",
  "Sangat mungkin.",
  "Tidak mungkin sama sekali.",
  "Entah, aku sedang sibuk.",
  "Iya, tapi jangan berharap terlalu tinggi.",
  "Tidak pernah.",
  "Sekali lagi.",
  "Aku tidak yakin.",
  "Tentu saja!",
  "Jangan harap.",
  "Mungkin, mungkin tidak.",
  "Iya dong.",
  "Nggak yah.",
  "Aku bilang iya.",
  "Aku bilang tidak.",
  "Hmm, tidak.",
  "Bisa jadi.",
  "Kayaknya iya deh.",
  "Kayaknya nggak deh.",
  "Tergantung.",
  "Tanya yang lain.",
  "Yakin 100% iya.",
  "Yakin 100% tidak.",
  "Aku ragu.",
  "Jelas iya!",
  "Jelas tidak!",
  "Bisa iya bisa tidak.",
  "Ditunggu saja.",
  "Aku sedang tidur, tanya nanti.",
  "Aku nggak mau jawab itu.",
  "Sudah takdirnya begitu.",
  "Mungkin di dunia lain iya.",
  "Aku kerang, bukan dukun.",
  "Sudah terlalu jelas, iya.",
  "Sudah terlalu jelas, tidak.",
  "Sulit dijawab, tapi coba lagi nanti.",
];

async function handler(m, { sock, conn, config: botConfig, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const question = text || args.join(" ");

    if (!question) {
      return m.reply(raraWrap("Kerang Ajaib", [
        "Tanya apa saja, kerang akan menjawab!",
        "Contoh: " + usedPrefix + "kerangajaib aku ganteng gak?",
      ], "warn"));
    }

    const { text: answer, fromAI } = await askFunAI({
    botConfig: botConfig || {},
    question: question,
    persona: "kerang",
    fallbackAnswers: RESPONSES,
  });

    await m.react("🐣");
    return m.reply(raraWrap("Kerang Ajaib", [
      "Pertanyaan: " + question,
      "",
      answer,
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("Kerang Ajaib", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
