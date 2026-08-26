// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antibug",
  alias: ["antibug", "antibugmsg", "abug", "antibugwa"],
  category: "group",
  description: "Blokir pesan bug WhatsApp di grup",
  usage: ".antibug <on/off>",
  example: ".antibug on",
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

// Bug message detection
function detectBug(m) {
  // Detect very large messages (potential crash messages)
  const text = m.body || m.text || "";
  if (text.length > 50000) return true;

  // Detect messages with excessive mentions (crash/bug)
  const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length > 50) return true;

  // Detect null/empty type messages (bug payload)
  const msgType = m.type;
  if (!msgType || msgType === "") return true;

  // Detect protocol buffer manipulation patterns
  if (msgType === "protocolMessage" && !m.message?.protocolMessage) return true;

  // Detect oversized sticker dimensions (crash stickers)
  if (msgType === "stickerMessage") {
    const sticker = m.message?.stickerMessage;
    if (sticker) {
      const width = sticker?.isAnimated;
      const fileLength = sticker?.fileLength;
      // Animated stickers with abnormally large file size
      if (typeof fileLength === "object" || (typeof fileLength === "number" && fileLength > 1000000)) {
        return true;
      }
    }
  }

  // Detect suspicious viewOnce messages with large payloads
  if (msgType === "viewOnceMessage" || msgType === "viewOnceMessageV2") {
    const inner = m.message?.[msgType]?.message;
    if (inner) {
      const innerKeys = Object.keys(inner);
      for (const key of innerKeys) {
        const innerMsg = inner[key];
        if (innerMsg?.fileLength && typeof innerMsg.fileLength === "number" && innerMsg.fileLength > 100000000) {
          return true;
        }
      }
    }
  }

  // Detect document messages with suspicious extensions (crash documents)
  if (msgType === "documentMessage" || msgType === "documentWithCaptionMessage") {
    const doc = m.message?.[msgType] || m.message?.documentWithCaptionMessage?.message?.documentMessage;
    if (doc) {
      const fileName = doc.fileName || "";
      // Suspicious crash file extensions
      const crashExts = [".smil", ".smali", ".xml.bak", ".txt.bat"];
      const lowerName = fileName.toLowerCase();
      for (const ext of crashExts) {
        if (lowerName.endsWith(ext)) return true;
      }
      // Very large document with no title (potential bug)
      const fileLength = doc.fileLength;
      if (typeof fileLength === "number" && fileLength > 500000000) return true;
    }
  }

  return false;
}

async function handleAntiBug(m, sock, db) {
  if (!m.isGroup) return false;
  if (m.isAdmin || m.isOwner || m.fromMe) return false;

  const groupData = db.getGroup(m.chat) || {};
  if (!groupData.antibug) return false;

  if (!detectBug(m)) return false;

  try {
    await sock.sendMessage(m.chat, { delete: m.key });
  } catch (e) { console.error('[antibug.js]:', e.message); }

  await sock.sendMessage(m.chat, {
    text: `Anti Bug - Pesan dari @${m.sender.split("@")[0]} dihapus (terdeteksi bug)`,
    mentions: [m.sender],
  });

  return true;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args || [])[0]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};

  if (!action) {
    const status = groupData.antibug ? "ON" : "OFF";
    return m.reply( `Anti Bug\n\nStatus: ${status}\n\n\`${m.prefix}antibug on/off\``, { commandName: "antibug" });
  }

  if (action === "on") {
    db.setGroup(m.chat, { antibug: true });
    m.react("🐣");
    return m.reply(claraWrap("Antibug", `Anti Bug diaktifkan`));
  }

  if (action === "off") {
    db.setGroup(m.chat, { antibug: false });
    m.react("🐣");
    return m.reply(claraWrap("Antibug", `Anti Bug dinonaktifkan`));
  }

  return m.reply(`Gunakan \`${m.prefix}antibug on\` atau \`${m.prefix}antibug off\``);
}

export { pluginConfig as config, handler, handleAntiBug };
