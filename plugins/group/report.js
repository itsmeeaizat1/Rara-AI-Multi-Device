// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// report.js — Laporkan masalah ke owner (kirim langsung ke WA owner + simpan DB)
import { novaWrap, novaCaption, tipText, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "report",
  alias: ["report"],
  category: "group",
  description: "Laporkan masalah ke owner bot — notifikasi langsung ke WA owner",
  usage: ".report <pesan>",
  example: ".report Ada spam di grup",
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
    let message = raw.replace(/^\.report\s+/i, "").trim();

    // If no text but replying to a message, use the quoted text
    if (!message && m.quoted?.text) {
      message = m.quoted.text.trim();
    }

    if (!message) {
      return m.reply(novaGuide("Report", "Laporkan masalah atau kendala langsung ke owner bot!", `${prefix}report Ada spam di grup`));
    }

    // Save to database
    const db = getDatabase();
    const reportId = Date.now();
    if (!db.data.reports) db.data.reports = [];
    db.data.reports.push({
      id: reportId,
      from: m.sender,
      fromName: m.pushName || "Unknown",
      chat: m.chat,
      chatName: m.chatName || "Group",
      message,
      createdAt: Date.now(),
      status: "pending",
    });
    await db.save(); // persist koleksi laporan (pola db.data + save)

    // Kirim notifikasi ke owner
    const ownerNumbers = botConfig.owner?.number || [];
    let ownerNotified = false;

    for (const ownerNum of ownerNumbers) {
      const ownerJid = `${String(ownerNum).replace(/[^0-9]/g, "")}@s.whatsapp.net`;
      if (!/^\d+@s\.whatsapp\.net$/.test(ownerJid)) continue; // skip nomor kosong/invalid

      const reporterName = m.pushName || "Unknown";
      const reporterNum = m.sender?.split("@")[0] || "Unknown";
      const chatType = m.isGroup ? "Grup" : "Private";
      const chatName = m.chatName || (m.isGroup ? "Unknown Group" : "Private Chat");
      const time = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const ownerMsg = novaWrap("Report Masuk", [
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
        console.error("[report] Gagal kirim ke owner (" + ownerJid + "):", e.message);
        continue; // coba nomor owner berikutnya
      }
    }

    // Reply ke pengirim
    if (ownerNotified) {
      await m.reply(novaWrap("Report", [
        `Pesan: *${message.slice(0, 500)}${message.length > 500 ? "..." : ""}*`,
        `Status: Terkirim ke owner`,
      ]));
    } else {
      await m.reply(novaWrap("Report", [
        `Pesan: *${message.slice(0, 500)}${message.length > 500 ? "..." : ""}*`,
        `Status: Tersimpan (owner tidak terjangkau)`,
      ]));
    }
  } catch (error) {
    console.error("[report] error:", error.message);
    return m.reply(novaError("Report", `Gagal mengirim laporan: ${error.message || "terjadi kesalahan"}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler };