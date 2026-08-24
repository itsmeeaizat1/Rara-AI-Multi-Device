// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const COMMANDS = [
  { cmd: ".anime", desc: "Cari gambar anime" },
  { cmd: ".meme", desc: "Meme generator" },
  { cmd: ".wanted", desc: "Wanted poster" },
  { cmd: ".readmore", desc: "Readmore text" },
  { cmd: ".qrcode", desc: "QR code generator" },
  { cmd: ".tourl", desc: "URL shortener" },
];

const pluginConfig = {
  name: "menu2",
  alias: ["menu2", "menu2", "extra", "moremenu"],
  category: "menu",
  description: "Menu tambahan bot",
  usage: ".menu2",
  example: ".menu2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const lines = COMMANDS.map(
      (item) => `${item.cmd} — *${item.desc}*`
    );

    const text =
      claraWrap("Menu 2", "📑") +
      "\n\n" +
      claraWrap("Extra", lines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu2 untuk lihat menu`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("menu2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "menu2");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
