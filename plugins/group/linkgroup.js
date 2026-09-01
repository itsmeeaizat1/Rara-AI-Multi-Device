// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput, tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

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
    const prefix = botConfig.command?.prefix || ".";
  try {
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
      claraWrap("Link Group", [`Group: *${m.chatName || chat}*`,
        `Link: *${link}*`,
        "Status: *ᴀᴄᴛɪᴠᴇ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("linkgroup", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
    await m.reply(novaError("LinkGroup", "Gagal nih, coba lagi ya"));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
