// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap, broadcastFormat } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "broadcast",
  alias: ["bc", "broadcast", "kirimsemua", "announce"],
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const message = m.text?.trim();

    if (!message) {
      const text =
        claraWrap("Cara Pakai", [
          `Penggunaan: *${prefix}broadcast <pesan>*`,
          `Contoh: *${prefix}broadcast Update bot v2.0*`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "broadcast");
      return { handled: true };
    }

    const db = getDatabase();
    const groups = db.getAllGroups();
    const groupJids = Object.keys(groups);

    if (!groupJids.length) {
      const text =
        claraWrap("Broadcast", [
          "Target: Tidak ada grup terdaftar",
          "Status: Dibatalkan",
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text);
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
      claraWrap("Broadcast Selesai", [
        `Pesan: ${message.slice(0, 50)}${message.length > 50 ? "..." : ""}`,
        `Target: ${groupJids.length} Grup`,
        `Berhasil: ${success.length}`,
        `Gagal: ${failed.length}`,
        "Status: SELESAI",
      ].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(result);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [
        "Status: Gagal",
        `Alasan: ${error.message}`,
      ].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "broadcast");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
