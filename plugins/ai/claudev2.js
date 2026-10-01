// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// claudev2 — Claude AI v2 (multi fallback: blackbox + unlimitedai)
import { blackboxAI } from "../../src/scraper/blackbox-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "claudev2",
  alias: ["claudev2", "claude2", "claudeai2"],
  category: "ai",
  description: "Claude AI v2 — multi fallback engine",
  usage: ".claudev2 <pertanyaan>",
  example: ".claudev2 buat puisi tentang persahabatan\n.claudev2 jelaskan konsep OOP",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(raraWrap("claudev2", `Mau nanya apa ke Claude v2?\n\nContoh: ${m.prefix}claudev2 buat puisi persahabatan\n${m.prefix}claudev2 jelaskan OOP`, "guide"));
    }

    await m.react("🕒");

    // Coba Blackbox dengan systemPrompt Claude-style
    let result = await blackboxAI(text, {
      systemPrompt: "You are Claude, an AI assistant made by Anthropic. Answer in Indonesian if the user asks in Indonesian. Be thoughtful, accurate, and helpful.",
    });

    // Fallback ke UnlimitedAI
    if (!result.status) {
      result = await UnlimitedAI(text, "rara-ai", {
        systemPrompt: "Jawab dengan gaya Claude AI — thoughtful, nuanced, dan detail. Bahasa Indonesia.",
      });
    }

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("claudev2", "Claude v2 lagi offline 🤖", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("claudev2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("claudev2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
