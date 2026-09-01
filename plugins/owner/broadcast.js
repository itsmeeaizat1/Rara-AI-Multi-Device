// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, broadcastFormat, novaCaption, tipText } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
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
      const text = novaCaption({
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
      await m.reply(
        "❌ Tidak ada grup terdaftar\nStatus: Dibatalkan"
      );
      return { handled: true };
    }

    const botName = config.bot?.name || "Nova AI";
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

    const result =
      "*Broadcast Selesai*\n\n" +
      "📝 Pesan: " + message.slice(0, 50) + (message.length > 50 ? "..." : "") + "\n" +
      "🎯 Target: " + groupJids.length + " Grup\n" +
      "✅ Berhasil: " + success.length + "\n" +
      "❌ Gagal: " + failed.length + "\n" +
      "📊 Sukses Rate: " + Math.round((success.length / groupJids.length) * 100) + "%\n\n" +
      "🏷️ " + botName;

    await m.reply(result);
  } catch (error) {
    const text =
      "❌ Gagal mengirim broadcast\nAlasan: " + error.message;

    await m.reply(text, "broadcast");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
