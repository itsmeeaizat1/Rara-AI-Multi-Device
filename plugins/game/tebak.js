// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tebak",
  alias: ["tebak", "guess", "tebakan", "tebak"],
  category: "game",
  description: "Tebak angka acak",
  usage: ".tebak <angka>",
  example: ".tebak 42",
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
    const input = m.text?.trim();

    if (!input) {
      const text =
        claraWrap("Cara Pakai", [`╎❏ Penggunaan: *${prefix}tebak <angka>*`,
          `╎❏ Contoh: *${prefix}tebak 42*`,
          "╎❏ Rentang: *1 - 100*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "tebak");
      return { handled: true };
    }

    const guess = parseInt(input, 10);
    if (Number.isNaN(guess) || guess < 1 || guess > 100) {
      const text =
        claraWrap("Tebak", ["╎❏ Angka harus antara *1 - 100*."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("tebak", text));
      return { handled: true };
    }

    const secret = Math.floor(Math.random() * 100) + 1;
    const win = guess === secret;

    const text =
      claraWrap("Tebak", [`╎❏ Tebakan: *${guess}*`,
        `╎❏ Jawaban: *${secret}*`,
        win ? "╎❏ Status: *Benar!*" : "╎❏ Status: *Salah!*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}tebak <angka> untuk main lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("tebak", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("tebak", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
