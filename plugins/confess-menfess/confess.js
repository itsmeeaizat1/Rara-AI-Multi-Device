// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Confess (DM — versi LAMA yang DIMINTA BALIK owner 20 Sep 2026:
// "bisa ga fitur confes yg dulu dikembalikan soalnya confess ini beda
// bukan buat crush tp pesan ke orang tp kekirim statusnya di grupnya
// yg dlu sesuai harapan buat nembak org yg suka diam diam bsa
// kembalikan ga jd yg confes skrg ini jd v2") — pesan confess dikirim
// LANGSUNG ke nomor orangnya (DM), status/hasil balasan masuk ke grup/
// chat pengirim — pas buat nembak orang yang suka diam-diam.
// Confess channel terpusat (v3 lama) pindah ke .confess2 (plugins/confess-menfess/confess2.js).
// REVISI 20 Sep (owner: "yg dlu confessnya g ngaish tau je grup jd sifatnya
// dm doang") — SEMUA balasan bot (status terkirim + terusan balasan target)
// DIKIRIM KE DM PENGGIRIM (m.sender), BUKAN m.chat. Kalau command dipakai di
// grup, grup GAK menerima apa-apa (gak ada reply, gak ada react) — 100% rahasia,
// makanya gak ada confess komit lama yang begini (semua varian balikin ke m.chat).
// 2 mode: anonim (default) & non-anonim (dengan nama)
// .confess nomor|pesan          → anonim
// .confess nomor|pesan|nama     → non-anonim (identitas terungkap)

import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { getDatabase } from "../../src/lib/nova-database.js";

function trackConfess(senderJid, targetJid, isAnonim) {
  try {
    const db = getDatabase();
    // Sender tracking
    const sender = db.getUser(senderJid) || db.setUser(senderJid);
    if (!sender.confessStats) sender.confessStats = { sent: 0, received: 0, anonim: 0, nonAnonim: 0 };
    sender.confessStats.sent = (sender.confessStats.sent || 0) + 1;
    if (isAnonim) sender.confessStats.anonim = (sender.confessStats.anonim || 0) + 1;
    else sender.confessStats.nonAnonim = (sender.confessStats.nonAnonim || 0) + 1;
    db.setUser(senderJid, sender);
    // Target tracking
    const target = db.getUser(targetJid) || db.setUser(targetJid);
    if (!target.confessStats) target.confessStats = { sent: 0, received: 0, anonim: 0, nonAnonim: 0 };
    target.confessStats.received = (target.confessStats.received || 0) + 1;
    db.setUser(targetJid, target);
    db.save();
  } catch (e) {
    console.error("[confess] Tracking error:", e.message);
  }
}

