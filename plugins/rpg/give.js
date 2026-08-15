// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "give",
  alias: ["give", "kirimv2", "kasih", "beri"],
  category: "economy",
  description: "Berikan gold/item ke player lain",
  usage: ".give @member <jumlah>",
  example: ".give @628xxxx 1000",
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
    const target = m.mentionedJid?.[0];
    const args = m.text?.trim().split(/\s+/);
    const amount = parseInt(args?.[1] || "0", 10);

    if (!target || !amount || amount <= 0) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}give @member <jumlah>*`,
          `◦ Contoh: *${prefix}give @628xxxx 1000*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "give");
      return { handled: true };
    }

    const text =
      claraWrap("Give", [`◦ Dari: *${m.pushName || "Player"}*`,
        `◦ Kepada: *${target}*`,
        `◦ Jumlah: *${amount} Gold*`,
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "give");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("give", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
