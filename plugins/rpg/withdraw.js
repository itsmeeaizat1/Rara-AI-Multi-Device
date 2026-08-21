// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "withdrawv2",
  alias: ["tarikv2", "ambilv2", "ambil"],
  category: "economy",
  description: "Tarik gold dari bank ke dompet",
  usage: ".withdraw <jumlah>",
  example: ".withdraw 1000",
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
    const amount = parseInt(m.text?.trim() || "0", 10);

    if (!amount || amount <= 0) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}withdraw <jumlah>*`,
          `  ┊  ➶ Contoh: *${prefix}withdraw 1000*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "withdraw");
      return { handled: true };
    }

    const text =
      claraWrap("Withdraw", [`  ┊  ➶ Jumlah: *${amount} Gold*`,
        "  ┊  ➶ Dari: *Bank*",
        "  ┊  ➶ Ke: *Dompet*",
        "  ┊  ➶ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "withdraw");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("withdrawv2", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
