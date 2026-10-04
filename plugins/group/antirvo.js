// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { downloadContentFromMessage } from "rara";
import config from "../../config.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch group) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}

const pluginConfig = {
  name: "antirvo",
  alias: ["antirvo"],
  category: "group",
  description: "Auto-capture pesan sekali lihat (view once) menjadi media biasa",
  usage: ".antirvo <on/off>",
  example: ".antirvo on",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
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

    const card = await dlCard(mediaType === "video" ? "video" : mediaType === "audio" ? "audio" : "gambar", { buffer, mime: content?.mimetype }, [["Engine", "Rara Anti ViewOnce"], ["Pengirim", `@${senderNum}`], ["Tipe", mediaType.toUpperCase()], ["Caption Asli", String(caption || "-").slice(0, 50)]]);
    if (mediaType === "image") {
      await sock.sendMessage(m.chat, {
        image: buffer,
        caption: card ? (caption ? `${header}\nCaption: ${caption}\n\n${card}` : `${header}\n\n${card}`) : (caption ? `${header}\nCaption: ${caption}` : header),
        mentions: m.sender ? [m.sender] : [],
      });
    } else if (mediaType === "video") {
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption: card ? (caption ? `${header}\nCaption: ${caption}\n\n${card}` : `${header}\n\n${card}`) : (caption ? `${header}\nCaption: ${caption}` : header),
        mentions: m.sender ? [m.sender] : [],
      });
    } else if (mediaType === "audio") {
      await sock.sendMessage(m.chat, {
        audio: buffer,
        mimetype: content?.mimetype || "audio/ogg; codecs=opus",
        ptt: true,
      });
      await sock.sendMessage(m.chat, {
        text: card ? `${header} (Audio VN)\n\n${card}` : `${header} (Audio VN)`,
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
    await m.reply(raraWrap("AntiRvo", [`Status ${scope}: ${status}`, ``, `Ketik:`, `${m.prefix}antirvo on  - Aktifkan`, `${m.prefix}antirvo off - Nonaktifkan`, ``, `Saat aktif, setiap pesan sekali lihat (view once) akan otomatis ditampilkan sebagai media biasa.`].join("\n")));
    return;
  }

  if (action === "on") {
    if (isGroup) {
      db.setGroup(m.chat, { antirvo: true });
    } else {
      if (!config.antirvo) config.antirvo = {};
      config.antirvo.private = true;
    }
    await m.reply(raraWrap("AntiRvo", "AntiRvo diaktifkan. Setiap pesan sekali lihat akan otomatis ditampilkan."));
    return;
  }

  if (action === "off") {
    if (isGroup) {
      db.setGroup(m.chat, { antirvo: false });
    } else {
      if (!config.antirvo) config.antirvo = {};
      config.antirvo.private = false;
    }
    await m.reply(raraWrap("AntiRvo", "AntiRvo dinonaktifkan."));
    return;
  }

  await m.reply(raraGuide("AntiRvo", "Pilihan gak valid nih!", m.prefix + "antirvo on/off"));
}

export { pluginConfig as config, handler };
