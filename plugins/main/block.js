
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "block2",
  alias: ["block2", "block"],
  category: "owner",
  description: "Blokir user",
  usage: ".block <@target>",
  example: ".block @username",
  isOwner: true,
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
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      const text =
        novaCaption({
  emoji: "👑",
  name: "block2",
  description: "Blokir user",
  usage: `${prefix}block <@target>`,
  example: `${prefix}block @username`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "block");
      return { handled: true };
    }

    const targetName = targetRaw.replace(/^@+/, "") || targetRaw;

    const text =
      claraWrap("Block", [`Target: *${targetName}*`,
        "Status: *ʙᴇʀʜᴀꜱɪʟ ᴅɪʙʟᴏᴋɪʀ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "block2");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Block", "Gagal nih, coba lagi ya");

    await m.reply(text, "block");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
