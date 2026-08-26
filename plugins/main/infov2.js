// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "infov2",
  alias: ["infov2", "about", "botinfo"],
  category: "main",
  description: "Tampilkan info bot versi 2",
  usage: ".infov2",
  example: ".infov2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const users = Object.keys(db.users || {}).length;
    const groups = Object.keys(db.groups || {}).length;

    const text =
      claraWrap("Info V2", [`│ ❏ Bot: *${botConfig.bot?.name || "Nova AI"}*`,
        `│ ❏ Versi: *${botConfig.bot?.version || "1.0.0"}*`,
        `│ ❏ Mode: *${(botConfig.mode || "public").toUpperCase()}*`,
        `│ ❏ Prefix: *${prefix}*`,
        `│ ❏ Users: *${users}*`,
        `│ ❏ Groups: *${groups}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`) +
      "\n" +
      tipText(`Ketik ${prefix}aihelp untuk tanya AI`) +
      "\n" +
      tipText(`Ketik ${prefix}allmenu untuk all menu`);

    await sock.sendMessage(m.chat, {
      text,
      buttons: [
        {
          type: 1,
          buttonId: `menu_infov2_${Date.now()}`,
          buttonText: { displayText: "📋 Menu" },
          value: "menu",
        },
        {
          type: 1,
          buttonId: `aihelp_infov2_${Date.now()}`,
          buttonText: { displayText: "💡 Tanya AI" },
          value: "aihelp",
        },
        {
          type: 1,
          buttonId: `allmenu_infov2_${Date.now()}`,
          buttonText: { displayText: "📌 All Menu" },
          value: "allmenu",
        },
      ],
      headerType: 1,
    });
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "infov2");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
