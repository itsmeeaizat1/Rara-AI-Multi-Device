// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "trivia2",
  alias: ["trivia2", "triviamain", "quiz"],
  category: "game",
  description: "Jawab fakta umum acak",
  usage: ".trivia",
  example: ".trivia",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const ITEMS = [
  {
    q: "Apa gunung tertinggi di Indonesia?",
    a: "Puncak Jaya",
  },
  {
    q: "Berapa jumlah provinsi di Indonesia?",
    a: "38",
  },
  {
    q: "Siapa presiden pertama Indonesia?",
    a: "Soekarno",
  },
  {
    q: "Hewan apa yang memiliki jantung terbesar?",
    a: "Paus biru",
  },
  {
    q: "Planet apa yang dikenal sebagai planet merah?",
    a: "Mars",
  },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    const text =
      claraWrap("Trivia", [`╎❏ Soal: *${item.q}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}trivia untuk soal lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("trivia2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "trivia");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
