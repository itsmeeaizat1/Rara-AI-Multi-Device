// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aichat-history",
  alias: ["chathistory", "historyai", "aichathist"],
  category: "ai",
  description: "Lihat riwayat percakapan AI di chat ini",
  usage: ".aichat-history",
  example: ".aichat-history",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const chatId = m.chat;
    const { getDatabase } = await import("../../src/lib/nova-database.js");
    const db = getDatabase();
    const data = db.get(chatId) || {};
    const history = Array.isArray(data.aiChatHistory) ? data.aiChatHistory.slice(-20) : [];

    if (!history.length) {
      const text =
        claraWrap("AI History", ["│ ❏ Status: *Kosong*",
          "│ ❏ Belum ada percakapan AI di chat ini."].join("\n")) +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    const lines = history.map((item, index) => {
      const role = item.role === "user" ? "Kamu" : "AI";
      const content = String(item.content || "").slice(0, 120);
      return `${index + 1}. *${role}*: ${content}${String(item.content || "").length > 120 ? "..." : ""}`;
    });

    const text =
      claraWrap("AI History", "📜") +
      claraWrap("Riwayat", lines) +
      
      "\n" ;

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *Gagal*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" ;

    await m.reply(text, "aichat-history");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
