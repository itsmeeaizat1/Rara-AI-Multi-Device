import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tebakgambar",
  alias: ["tebakgambar", "guessimage", "tebakimg", "gambartebak"],
  category: "game",
  description: "Tebak gambar acak",
  usage: ".tebakgambar",
  example: ".tebakgambar",
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

    const text =
      claraWrap("Tebak Gambar", ["◦ Status: *Gambar baru!*",
        "◦ Tebak apa ini?"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}tebakgambar untuk soal lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("tebakgambar", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "tebakgambar");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
