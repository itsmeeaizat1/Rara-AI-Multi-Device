import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "guild",
  alias: ["guild", "guildrpg", "guildrank"],
  category: "game",
  description: "Buat/kelola guild RPG",
  usage: ".guild <nama>",
  example: ".guild Nightmare",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();

    if (!query) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}guild <nama guild>*`,
          `◦ Contoh: *${prefix}guild Nightmare*`,
          "◦ Harga: *500 Gold*",
          "◦ Max Member: *20*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "guild");
      return { handled: true };
    }

    // Placeholder: ganti dengan logic guild RPG kamu
    const members = ["Player1", "Player2", "Player3", "Player4", "Player5"];

    const text =
      claraWrap("Guild", [`◦ Guild: *${query}*`,
        `◦ Leader: *${m.pushName || "Player"}*`,
        "◦ Level: *1*",
        `◦ Members: *${members.length}/20*`,
        "◦ Gold: *500*"].join("\n")) +
      "\n\n" +
      claraWrap("ᴍᴇᴍʙᴇʀꜱ", members.map((name) => `◦ ${name}`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "guild");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("guild", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
