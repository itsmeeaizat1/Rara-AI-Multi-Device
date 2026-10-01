import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const pluginConfig = {
  name: "autoreaction",
  alias: ["autoreaction"],
  category: "group",
  description: "Auto reaction pesan di grup",
  usage: ".autoreaction on/off",
  example: ".autoreaction on",
  isOwner: false,
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
      const text =
        raraCaption({
  emoji: "⚡",
  name: "autoreaction",
  description: "Auto reaction pesan di grup",
  usage: `${prefix}autoreaction on/off`,
  example: `${prefix}autoreaction on`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "autoreaction");
      return { handled: true };
    }

    const db = getDatabase();
    db.setGroup(m.chat, { autoreaction: args === "on" });

    const text =
      raraWrap("Autoreaction", ["Fitur: *auto reaction*",
        `Status: *${args === "on" ? "ON" : "OFF"}*`,
        `Group: *${m.chat}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}autoreaction on/off untuk mengubah`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "autoreaction");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AutoReaction", "Gagal nih, coba lagi ya");

    await m.reply(text, "autoreaction");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
