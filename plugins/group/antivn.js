// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antivn",
  alias: ["antivoice", "antiaudio", "novn", "avn"],
  category: "group",
  description: "Blokir voice note / audio di grup",
  usage: ".antivn <on/off>",
  example: ".antivn on",
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
    antivn: "Anti VN — Voice note dari @%user% dihapus.",
  };
  let text = config.groupProtection?.[key] || defaults[key] || "";
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`%${k}%`, "g"), v);
  }
  return text;
}

async function handleAntiVn(m, sock, db) {
  if (!m.isGroup) return false;
  if (m.isAdmin || m.isOwner || m.fromMe) return false;

  const groupData = db.getGroup(m.chat) || {};
  if (!groupData.antivn) return false;

  const isVn = m.isAudio || m.type === "audioMessage";
  if (!isVn) return false;

  try {
    await sock.sendMessage(m.chat, { delete: m.key });
  } catch (e) { console.error('[antivn.js]:', e.message); }

  await sock.sendMessage(m.chat, {
    text: gpMsg("antivn", { user: m.sender.split("@")[0] }),
    mentions: [m.sender],
  });

  return true;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args || [])[0]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};

  if (!action) {
    const status = groupData.antivn ? "ON" : "OFF";
    await m.reply( `Anti VN\n\nStatus: ${status}\n\n\`${m.prefix}antivn on/off\``, { commandName: "antivn" });
    return;
  }

  if (action === "on") {
    db.setGroup(m.chat, { antivn: true });
    m.react("🐣");
    await m.reply(claraWrap("Antivn", `Anti VN diaktifkan`));
    return;
  }

  if (action === "off") {
    db.setGroup(m.chat, { antivn: false });
    m.react("🐣");
    await m.reply(claraWrap("Antivn", `Anti VN dinonaktifkan`));
    return;
  }

  await m.reply(`Gunakan \`${m.prefix}antivn on\` atau \`${m.prefix}antivn off\``);
}

export { pluginConfig as config, handler, handleAntiVn };
