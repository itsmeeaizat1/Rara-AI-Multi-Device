import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pet",
  alias: ["hewan", "pet", "kepet", "adopt"],
  category: "game",
  description: "Adopsi dan kelola pet RPG kamu",
  usage: ".pet <nama>",
  example: ".pet Kucing",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();

    if (!query) {
      const text =
        claraWrap("Cara Pakai", ["◦ 1. *Kucing* - 100 Gold",
          "◦ 2. *Anjing* - 150 Gold",
          "◦ 3. *Naga* - 500 Gold",
          "◦ 4. *Phoenix* - 1000 Gold"].join("\n")) +
        "\n\n" +
        claraWrap("ɪɴꜰᴏ", [`◦ Penggunaan: *${prefix}pet <nama>*`, `◦ Contoh: *${prefix}pet Kucing*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "pet");
      return { handled: true };
    }

    const text =
      claraWrap("Pet", [`◦ Nama: *${query}*`,
        "◦ Tipe: *Kucing*",
        "◦ Level: *1*",
        "◦ HP: *50/50*",
        "◦ ATK: *5*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "pet");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("pet", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
