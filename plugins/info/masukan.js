// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// masukan.js — Kirim masukan/saran ke owner (kirim langsung ke WA owner + simpan DB)
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaCaption, tipText } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "masukan",
  alias: ["masukan", "saran"],
  category: "info",
  description: "Kirim masukan/saran ke owner bot — notifikasi langsung ke WA owner",
  usage: ".masukan <pesan>",
  example: ".masukan Tambahin fitur game tebak lagu dong",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";

    // Extract message — handle both quoted reply and plain text
    let message = raw.replace(/^\.saran\s+/i, "").replace(/^\.masukan\s+/i, "").trim();

    // If no text but replying to a message, use the quoted text
    if (!message && m.quoted?.text) {
      message = m.quoted.text.trim();
    }

    if (!message) {
      return m.reply(claraWrap("Kirim Masukan", [
        "Kirim saran/masukan ke owner bot",
        "",
        "📌 *Cara Pakai:*",
        `${prefix}masukan <pesan>`,
        `${prefix}masukan (reply pesan yang mau dijadikan masukan)`,
        "",
        "💡 *Contoh:*",
        `${prefix}masukan Tambahin fitur game tebak lagu dong`,
      ]));
    }

    // Save to database
    const db = getDatabase();
    const masukanId = Date.now();
    db.push("masukan", {
      id: masukanId,
      from: m.sender,
      fromName: m.pushName || "Unknown",
      chat: m.chat,
      chatName: m.chatName || "Private",
      message,
      createdAt: Date.now(),
      status: "pending",
    });

    // Kirim notifikasi ke owner
    const ownerNumbers = botConfig.owner?.number || [];
    let ownerNotified = false;

    if (ownerNumbers.length > 0) {
      const ownerJid = `${String(ownerNumbers[0]).replace(/[^0-9]/g, "")}@s.whatsapp.net`;

      const senderName = m.pushName || "Unknown";
      const senderNum = m.sender?.split("@")[0] || "Unknown";
      const chatType = m.isGroup ? "Grup" : "Private";
      const chatName = m.chatName || (m.isGroup ? "Unknown Group" : "Private Chat");
      const time = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const ownerMsg = claraWrap("Masukan Masuk", [
        `Pesan: *${message.slice(0, 1000)}${message.length > 1000 ? "..." : ""}*`,
        "",
        `Dari: ${senderName} (${senderNum})`,
        `Chat: ${chatName} (${chatType})`,
        `Waktu: ${time}`,
        "",
        `Balas pesan ini atau chat langsung: wa.me/${senderNum}`,
      ]);

      try {
        await sock.sendMessage(ownerJid, { text: ownerMsg });
        ownerNotified = true;
      } catch (e) {
        console.error("[masukan] Gagal kirim ke owner:", e.message);
      }
    }

    // Reply ke pengirim
    if (ownerNotified) {
      await m.reply(claraWrap("Kirim Masukan", [
        `Pesan: *${message.slice(0, 500)}${message.length > 500 ? "..." : ""}*`,
        `Status: Terkirim ke owner`,
      ]));
    } else {
      await m.reply(claraWrap("Kirim Masukan", [
        `Pesan: *${message.slice(0, 500)}${message.length > 500 ? "..." : ""}*`,
        `Status: Tersimpan (owner tidak terjangkau)`,
      ]));
    }
  } catch (error) {
    console.error("[masukan] error:", error.message);
    return m.reply(te(m.prefix, m.command, m.pushName), "masukan");
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
