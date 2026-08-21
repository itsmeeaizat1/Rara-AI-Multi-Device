// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "merge",
  alias: ["merge", "gabung", "mergefile"],
  category: "game",
  description: "Gabungkan 2 item menjadi item lebih kuat",
  usage: ".merge <item1> <item2>",
  example: ".merge Sword Shield",
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
    const args = m.text?.trim().split(/\s+/);
    const item1 = args?.[0];
    const item2 = args?.[1];

    if (!item1 || !item2) {
      const text =
        claraWrap("Cara Pakai", [`╎❏ Penggunaan: *${prefix}merge <item1> <item2>*`,
          `╎❏ Contoh: *${prefix}merge Sword Shield*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "merge");
      return { handled: true };
    }

    const text =
      claraWrap("Merge", [`╎❏ Item 1: *${item1}*`,
        `╎❏ Item 2: *${item2}*`,
        "╎❏ Hasil: *Super Sword*",
        "╎❏ Bonus: *+20% ATK*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("merge", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "merge");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
