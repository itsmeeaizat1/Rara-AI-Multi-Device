// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  tipText, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "report",
  alias: ["report"],
  category: "group",
  description: "Laporkan masalah ke owner/admin bot",
  usage: ".report <pesan>",
  example: ".report Ada spam di grup",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const message = raw.replace(/^\.report\s+/i, "").trim();

    if (!message) {
      const text =
        novaCaption({
  emoji: "👥",
  name: "report",
  description: "Laporkan masalah ke owner/admin bot",
  usage: `${prefix}report <pesan>`,
  example: `${prefix}report Ada spam di grup`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "report");
      return { handled: true };
    }

    const db = getDatabase();
    const reportData = {
      from: m.sender,
      chat: m.chat,
      message,
      createdAt: Date.now(),
    };
    db.push("reports", reportData);

    const text =
      claraWrap("Report", [`│ Pesan: *${message.slice(0, 1500)}${message.length > 1500 ? "..." : ""}*`,
        "│ Status: *ᴛᴇʀꜱɪᴍᴘᴀɴ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("report", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "report");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