const pluginConfig = {
  name: "confess",
  alias: ["confess", "confessdm"],
  category: "confess menfess",
  description: "Kirim pesan confess anonim atau non-anonim",
  usage: ".confess nomor|pesan (anonim)\n.confess nomor|pesan|nama (non-anonim)",
  example: ".confess 6281234567890|Hai, aku suka kamu!\n.confess 6281234567890|Hai!|Dari Budi",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

if (!global.confessData) global.confessData = new Map();

// DM-only: semua balasan ke DM pengirim — nol output di grup (rahasia total).
async function dmReply(m, sock, text) {
  await sock.sendMessage(m.sender, {
    text,
    contextInfo: { forwardingScore: 0, isForwarded: false },
  });
}

async function handler(m, { sock }) {
  const input = m.fullArgs?.trim() || m.text?.trim();

  if (!input || !input.includes("|")) {
    return await dmReply(m, sock, claraWrap("confess", [
      `Kirim pesan rahasia ke seseorang, 2 mode: anonim & non-anonim.`,
      ``,
      `📌 Mode anonim (rahasia): ${m.prefix}confess <nomor>|<pesan>`,
      `📌 Mode non-anonim (nama terungkap): ${m.prefix}confess <nomor>|<pesan>|<nama>`,
      ``,
      `💡 Contoh: ${m.prefix}confess 6281234567890|Hai kak, aku suka kamu!`,
      `${m.prefix}confess 6281234567890|Hai! Aku Budi|Budi`,
      ``,
      `🤫 Mode anonim: identitas 100% aman`,
      `📝 Mode non-anonim: nama kamu ditampilkan`,
      ``,
      `🔒 Semua balasan bot masuk ke DM sini — gak ada jejak di grup`,
    ]));
  }

  const parts = input.split("|");
  const rawNumber = parts[0] || "";
  const message = (parts[1] || "").trim();
  const senderName = (parts[2] || "").trim();

  const isAnonim = !senderName;

  if (!rawNumber || !message) {
    return dmReply(m, sock, claraWrap("confess", [
      `Format salah nih!`,
      ``,
      `📌 Anonim: ${m.prefix}confess <nomor>|<pesan>`,
      `📌 Non-anonim: ${m.prefix}confess <nomor>|<pesan>|<nama>`,
    ]));
  }

  let targetNumber = rawNumber.trim().replace(/[^0-9]/g, "");

  if (targetNumber.startsWith("0")) {
    targetNumber = "62" + targetNumber.slice(1);
  }

  if (targetNumber.length < 10 || targetNumber.length > 15) {
    return dmReply(m, sock, claraWrap("confess", "Nomor tujuan gak valid nih!", "error"));
  }

  const targetJid = targetNumber + "@s.whatsapp.net";
  const senderNumber = m.sender.split("@")[0];

  if (targetNumber === senderNumber) {
    return dmReply(m, sock, claraWrap("confess", "Nggak bisa confess ke diri sendiri! 😂", "error"));
  }

  try {
    const [onWa] = await sock.onWhatsApp(targetNumber);
    if (!onWa?.exists) {
      return dmReply(m, sock, claraWrap("confess", `Nomor ${targetNumber} nggak terdaftar di WhatsApp!`, "error"));
    }
  } catch (e) {
    console.error("[confess.js] onWhatsApp check:", e.message);
  }

  if (message.length < 5) {
    return dmReply(m, sock, claraWrap("confess", "Pesan kependekan nih! Minimal 5 karakter.", "error"));
  }

  if (message.length > 1000) {
    return dmReply(m, sock, claraWrap("confess", "Pesan kepanjangan! Maksimal 1000 karakter.", "error"));
  }

  // Build message based on mode
  let confessText;
  if (isAnonim) {
    confessText =
      `💌 Ada seseorang yang ngirim pesan buat kamu\n\n` +
      `  💬 *ɪsɪ ᴘᴇsᴀɴ:*\n` +
      `  \`\`\`${message}\`\`\`\n\n` +
      `  🔒 _Pesan ini dikirim secara *ᴀɴᴏɴɪᴍ*_\n` +
      `Identitas pengirim dirahasiakan\n` +
      `  ✉️ _Balas pesan ini untuk membalas pengirim_\n\n` +
      "";
  } else {
    confessText =
      `💌 *${senderName}* ngirim pesan buat kamu\n\n` +
      `  💬 *ɪsɪ ᴘᴇsᴀɴ:*\n` +
      `  \`\`\`${message}\`\`\`\n\n` +
      `  📝 _Pesan ini dikirim secara *ɴᴏɴ-ᴀɴᴏɴɪᴍ*_\n` +
      `Pengirim: *${senderName}*\n` +
      `  ✉️ _Balas pesan ini untuk membalas pengirim_\n\n` +
      "";
  }

  try {
    const sentMsg = await sock.sendMessage(targetJid, {
      text: confessText,
      contextInfo: {
        forwardingScore: 0,
        isForwarded: false,
      },
    });

    // senderChat = DM pengirim (BUKAN m.chat) — balasan target diterusin ke
    // DM, grup gak pernah lihat apa-apa (revisi owner 20 Sep: sifatnya DM doang).
    global.confessData.set(sentMsg.key.id, {
      senderJid: m.sender,
      senderChat: m.sender,
      targetJid: targetJid,
      isAnonim,
      senderName: isAnonim ? null : senderName,
      createdAt: Date.now(),
    });

    // Track stats
    trackConfess(m.sender, targetJid, isAnonim);

    setTimeout(() => {
      global.confessData.delete(sentMsg.key.id);
    }, 24 * 60 * 60 * 1000);

    const modeLine = isAnonim
      ? "│ • 🔒 Mode : Anonim (identitas aman)"
      : `│ • 📝 Mode : Non-Anonim (${senderName})`;
    await dmReply(m, sock, novaGameBox({
      title: "pesan terkirim", icon: "💘",
      flavor: "💘 *PESAN TERKIRIM!*",
      body: [
        `│ • 📱 Ke : ${targetNumber}`,
        modeLine,
        "│ • ✉️ Kalau dia balas, otomatis diterusin ke sini (DM)",
      ].join("\n"),
      cta: gameCTA("confess"),
    }));
    // react HANYA di private — reaction di grup keliatan semua anggota,
    // bisa bahaya (bocorin kalau orang itu barusan nembak seseorang).
    if (!m.isGroup) await m.react("💌");
  } catch (error) {
    console.error("[confess.js] Send error:", error.message);
    await dmReply(m, sock, claraWrap("confess", `Gagal kirim pesan! ${error.message}`, "error"));
  }
}

async function replyHandler(m, { sock }) {
  try {
    if (!m.quoted) return false;

    const quotedId = m.quoted?.id || m.quoted?.key?.id;
    if (!quotedId) return false;

    const confessInfo = global.confessData.get(quotedId);
    if (!confessInfo) return false;

    if (m.sender !== confessInfo.targetJid) return false;

    const replyMessage = m.body?.trim();
    if (!replyMessage) return false;

    let replyText;
    if (confessInfo.isAnonim) {
      replyText =
        `💕 Orang yang kamu confess balas pesanmu!\n\n` +
        `  💬 *ɪsɪ ʙᴀʟᴀsᴀɴ:*\n` +
        `  \`\`\`${replyMessage}\`\`\`\n\n` +
        `  🔒 _Identitas kamu tetap aman (anonim)_\n\n` +
        "";
    } else {
      replyText =
        `💕 *${confessInfo.senderName}* — orang yang kamu confess balas!\n\n` +
        `  💬 *ɪsɪ ʙᴀʟᴀsᴀɴ:*\n` +
        `  \`\`\`${replyMessage}\`\`\`\n\n` +
        `  📝 _Balasan untuk confess non-anonim kamu_\n\n` +
        "";
    }

    await sock.sendMessage(confessInfo.senderChat, {
      text: replyText,
      contextInfo: {
        forwardingScore: 0,
        isForwarded: false,
      },
    });

    await sock.sendMessage(m.chat, {
      text:
        `✅ Balasan terkirim ke pengirim!\n\n` +
        "",
    });

    global.confessData.delete(quotedId);
    return true;
  } catch (error) {
    console.error("[confess.js] Reply handler error:", error.message);
    return false;
  }
}

export { pluginConfig as config, handler, replyHandler };
