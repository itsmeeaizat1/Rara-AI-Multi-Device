// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "aichat-history",
  alias: ["aichat-history", "aichat"],
  category: "ai",
  description: "Lihat riwayat percakapan AI di chat ini",
  usage: ".aichat-history",
  example: ".aichat-history",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const chatId = m.chat;
    const { getDatabase } = await import("../../src/lib/rara-database.js");
    const db = getDatabase();
    const data = db.get(chatId) || {};
    const history = Array.isArray(data.aiChatHistory) ? data.aiChatHistory.slice(-20) : [];

    if (!history.length) {
      const text =
        raraWrap("AI History", ["Status: *Kosong*",
          "Belum ada percakapan AI di chat ini."].join("\n")) +
        "\n" ;

      await m.react("🐣");
      await m.reply(text);
      return { handled: true };
    }

    const lines = history.map((item, index) => {
      const role = item.role === "user" ? "Kamu" : "AI";
      const content = String(item.content || "").slice(0, 120);
      return `${index + 1}. *${role}*: ${content}${String(item.content || "").length > 120 ? "..." : ""}`;
    });

    const text =
      raraWrap("AI History", "📜") +
      raraWrap("Riwayat", lines) +
      
      "\n" ;

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIChatHistory", "Gagal nih, coba lagi ya") +
      "\n" ;

    await m.reply(text, "aichat-history");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
