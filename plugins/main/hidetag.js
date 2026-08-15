// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hidetag",
  alias: ["hidetag", "hiddentag", "ht"],
  category: "group",
  description: "Tag semua member grup",
  usage: ".hidetag <teks>",
  example: ".hidetag Hai semua!",
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
    const text = m.text?.trim();

    if (!text) {
      const reply =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}hidetag <teks>*`,
          `◦ Contoh: *${prefix}hidetag Hai semua!*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, reply, "hidetag");
      return { handled: true };
    }

    const info =
      claraWrap("Hidetag", [`◦ Pesan: *${text}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(info);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const reply =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("hidetag", reply));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
