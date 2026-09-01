// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autoreactionemoji",
  alias: ["autoreactionemoji", "autoreaction"],
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = m.text?.trim().toLowerCase();

    if (!["on", "off"].includes(args)) {
      await m.reply(novaGuide("Auto Reaction", "Pengaturan auto reaction emoji pesan di grup.", `${prefix}autoreaction on`));
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { autoreaction: args === "on" });

    const text =
      claraWrap("Autoreaction", ["Fitur: *ᴀᴜᴛᴏ ʀᴇᴀᴄᴛɪᴏɴ*",
        `Status: *${args === "on" ? "ON" : "OFF"}*`,
        `Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}autoreaction on/off untuk mengubah`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("autoreaction", text));
  } catch (error) {
    await m.reply(novaError("Auto Reaction", `Terjadi kesalahan: ${error.message || "coba lagi nanti ya"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
