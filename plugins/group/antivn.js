// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { gpMsg } from "../../src/lib/nova-group-protection.js";
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antivn",
  alias: ["antivn"],
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
    await m.reply(novaWrap("Antivn", `Anti VN diaktifkan`));
    return;
  }

  if (action === "off") {
    db.setGroup(m.chat, { antivn: false });
    await m.reply(novaWrap("Antivn", `Anti VN dinonaktifkan`));
    return;
  }

  await m.reply(novaWrap("Anti vn", `Gunakan \`${m.prefix}antivn on\` atau \`${m.prefix}antivn off\``, "info"));
}

export { pluginConfig as config, handler, handleAntiVn };
