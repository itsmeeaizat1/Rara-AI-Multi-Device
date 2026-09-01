// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bardai — Google Bard AI (pakai Gemini API + fallback unlimitedai)
import { chat as GeminiChat } from "../../src/scraper/gemini.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bardai",
  alias: ["bardai", "bard", "googleai"],
  category: "ai",
  description: "Chat dengan Google Bard/Gemini AI",
  usage: ".bardai <pertanyaan>",
  example: ".bardai apa itu gravitational wave?\n.bardai rekomendasi buku untuk pemula programming",
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
      return m.reply(claraWrap("bardai", `Mau nanya apa ke Bard?\n\nContoh: ${m.prefix}bardai apa itu gravitational wave?\n${m.prefix}bardai rekomendasi buku programming`, "guide"));
    }

    await m.react("🕒");

    let result = null;

    // Coba Gemini scraper dulu
    try {
      const geminiResult = await GeminiChat(text);
      if (geminiResult && geminiResult.text) {
        result = { status: true, answer: geminiResult.text };
      }
    } catch (e) {
      console.error("bardai gemini:", e.message);
    }

    // Fallback ke UnlimitedAI
    if (!result || !result.status) {
      result = await UnlimitedAI(text, "nova-ai", {
        systemPrompt: "Kamu adalah Google Bard/Gemini. Jawab dengan akurat, kreatif, dan informatif. Bahasa Indonesia.",
      });
    }

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("bardai", "Bard lagi offline 🤖", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 *ɢᴏᴏɢʟᴇ ʙᴀʀᴅ* 」\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("bardai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("bardai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
