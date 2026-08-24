// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spamcall",
  alias: ["spamcall", "spamcall", "telepon", "call"],
  category: "tools",
  description: "Spam call/virtual call untuk entertainment",
  usage: ".spamcall <jumlah> <nomor>",
  example: ".spamcall 5 628xxxx",
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
    const count = Math.min(parseInt(args?.[0] || "0", 10) || 0, 5);
    const target = args?.[1] || m.mentionedJid?.[0];

    if (!count || count <= 0 || !target) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}spamcall <jumlah> <nomor>*`,
          `  ┊  ➶ Contoh: *${prefix}spamcall 3 628xxxx*`,
          `  ┊  ➶ Atau: *${prefix}spamcall 3 @member*`,
          "  ┊  ➶ Maksimal: *5x*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "spamcall");
      return { handled: true };
    }

    const chat = m.chat;
    const mentions = [];
    const targetClean = String(target).replace(/@.+$/, "");

    for (let i = 0; i < count; i++) {
      const body = `📞 *ꜱᴘᴀᴍ ᴄᴀʟʟ*\n┃   ┊  ➶ Target: *@${targetClean}*\n┃   ┊  ➶ Call #${i + 1}/${count}`;
      mentions.push(targetClean);
      await sock.sendMessage(chat, { text: body, mentions });
    }

    const text =
      claraWrap("Spam Call", [`  ┊  ➶ Target: *@${targetClean}*`,
        `  ┊  ➶ Jumlah: *${count}x*`,
        "  ┊  ➶ Status: *ꜱᴇʟᴇꜱᴀɪ*"].join("\n")) +
      "\n" +
      tipText(`Gunakan dengan bijak`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("spamcall", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *ɢᴀɢᴀʟ*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "spamcall");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
