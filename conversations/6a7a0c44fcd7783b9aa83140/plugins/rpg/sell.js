import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sell",
  alias: ["jual", "sellitem", "sell"],
  category: "economy",
  description: "Jual item untuk dapat gold",
  usage: ".sell <item> <jumlah>",
  example: ".sell Potion 2",
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
    const item = args?.[0];
    const qty = parseInt(args?.[1] || "1", 10);

    if (!item) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}sell <item> <jumlah>*`,
          `◦ Contoh: *${prefix}sell Potion 2*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "sell");
      return { handled: true };
    }

    const price = 25;
    const total = price * qty;

    const text =
      claraWrap("Sell", [`◦ Item: *${qty}x ${item}*`,
        `◦ Harga Satuan: *${price} Gold*`,
        `◦ Total: *${total} Gold*`,
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "sell");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("sell", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
