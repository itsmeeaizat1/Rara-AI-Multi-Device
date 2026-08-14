import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "enchant",
  alias: ["enchant", "tempa", "enchantitem", "upgradev2"],
  category: "game",
  description: "Enchant equipment untuk bonus stats",
  usage: ".enchant <item>",
  example: ".enchant Sword",
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
    const item = m.text?.trim();

    if (!item) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}enchant <item>*`,
          `◦ Contoh: *${prefix}enchant Sword*`,
          "◦ Biaya: *200 Gold + 1 Crystal*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "enchant");
      return { handled: true };
    }

    const bonus = Math.floor(Math.random() * 10) + 1;

    const text =
      claraWrap("Enchant", [`◦ Item: *${item}*`,
        `◦ Bonus: *+${bonus}% Stats*`,
        "◦ Biaya: *200 Gold*",
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "enchant");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("enchant", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
