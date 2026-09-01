// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spam",
  alias: ["spam"],
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().split(/\s+/);
    const count = Math.min(parseInt(args?.[0] || "0", 10) || 0, 10);
    const message = args?.slice(1).join(" ") || "Spam!";

    if (!count || count <= 0) {
      const text =
        novaCaption({
  emoji: "🛠️",
  name: "spam",
  description: "Spam pesan untuk entertainment",
  usage: `${prefix}spam <jumlah> <pesan>`,
  example: `${prefix}spam 5 Halo`,
}) +
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
      claraWrap("Spam", [`Jumlah: *${count}x*`,
        `Pesan: *${message}*`,
        "Status: *ꜱᴇʟᴇꜱᴀɪ*"].join("\n")) +
      "\n" +
      tipText(`Gunakan dengan bijak, jangan spam di chat orang lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("spam", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply( text, "spam");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
