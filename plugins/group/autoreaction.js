// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autoreactionemoji",
  alias: ["autoreactionemoji"],
  category: "group",
  description: "Auto reaction pesan di grup",
  usage: ".autoreaction on/off",
  example: ".autoreaction on",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      const text =
        claraWrap("Autoreaction", [`  ┊  ➶ Penggunaan: *${prefix}autoreaction on/off*`,
          `  ┊  ➶ Contoh: *${prefix}autoreaction on*`,
          `  ┊  ➶ Contoh: *${prefix}autoreaction off*`,
          `  ┊  ➶ Emoji: ${EMOJIS.join(" ")}`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("autoreaction", text));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { autoreaction: args === "on" });

    const text =
      claraWrap("Autoreaction", ["  ┊  ➶ Fitur: *ᴀᴜᴛᴏ ʀᴇᴀᴄᴛɪᴏɴ*",
        `  ┊  ➶ Status: *${args === "on" ? "ON" : "OFF"}*`,
        `  ┊  ➶ Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}autoreaction on/off untuk mengubah`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("autoreaction", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *ɢᴀɢᴀʟ*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "autoreaction");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
