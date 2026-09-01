// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spamcall",
  alias: ["spamcall"],
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().split(/\s+/);
    const count = Math.min(parseInt(args?.[0] || "0", 10) || 0, 5);
    const target = args?.[1] || m.mentionedJid?.[0];

    if (!count || count <= 0 || !target) {
      const text =
        novaCaption({
  emoji: "🛠️",
  name: "spamcall",
  description: "Spam call/virtual call untuk entertainment",
  usage: `${prefix}spamcall <jumlah> <nomor>`,
  example: `${prefix}spamcall 5 628xxxx`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "spamcall");
      return { handled: true };
    }

    const chat = m.chat;
    const mentions = [];
    const targetClean = String(target).replace(/@.+$/, "");

    for (let i = 0; i < count; i++) {
      const body = `📞 *ꜱᴘᴀᴍ ᴄᴀʟʟ*
│ │ Target: *@${targetClean}*
│ │ Call #${i + 1}/${count}`;
      mentions.push(targetClean);
      await sock.sendMessage(chat, { text: body, mentions });
    }

    const text =
      claraWrap("Spam Call", [`│ Target: *@${targetClean}*`,
        `│ Jumlah: *${count}x*`,
        "│ Status: *ꜱᴇʟᴇꜱᴀɪ*"].join("\n")) +
      "\n" +
      tipText(`Gunakan dengan bijak`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("spamcall", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "spamcall");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
