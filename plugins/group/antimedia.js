// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { gpMsg } from "../../src/lib/nova-group-protection.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "antimedia",
  alias: ["antimedia"],
  category: "group",
  description: "Mengatur antimedia di grup (blokir gambar/video/audio/dokumen)",
  usage: ".antimedia <on/off>",
  example: ".antimedia on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  isBotAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};


async function checkAntimedia(m, sock, db) {
  if (!m.isGroup) return false;
  if (m.isAdmin || m.isOwner || m.fromMe) return false;

  const groupData = db.getGroup(m.chat) || {};
  if (!groupData.antimedia) return false;

  const isMedia =
    m.isImage || m.isVideo || m.isGif || m.isAudio || m.isDocument;
  if (!isMedia) return false;

  try {
    await sock.sendMessage(m.chat, { delete: m.key });
  } catch (e) { console.error('[antimedia.js]:', e.message); }

  await sock.sendMessage(m.chat, {
    text: gpMsg("antimedia", { user: m.sender.split("@")[0] }),
    mentions: [m.sender],
  });

  return true;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args || [])[0]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};

  if (!action) {
    const status = groupData.antimedia ? "✅ ON" : "❌ OFF";
    await m.reply( `🖼️ *ᴀɴᴛɪᴍᴇᴅɪᴀ*\n\nStatus: *${status}*\n\n\`.antimedia on/off\``, "antimedia");
    return;
  }

  if (action === "on") {
    db.setGroup(m.chat, { antimedia: true });
    { const __navText = `✅ *ᴀɴᴛɪᴍᴇᴅɪᴀ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*`; await m.reply(__navText); };
    return;
  }

  if (action === "off") {
    db.setGroup(m.chat, { antimedia: false });
    await m.reply(claraWrap("Antimedia", `antimedia dinonaktifkan`, "error"));
    return;
  }

  await m.reply(claraWrap("Anti media", `Gunakan \`.antimedia on\` atau \`.antimedia off\``, "error"));
}

export { pluginConfig as config, handler, checkAntimedia };
