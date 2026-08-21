// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antivid",
  alias: ["antivid", "novideo", "novid", "avid"],
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

function gpMsg(key, replacements = {}) {
  const defaults = {
    antivideo: "Anti Video — Video dari @%user% dihapus.",
  };
  let text = config.groupProtection?.[key] || defaults[key] || "";
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`%${k}%`, "g"), v);
  }
  return text;
}

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
    await sendReplyWithNav(m, sock, `Anti Video\n\n> Status: ${status}\n\n> \`${m.prefix}antivideo on/off\``, { commandName: "antivideo" });
    return;
  }

  if (action === "on") {
    db.setGroup(m.chat, { antivideo: true });
    m.react("✅");
    await m.reply(claraWrap("Antivideo", `Anti Video diaktifkan`));
    return;
  }

  if (action === "off") {
    db.setGroup(m.chat, { antivideo: false });
    m.react("✅");
    await m.reply(claraWrap("Antivideo", `Anti Video dinonaktifkan`));
    return;
  }

  await m.reply(`Gunakan \`${m.prefix}antivideo on\` atau \`${m.prefix}antivideo off\``);
}

export { pluginConfig as config, handler, handleAntiVideo };
