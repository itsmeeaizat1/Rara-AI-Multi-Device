import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { alyaHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const COMMANDS = [
  { cmd: ".truth", desc: "Tantangan truth" },
  { cmd: ".tebak", desc: "Tebak angka" },
  { cmd: ".trivia", desc: "Fakta umum" },
  { cmd: ".mathquiz", desc: "Soal matematika" },
  { cmd: ".tebakgambar", desc: "Tebak gambar" },
  { cmd: ".happyemoji", desc: "Emoji ceria" },
];

const pluginConfig = {
  name: "fun",
  alias: ["fun", "funmenu", "games", "main"],
  category: "menu",
  description: "Menu game seru",
  usage: ".fun",
  example: ".fun",
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
      claraWrap("Fun", "🎮") +
      "\n\n" +
      claraWrap("ɢᴀᴍᴇ", lines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}fun untuk lihat menu`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("fun", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "fun");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
