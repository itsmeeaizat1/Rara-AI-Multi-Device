// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "trade",
  alias: ["tukar", "exchange", "trade", "tukarbar", "barter"],
  category: "economy",
  description: "Tukar item dengan player lain",
  usage: ".trade @member <item> <jumlah>",
  example: ".trade @628xxxx Potion 2",
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

    if (!target) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}trade @member <item> <jumlah>*`,
          `◦ Contoh: *${prefix}trade @628xxxx Potion 2*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "trade");
      return { handled: true };
    }

    const item = m.text?.trim().split(/\s+/).slice(2).join(" ") || "Unknown";

    const text =
      claraWrap("Trade", [`◦ Dari: *${m.pushName || "Player"}*`,
        `◦ Kepada: *${target}*`,
        `◦ Item: *${item}*`,
        "◦ Status: *Menunggu konfirmasi*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "trade");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("trade", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
