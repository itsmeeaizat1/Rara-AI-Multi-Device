// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "linkgroup",
  alias: ["linkgroup"],
  category: "group",
  description: "Dapatkan link grup",
  usage: ".linkgroup",
  example: ".linkgroup",
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
    const chat = m.chat;

    let inviteCode = null;
    try {
      const result = await sock.groupInviteCode(chat);
      inviteCode = result;
    } catch (e) { console.error('[linkgroup.js]:', e.message); }

    const link = inviteCode
      ? `https://chat.whatsapp.com/${inviteCode}`
      : "https://chat.whatsapp.com/xxxxx";

    const text =
      claraWrap("Link Group", [`│ Group: *${m.chatName || chat}*`,
        `│ Link: *${link}*`,
        "│ Status: *ᴀᴄᴛɪᴠᴇ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("linkgroup", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "linkgroup");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
