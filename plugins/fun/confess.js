// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Confess — 2 mode: anonim (default) & non-anonim (dengan nama)
// .confess nomor|pesan          → anonim
// .confess nomor|pesan|nama     → non-anonim (identitas terungkap)

import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
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
  alias: ["confess"],
  category: "fun",
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

async function handler(m, { sock }) {
  const input = m.fullArgs?.trim() || m.text?.trim();

  if (!input || !input.includes("|")) {
    let txt = ``
    txt += `Kirim pesan rahasia ke seseorang\n`;
    txt += `2 mode: *anonim* & *non-anonim*\n\n`;
    txt += `  *ᴍᴏᴅᴇ ᴀɴᴏɴɪᴍ (ʀᴀʜᴀsɪᴀ):*\n`;
    txt += `\`${m.prefix}confess nomor|pesan\`\n\n`;
    txt += `  *ᴍᴏᴅᴇ ɴᴏɴ-ᴀɴᴏɴɪᴍ (ɴᴀᴍᴀ ᴛᴇʀᴜɴɢᴋᴀᴘ):*\n`;
    txt += `\`${m.prefix}confess nomor|pesan|nama\`\n\n`;
    txt += `  *ᴄᴏɴᴛᴏʜ:*\n`;
    txt += `\`${m.prefix}confess 6281234567890|Hai kak, aku suka kamu!\`\n`;
    txt += `\`${m.prefix}confess 6281234567890|Hai! Aku Budi|Budi\`\n\n`;
    txt += `  🤫 _Mode anonim: identitas 100% aman_\n`;
    txt += `  📝 _Mode non-anonim: nama kamu ditampilkan_\n\n`;
        return await m.reply(txt);
  }

  const parts = input.split("|");
  const rawNumber = parts[0] || "";
  const message = (parts[1] || "").trim();
  const senderName = (parts[2] || "").trim();

  const isAnonim = !senderName;

  if (!rawNumber || !message) {
    return m.reply(
      `Format salah nih!\n\n` +
      `  *ᴀɴᴏɴɪᴍ:*
\`${m.prefix}confess nomor|pesan\`\n` +
      `  *ɴᴏɴ-ᴀɴᴏɴɪᴍ:*
\`${m.prefix}confess nomor|pesan|nama\`\n\n` +
      ""
    );
  }

  let targetNumber = rawNumber.trim().replace(/[^0-9]/g, "");

  if (targetNumber.startsWith("0")) {
    targetNumber = "62" + targetNumber.slice(1);
  }

  if (targetNumber.length < 10 || targetNumber.length > 15) {
    return m.reply(
      `Nomor tujuan gak valid nih!\n\n` +
      ""
    );
  }

  const targetJid = targetNumber + "@s.whatsapp.net";
  const senderNumber = m.sender.split("@")[0];

  if (targetNumber === senderNumber) {
    return m.reply(
      `😂 Nggak bisa confess ke diri sendiri!\n\n` +
      ""
    );
  }

  try {
    const [onWa] = await sock.onWhatsApp(targetNumber);
    if (!onWa?.exists) {
      return m.reply(
        `❌ Nomor \`${targetNumber}\` nggak terdaftar di WhatsApp!\n\n` +
        ""
      );
    }
  } catch (e) {
    console.error("[confess.js] onWhatsApp check:", e.message);
  }

  if (message.length < 5) {
    return m.reply(
      `Pesan kependekan nih! Minimal 5 karakter.\n\n` +
      ""
    );
  }

  if (message.length > 1000) {
    return m.reply(
      `❌ Pesan kepanjangan! Maksimal 1000 karakter.\n\n` +
      ""
    );
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

    global.confessData.set(sentMsg.key.id, {
      senderJid: m.sender,
      senderChat: m.chat,
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

    let successTxt =
      `✅ Pesan terkirim!\n` +
      `📱 Ke: \`${targetNumber}\`\n`;
    if (isAnonim) {
      successTxt += `🔒 Mode: *Anonim* (identitas aman)\n`;
    } else {
      successTxt += `📝 Mode: *Non-Anonim* (nama: ${senderName})\n`;
    }
    successTxt += `\n  _Kalau dia balas, otomatis diterusin ke sini_\n\n`;
    
    await m.reply(successTxt);
    await m.react("💌");
  } catch (error) {
    console.error("[confess.js] Send error:", error.message);
    await m.reply(
      `❌ Gagal kirim pesan!
${error.message}\n\n` +
      ""
    );
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
