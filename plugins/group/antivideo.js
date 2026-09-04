// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { gpMsg } from "../../src/lib/nova-group-protection.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antivid",
  alias: ["antivid", "antivideo"],
  category: "group",
  description: "Blokir video di grup",
  usage: ".antivideo <on/off>",
  example: ".antivideo on",
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


async function handleAntiVideo(m, sock, db) {
  if (!m.isGroup) return false;
  if (m.isAdmin || m.isOwner || m.fromMe) return false;

  const groupData = db.getGroup(m.chat) || {};
  if (!groupData.antivideo) return false;

  const isVideo = m.isVideo || m.isGif || m.type === "videoMessage";
  if (!isVideo) return false;

  try {
    await sock.sendMessage(m.chat, { delete: m.key });
  } catch (e) { console.error('[antivideo.js]:', e.message); }

  await sock.sendMessage(m.chat, {
    text: gpMsg("antivideo", { user: m.sender.split("@")[0] }),
    mentions: [m.sender],
  });

  return true;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args || [])[0]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};

  if (!action) {
    const status = groupData.antivideo ? "ON" : "OFF";
    await m.reply( `Anti Video\n\nStatus: ${status}\n\n\`${m.prefix}antivideo on/off\``, { commandName: "antivideo" });
    return;
  }

  if (action === "on") {
    db.setGroup(m.chat, { antivideo: true });
    await m.reply(claraWrap("Antivideo", `Anti Video diaktifkan`));
    return;
  }

  if (action === "off") {
    db.setGroup(m.chat, { antivideo: false });
    await m.reply(claraWrap("Antivideo", `Anti Video dinonaktifkan`));
    return;
  }

  await m.reply(claraWrap("Anti vid", `Gunakan \`${m.prefix}antivideo on\` atau \`${m.prefix}antivideo off\``, "info"));
}

export { pluginConfig as config, handler, handleAntiVideo };
