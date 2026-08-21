// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { decodeAndNormalize } from "../../src/lib/nova-lid.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, broadcastFormat } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bcpc",
  alias: ["broadcastpc", "bcprivate"],
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
    return sendReplyWithNav(sock, m, claraWrap("Broadcast Private Chat", [
      `Jeda: ${jeda}ms (${(jeda / 1000).toFixed(1)}s)`,
      "",
      "PENGGUNAAN:",
      `${m.prefix}bcpc <pesan> — Kirim ke semua kontak`,
      `${m.prefix}bcpc (reply media) — Kirim dengan media`,
      "",
      "Peringatan: Bot akan mengirim pesan ke semua kontak yang tersimpan!",
      "Note: Kontak hanya terdeteksi jika mereka sudah pernah mengirim pesan ke bot.",
    ].join("\n")), "bcpc");
  }

  if (global.statusBcpc) {
    return m.reply(claraWrap("Broadcast Private", `Sedang berjalan. Ketik ${m.prefix}stopbcpc untuk menghentikan.`));
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
      return m.reply(claraWrap("Broadcast Private", "Tidak ada kontak ditemukan. Pastikan bot sudah pernah menerima pesan dari kontak tersebut."));
    }

    const filtered = [...privateJids];
    const jeda = db.setting("jedaBcpc") || 5000;
    const ctx = getBcContextInfo();

    // Status report ke owner (claraWrap style)
    await sock.sendMessage(
      m.chat,
      {
        text: claraWrap("Broadcast Private Dimulai", [
          `Pesan: ${input.substring(0, 50)}${input.length > 50 ? "..." : ""}`,
          `Media: ${mediaBuffer ? mediaType : "Tidak ada"}`,
          `Target: ${filtered.length} kontak`,
          `Jeda: ${jeda}ms`,
          `Estimasi: ${Math.ceil((filtered.length * jeda) / 60000)} menit`,
          "",
          "Sedang mengirim ke semua kontak...",
        ].join("\n")),
        contextInfo: ctx,
      },
      { quoted: m },
    );

    global.statusBcpc = true;
    let success = 0;
    let failed = 0;

    // Format pesan yang dikirim ke penerima
    const botName = config.bot?.name || "Nova AI";
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
    m.react("✅");

    // Hasil ke owner (claraWrap style, no typo)
    await sock.sendMessage(
      m.chat,
      {
        text: claraWrap("Broadcast Private Selesai", [
          `Berhasil: ${success}`,
          `Gagal: ${failed}`,
          `Total: ${filtered.length}`,
        ].join("\n")),
        contextInfo: ctx,
      },
      { quoted: m },
    );
  } catch (e) {
    delete global.statusBcpc;
    m.reply(claraWrap("Broadcast Private", "Gagal: " + e.message));
  }
}

export { pluginConfig as config, handler };
