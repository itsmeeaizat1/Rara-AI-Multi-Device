import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "marry",
  alias: ["wedding", "nikah", "menikah", "kawin", "pasanganv2", "couplev2", "lovev2"],
  category: "game",
  description: "Nikahi player lain di grup",
  usage: ".marry @member",
  example: ".marry @628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const target = m.mentionedJid?.[0];

    if (!target) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}marry @member*`,
          `◦ Contoh: *${prefix}marry @628xxxx*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "marry");
      return { handled: true };
    }

    const text =
      claraWrap("Marriage", [`◦ Kamu: *${m.pushName || "Player"}*`,
        `◦ Pasangan: *${target}*`,
        "◦ Status: *Married*",
        "◦ Bonus: *+5% EXP*"].join("\n")) +
      "\n" +
      tipText(`Selamat! Kamu sekarang married`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "marry");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("marry", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
