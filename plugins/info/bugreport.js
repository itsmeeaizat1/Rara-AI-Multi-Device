// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "bugreport",
  alias: ["bugreport"],
  category: "info",
  description: "Laporkan bug ke owner/admin bot",
  usage: ".bugreport <pesan>",
  example: ".bugreport Fitur .play error",
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
    const message = raw.replace(/^\.bugreport\s+/i, "").trim();

    if (!message) {
      const text =
        claraWrap("Cara Pakai", [`│ Penggunaan: *${prefix}bugreport <pesan>*`,
          `│ Contoh: *${prefix}bugreport Fitur .play error*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "bugreport");
      return { handled: true };
    }

    const db = getDatabase();
    db.push("bugReports", {
      from: m.sender,
      chat: m.chat,
      message,
      createdAt: Date.now(),
    });

    const text =
      claraWrap("Bug Report", [`│ Pesan: *${message.slice(0, 1500)}${message.length > 1500 ? "..." : ""}*`,
        "│ Status: *ᴛᴇʀꜱɪᴍᴘᴀɴ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("bugreport", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "bugreport");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
