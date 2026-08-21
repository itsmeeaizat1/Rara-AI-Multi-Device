// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "depositv2",
  alias: ["setorv2", "simpanv2", "setor"],
  category: "economy",
  description: "Simpan gold ke bank",
  usage: ".deposit <jumlah>",
  example: ".deposit 1000",
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
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}deposit <jumlah>*`,
          `  ┊  ➶ Contoh: *${prefix}deposit 1000*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "deposit");
      return { handled: true };
    }

    const text =
      claraWrap("Deposit", [`  ┊  ➶ Jumlah: *${amount} Gold*`,
        "  ┊  ➶ Dari: *Dompet*",
        "  ┊  ➶ Ke: *Bank*",
        "  ┊  ➶ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "deposit");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("depositv2", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
