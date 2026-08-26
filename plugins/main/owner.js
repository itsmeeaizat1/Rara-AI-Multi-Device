// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import crypto from "crypto";
import config, { getOwnerName } from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "owner",
  alias: ["owner"],
  category: "main",
  description: "Menampilkan kontak owner bot",
  usage: ".owner",
  example: ".owner",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const ownerType = db.setting("ownerType") || 1;
  const configOwners = botConfig.owner?.number || [];
  const dbOwners = db.data.owner || [];
  const ownerNumbers = [...new Set([...configOwners, ...dbOwners])];
  const botName = botConfig.bot?.name || "Nova-AI";
  const ownerNames = ownerNumbers.map((n) => getOwnerName(n)).join(", ");

  if (ownerType === 2) {
    const contacts = [];
    for (const number of ownerNumbers) {
      const cleanNumber = number.replace(/[^0-9]/g, "");
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${getOwnerName(number)}\nTEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\nEND:VCARD`;
      contacts.push({ vcard });
    }
    const zanne = await sock.sendMessage(
      m.chat,
      { contacts: { displayName: "Ini adalah owner kami", contacts } },
      { quoted: m.raw },
    );
    await sock.sendMessage(m.chat, {
      text: "Jika kamu memiliki pertanyaan, jangan ragu untuk bertanya, owner ramah kok",
    }, { quoted: zanne });
  } else {
    const ownerText = `╭──「 *Owner Information* 」\n│ ❏ *ɴᴀᴍᴀ:* ${ownerNames}
│ ❏ *ʙᴏᴛ:* ${botName}
│ ❏ *ꜱᴛᴀᴛᴜꜱ:* Online
╰──────────❀

Jika ada pertanyaan atau kendala,
silakan hubungi owner di atas!
Contact card di bawah.`;

    await m.reply(claraWrap("owner", ownerText));

    for (const number of ownerNumbers) {
      const cleanNumber = number.replace(/[^0-9]/g, "");
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${getOwnerName(number)} (Owner ${botName})\nTEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\nEND:VCARD`;
      await sock.sendMessage(
        m.chat,
        { contacts: { displayName: getOwnerName(number), contacts: [{ vcard }] } },
        { quoted: m.raw },
      );
    }
  }
}

export { pluginConfig as config, handler };
