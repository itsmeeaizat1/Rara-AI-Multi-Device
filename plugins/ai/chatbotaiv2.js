// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chatbotaiv2 — AI chatbot
// API asli (abella.icu/onlinechatbot) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "chatbotaiv2", alias: ["chatbotaiv2"], aliases: ["chatbotaiv2", "cbotv2"],
  category: "ai", description: "ChatBot AI v2 (abella.icu onlinechatbot)",
  usage: ".chatbotaiv2 <pertanyaan>", example: ".chatbotaiv2 ceritakan tentang Indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("chatbotaiv2", `Mau nanya apa?\nContoh: ${m.prefix}chatbotaiv2 ceritakan tentang Indonesia`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "AI chatbot", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("chatbotaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("chatbotaiv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
