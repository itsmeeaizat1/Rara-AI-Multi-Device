// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { gpMsg } from "../../src/lib/nova-group-protection.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antifoto",
  alias: ["antifoto"],
  category: "group",
  description: "Blokir foto / gambar di grup",
  usage: ".antifoto <on/off>",
  example: ".antifoto on",
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


async function handleAntiFoto(m, sock, db) {
  if (!m.isGroup) return false;
  if (m.isAdmin || m.isOwner || m.fromMe) return false;

  const groupData = db.getGroup(m.chat) || {};
  if (!groupData.antifoto) return false;

  const isFoto = m.isImage || m.type === "imageMessage" || m.type === "imageWithCaptionMessage";
  if (!isFoto) return false;

  try {
    await sock.sendMessage(m.chat, { delete: m.key });
  } catch (e) { console.error('[antifoto.js]:', e.message); }

  await sock.sendMessage(m.chat, {
    text: gpMsg("antifoto", { user: m.sender.split("@")[0] }),
    mentions: [m.sender],
  });

  return true;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args || [])[0]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};

  if (!action) {
    const status = groupData.antifoto ? "ON" : "OFF";
    await m.reply( `Anti Foto\n\nStatus: ${status}\n\n\`${m.prefix}antifoto on/off\``, { commandName: "antifoto" });
    return;
  }

  if (action === "on") {
    db.setGroup(m.chat, { antifoto: true });
    await m.reply(claraWrap("Antifoto", `Anti Foto diaktifkan`));
    return;
  }

  if (action === "off") {
    db.setGroup(m.chat, { antifoto: false });
    await m.reply(claraWrap("Antifoto", `Anti Foto dinonaktifkan`));
    return;
  }

  await m.reply(claraWrap("Anti foto", `Gunakan \`${m.prefix}antifoto on\` atau \`${m.prefix}antifoto off\``, "info"));
}

export { pluginConfig as config, handler, handleAntiFoto };
