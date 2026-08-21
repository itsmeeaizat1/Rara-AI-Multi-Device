// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kuis",
  alias: ["kuis", "quizmain", "soalkuis"],
  category: "game",
  description: "Jawab kuis acak untuk dapat EXP",
  usage: ".kuis",
  example: ".kuis",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const QUESTIONS = [
  {
    q: "Apa ibukota Indonesia?",
    options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
    answer: 0,
  },
  {
    q: "Berapa 7 x 8?",
    options: ["54", "56", "64", "48"],
    answer: 1,
  },
  {
    q: "Planet terbesar di tata surya?",
    options: ["Bumi", "Mars", "Jupiter", "Saturnus"],
    answer: 2,
  },
  {
    q: "Hewan apa yang disebut raja hutan?",
    options: ["Harimau", "Singa", "Macan", "Cheetah"],
    answer: 1,
  },
  {
    q: "Bahasa pemrograman yang digunakan untuk web?",
    options: ["Python", "JavaScript", "C++", "Java"],
    answer: 1,
  },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const item = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    const optionsText = item.options
      .map((opt, i) => `${i + 1}. ${opt}`)
      .join("\n");

    const text =
      claraWrap("Kuis", [`╎❏ Soal: *${item.q}*`,
        ``,
        optionsText].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}kuis untuk soal lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("kuis", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const reply =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, reply, "kuis");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
