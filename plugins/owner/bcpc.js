// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { decodeAndNormalize } from "../../src/lib/rara-lid.js";
import config from "../../config.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, broadcastFormat, raraBox, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "bcpc",
  alias: ["bcpc"],
  category: "owner",
  description: "Broadcast pesan ke semua kontak private chat",
  usage: ".bcpc <pesan>",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getBcContextInfo() {
  const saluranId = config.saluran?.id || "";
  const saluranName = config.saluran?.name || config.bot?.name || "";
  const ctx = {
    forwardingScore: 0,
    isForwarded: false,
  };
  return ctx;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const input = m.fullArgs?.trim() || m.text?.trim() || "";

  if (!input) {
    const jeda = db.setting("jedaBcpc") || 5000;
    return m.reply(
      "*Broadcast Private*\n\n" +
      "📋 Broadcast pesan + media ke semua kontak PC\n" +
      "⏱️ Jeda: " + jeda + "ms\n\n" +
      "📌 *Cara Pakai:*\n" +
      "Kirim teks/foto/video, lalu reply dengan `" + m.prefix + "bcpc`\n\n" +
      "💡 *Contoh:*\n" +
      "`" + m.prefix + "bcpc Info: bot update besok`\n" +
      "`" + m.prefix + "stopbcpc` — Hentikan broadcast\n" +
      "`" + m.prefix + "bcpcjeda 5s` — Atur jeda"
    );
  }

  if (global.statusBcpc) {
    return m.reply(raraWrap("bcpc", "Sedang berjalan.\nKetik *" + m.prefix + "stopbcpc* untuk hentikan"));
  }

  try {
    let mediaBuffer = null;
    let mediaType = null;
    const qmsg = m.quoted || m;

    if (qmsg.isImage) {
      try {
        mediaBuffer = await qmsg.download();
        mediaType = "image";
      } catch (e) { console.error('[bcpc.js]:', e.message); }
    } else if (qmsg.isVideo) {
      try {
        mediaBuffer = await qmsg.download();
        mediaType = "video";
      } catch (e) { console.error('[bcpc.js]:', e.message); }
    }

    const privateJids = new Set();
    const botNum = sock.user?.id?.split(":")[0] || "";

    const chatsMap = sock.store?.chats;
    if (chatsMap) {
      for (const [jid] of chatsMap.entries()) {
        const decoded = decodeAndNormalize(jid);
        if (decoded && decoded.endsWith("@s.whatsapp.net")) {
          const num = decoded.split("@")[0];
          if (num !== botNum) privateJids.add(decoded);
        }
      }
    }

    const messagesMap = sock.store?.messages;
    if (messagesMap) {
      for (const [jid] of messagesMap.entries()) {
        const decoded = decodeAndNormalize(jid);
        if (decoded && decoded.endsWith("@s.whatsapp.net")) {
          const num = decoded.split("@")[0];
          if (num !== botNum) privateJids.add(decoded);
        }
      }
    }

    const contactsObj = sock.store?.contacts;
    if (contactsObj) {
      for (const jid of Object.keys(contactsObj)) {
        const decoded = decodeAndNormalize(jid);
        if (decoded && decoded.endsWith("@s.whatsapp.net")) {
          const num = decoded.split("@")[0];
          if (num !== botNum) privateJids.add(decoded);
        }
      }
    }

    if (privateJids.size === 0) {
      return m.reply(raraBox("Broadcast PC", ["❌ Tidak ada kontak ditemukan", "Pastikan bot sudah pernah menerima pesan dari kontak tersebut"]));
    }

    const filtered = [...privateJids];
    const jeda = db.setting("jedaBcpc") || 5000;
    const ctx = getBcContextInfo();

    // Status report ke owner
    await sock.sendMessage(
      m.chat,
      {
        text:
          "*Broadcast Private Dimulai*\n\n" +
          "📝 Pesan: " + input.substring(0, 50) + (input.length > 50 ? "..." : "") + "\n" +
          "🎬 Media: " + (mediaBuffer ? mediaType : "Tidak ada") + "\n" +
          "🎯 Target: " + filtered.length + " kontak\n" +
          "⏱️ Jeda: " + jeda + "ms\n" +
          "📊 Estimasi: " + Math.ceil((filtered.length * jeda) / 60000) + " menit\n\n" +
          "🔄 Sedang mengirim ke semua kontak...\n" +
          "⏹️ Hentikan: `" + m.prefix + "stopbcpc`",
        contextInfo: ctx,
      },
      { quoted: m },
    );

    global.statusBcpc = true;
    let success = 0;
    let failed = 0;

    // Format pesan yang dikirim ke penerima
    const botName = config.bot?.name || "Rara AI";
    const senderName = m.pushName || "Owner";
    const broadcastText = broadcastFormat({
      botName,
      senderName,
      message: input,
      type: "private",
    });

    for (const jid of filtered) {
      if (global.stopBcpc) {
        delete global.stopBcpc;
        break;
      }
      try {
        if (mediaBuffer) {
          // Media + caption dengan header broadcast
          await sock.sendMedia(jid, mediaBuffer, broadcastText, null, {
            type: mediaType,
            contextInfo: ctx,
          });
        } else {
          // Text broadcast dengan header info
          await sock.sendText(jid, broadcastText, null, { contextInfo: ctx });
        }
        success++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, jeda));
    }

    delete global.statusBcpc;
    // Hasil ke owner
    await sock.sendMessage(
      m.chat,
      {
        text:
          "*Broadcast Private Selesai*\n\n" +
          "✅ Berhasil: " + success + "\n" +
          "❌ Gagal: " + failed + "\n" +
          "📊 Total: " + filtered.length + " kontak\n" +
          "📈 Sukses Rate: " + Math.round((success / filtered.length) * 100) + "%\n\n" +
          "🏷️ " + (config.bot?.name || "Rara AI"),
        contextInfo: ctx,
      },
      { quoted: m },
    );
  } catch (e) {
    delete global.statusBcpc;
    m.reply(raraWrap("bcpc", "Gagal broadcast. Coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
