// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spam",
  alias: ["spam", "flood", "bomb", "spammer"],
  category: "tools",
  description: "Spam pesan untuk entertainment",
  usage: ".spam <jumlah> <pesan>",
  example: ".spam 5 Halo",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.trim().split(/\s+/);
    const count = Math.min(parseInt(args?.[0] || "0", 10) || 0, 10);
    const message = args?.slice(1).join(" ") || "Spam!";

    if (!count || count <= 0) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}spam <jumlah> <pesan>*`,
          `  ┊  ➶ Contoh: *${prefix}spam 5 Halo*`,
          "  ┊  ➶ Maksimal: *10x*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "spam");
      return { handled: true };
    }

    const chat = m.chat;

    for (let i = 0; i < count; i++) {
      await sock.sendMessage(chat, { text: `${message}` });
    }

    const text =
      claraWrap("Spam", [`  ┊  ➶ Jumlah: *${count}x*`,
        `  ┊  ➶ Pesan: *${message}*`,
        "  ┊  ➶ Status: *ꜱᴇʟᴇꜱᴀɪ*"].join("\n")) +
      "\n" +
      tipText(`Gunakan dengan bijak, jangan spam di chat orang lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("spam", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *ɢᴀɢᴀʟ*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "spam");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
