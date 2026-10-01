// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, broadcastFormat, raraCaption, tipText } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "broadcast",
  alias: ["broadcast"],
  category: "owner",
  description: "Broadcast pesan ke semua grup (owner only)",
  usage: ".broadcast <pesan>",
  example: ".broadcast Update bot v2.0",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const message = m.text?.trim();

    if (!message) {
      const text = raraCaption({
        emoji: "👑",
        name: "broadcast",
        description: "Broadcast pesan ke semua grup (owner only)",
        usage: `${prefix}broadcast <pesan>`,
        example: `${prefix}broadcast Update bot v2.0`,
      }) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "broadcast");
      return { handled: true };
    }

    const db = getDatabase();
    const groups = db.getAllGroups();
    const groupJids = Object.keys(groups);

    if (!groupJids.length) {
      await m.reply(raraBox("Broadcast", ["❌ Tidak ada grup terdaftar", "Status: Dibatalkan"]));
      return { handled: true };
    }

    const botName = config.bot?.name || "Rara AI";
    const senderName = m.pushName || "Owner";
    const broadcastText = broadcastFormat({
      botName,
      senderName,
      message,
      type: "group",
    });

    const success = [];
    const failed = [];

    for (const jid of groupJids) {
      try {
        await sock.sendMessage(jid, { text: broadcastText });
        success.push(jid);
      } catch {
        failed.push(jid);
      }
    }

    const result = raraBox("Broadcast Selesai", [
      "Pesan: " + message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      "---",
      "Target: " + groupJids.length + " Grup",
      "Berhasil: " + success.length,
      "Gagal: " + failed.length,
      "Sukses Rate: " + Math.round((success.length / groupJids.length) * 100) + "%",
    ]);

    await m.reply(result);
  } catch (error) {
    await m.reply(raraBox("Broadcast", ["❌ Gagal mengirim broadcast", "Alasan: " + error.message]), "broadcast");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
