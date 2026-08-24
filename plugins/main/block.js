
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "block2",
  alias: ["block2", "blockmain", "banmain"],
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}block <@target>*`,
          `  ┊  ➶ Contoh: *${prefix}block @username*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "block");
      return { handled: true };
    }

    const targetName = targetRaw.replace(/^@+/, "") || targetRaw;

    const text =
      claraWrap("Block", [`  ┊  ➶ Target: *${targetName}*`,
        "  ┊  ➶ Status: *ʙᴇʀʜᴀꜱɪʟ ᴅɪʙʟᴏᴋɪʀ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("block2", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *ɢᴀɢᴀʟ*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "block");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
