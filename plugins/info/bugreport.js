// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bugreport.js — Laporkan bug ke owner (kirim langsung ke WA owner + simpan DB)
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaCaption, tipText } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bugreport",
  alias: ["bugreport"],
  category: "info",
  description: "Laporkan bug ke owner bot — notifikasi langsung ke WA owner",
  usage: ".bugreport <pesan>",
  example: ".bugreport Fitur .play error",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";

    // Extract message — handle both quoted reply and plain text
    let message = raw.replace(/^\.bugreport\s+/i, "").trim();

    // If no text but replying to a message, use the quoted text
    if (!message && m.quoted?.text) {
      message = m.quoted.text.trim();
    }

    if (!message) {
      return m.reply(claraWrap("Bug Report", [
        "Laporkan bug ke owner bot",
        "",
        "📌 *Cara Pakai:*",
        `${prefix}bugreport <pesan>`,
        `${prefix}bugreport (reply pesan yang bug)`,
        "",
        "💡 *Contoh:*",
        `${prefix}bugreport Fitur .play error`,
      ]));
    }

    // Save to database
    const db = getDatabase();
    const reportId = Date.now();
    db.push("bugReports", {
      id: reportId,
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

      const reporterName = m.pushName || "Unknown";
      const reporterNum = m.sender?.split("@")[0] || "Unknown";
      const chatType = m.isGroup ? "Grup" : "Private";
      const chatName = m.chatName || (m.isGroup ? "Unknown Group" : "Private Chat");
      const time = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const ownerMsg = claraWrap("Bug Report Masuk", [
        `Pesan: *${message.slice(0, 1000)}${message.length > 1000 ? "..." : ""}*`,
        "",
        `Dari: ${reporterName} (${reporterNum})`,
        `Chat: ${chatName} (${chatType})`,
        `Waktu: ${time}`,
        "",
        `Balas pesan ini atau chat langsung: wa.me/${reporterNum}`,
      ]);

      try {
        await sock.sendMessage(ownerJid, { text: ownerMsg });
        ownerNotified = true;
      } catch (e) {
        console.error("[bugreport] Gagal kirim ke owner:", e.message);
      }
    }

    // Reply ke pengirim
    if (ownerNotified) {
      await m.reply(claraWrap("Bug Report", [
        `Pesan: *${message.slice(0, 500)}${message.length > 500 ? "..." : ""}*`,
        `Status: Terkirim ke owner`,
      ]));
    } else {
      await m.reply(claraWrap("Bug Report", [
        `Pesan: *${message.slice(0, 500)}${message.length > 500 ? "..." : ""}*`,
        `Status: Tersimpan (owner tidak terjangkau)`,
      ]));
    }
  } catch (error) {
    console.error("[bugreport] error:", error.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "bugreport");
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
