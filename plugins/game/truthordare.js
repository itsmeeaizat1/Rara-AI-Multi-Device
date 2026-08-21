// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "truthordare",
  alias: ["truthordare", "tod", "truthdare"],
  category: "game",
  description: "Main Truth or Dare",
  usage: ".truthordare",
  example: ".truthordare",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const roll = Math.random();
    const isTruth = roll < 0.5;
    const truthQuestions = [
      "Apa rahasia terbesar yang pernah kamu simpan?",
      "Siapa orang yang kamu sukai saat ini?",
      "Apa hal paling memalukan yang pernah terjadi?",
    ];
    const dareQuestions = [
      "Kirim voice note bernyanyi.",
      "Chat crush kamu sekarang.",
      "Post foto terbaru kamu di story.",
    ];
    const question = isTruth
      ? truthQuestions[Math.floor(Math.random() * truthQuestions.length)]
      : dareQuestions[Math.floor(Math.random() * dareQuestions.length)];
    const type = isTruth ? "Truth" : "Dare";

    const text =
      claraWrap("Truth or Dare", [`╎❏ Tipe: *${type}*`,
        `╎❏ Tantangan: *${question}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}truthordare untuk main lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("truthordare", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "truthordare");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
