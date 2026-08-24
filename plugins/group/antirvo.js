// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { downloadContentFromMessage } from "nova";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antirvo",
  alias: ["antiviewonce", "antivo", "antireadviewonce"],
  category: "group",
  description: "Auto-capture pesan sekali lihat (view once) menjadi media biasa",
  usage: ".antirvo <on/off>",
  example: ".antirvo on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  isAdmin: true,
  isBotAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ─── Deteksi view-once message ───
function getViewOnceContent(msg) {
  const viewOnce =
    msg.message?.viewOnceMessage?.message ||
    msg.message?.viewOnceMessageV2?.message ||
    msg.message?.viewOnceMessageV2Extension?.message;

  if (!viewOnce) return null;

  const types = Object.keys(viewOnce);
  for (const type of types) {
    if (
      type === "imageMessage" ||
      type === "videoMessage" ||
      type === "audioMessage"
    ) {
      return { type, content: viewOnce[type] };
    }
  }
  return null;
}

// ─── Hook: dipanggil di handler.js untuk setiap incoming message ───
export async function handleAntiRvo(m, sock, db) {
  if (m.fromMe) return false;

  let isEnabled = false;
  if (m.isGroup) {
    const groupData = db?.getGroup?.(m.chat) || {};
    isEnabled = !!groupData.antirvo;
  } else {
    isEnabled = !!config.antirvo?.private;
  }

  if (!isEnabled) return false;

  const rawMsg = m.raw || m.message || m;
  const viewOnceData = getViewOnceContent(rawMsg);
  if (!viewOnceData) return false;

  try {
    const { type, content } = viewOnceData;

    let mediaType = null;
    if (type === "imageMessage") mediaType = "image";
    else if (type === "videoMessage") mediaType = "video";
    else if (type === "audioMessage") mediaType = "audio";
    if (!mediaType) return false;

    const stream = await downloadContentFromMessage(content, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    if (!buffer || buffer.length < 100) return false;

    let caption = content?.caption || "";
    const senderNum = m.sender?.split("@")[0] || "?";
    const header = `Anti ViewOnce\nDari: @${senderNum}\nTipe: ${mediaType.toUpperCase()}`;

    if (mediaType === "image") {
      await sock.sendMessage(m.chat, {
        image: buffer,
        caption: caption ? `${header}\nCaption: ${caption}` : header,
        mentions: m.sender ? [m.sender] : [],
      });
    } else if (mediaType === "video") {
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption: caption ? `${header}\nCaption: ${caption}` : header,
        mentions: m.sender ? [m.sender] : [],
      });
    } else if (mediaType === "audio") {
      await sock.sendMessage(m.chat, {
        audio: buffer,
        mimetype: content?.mimetype || "audio/ogg; codecs=opus",
        ptt: true,
      });
      await sock.sendMessage(m.chat, {
        text: `${header} (Audio VN)`,
        mentions: m.sender ? [m.sender] : [],
      });
    }

    return true;
  } catch (err) {
    console.log("[AntiRvo] Error:", err.message);
    return false;
  }
}

// ─── Command handler ───
async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args || [])[0]?.toLowerCase();
  const isGroup = m.isGroup;
  const groupData = isGroup ? db.getGroup(m.chat) || {} : {};
  const currentStatus = isGroup
    ? !!groupData.antirvo
    : !!config.antirvo?.private;

  if (!action) {
    const status = currentStatus ? "ON" : "OFF";
    const scope = isGroup ? "Grup ini" : "Private chat";
    await m.reply(claraWrap("AntiRvo", [`Status ${scope}: ${status}`, ``, `Ketik:`, `${m.prefix}antirvo on  - Aktifkan`, `${m.prefix}antirvo off - Nonaktifkan`, ``, `Saat aktif, setiap pesan sekali lihat (view once) akan otomatis ditampilkan sebagai media biasa.`].join("\n")));
    return;
  }

  if (action === "on") {
    if (isGroup) {
      db.setGroup(m.chat, { antirvo: true });
    } else {
      if (!config.antirvo) config.antirvo = {};
      config.antirvo.private = true;
    }
    await m.react("🐣");
    await m.reply(claraWrap("AntiRvo", "AntiRvo diaktifkan. Setiap pesan sekali lihat akan otomatis ditampilkan."));
    return;
  }

  if (action === "off") {
    if (isGroup) {
      db.setGroup(m.chat, { antirvo: false });
    } else {
      if (!config.antirvo) config.antirvo = {};
      config.antirvo.private = false;
    }
    await m.reply(claraWrap("AntiRvo", "AntiRvo dinonaktifkan."));
    return;
  }

  await m.reply(claraWrap("AntiRvo", `Pilihan tidak valid. Ketik ${m.prefix}antirvo on atau ${m.prefix}antirvo off`));
}

export { pluginConfig as config, handler };
