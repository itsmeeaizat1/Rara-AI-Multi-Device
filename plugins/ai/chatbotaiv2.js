// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chatbotaiv2 — AI chatbot
// API asli (abella.icu/onlinechatbot) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "chatbotaiv2", alias: ["chatbotaiv2"], aliases: ["chatbotaiv2", "cbotv2"],
  category: "ai", description: "ChatBot AI v2 (abella.icu onlinechatbot)",
  usage: ".chatbotaiv2 <pertanyaan>", example: ".chatbotaiv2 ceritakan tentang Indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("chatbotaiv2", `Mau nanya apa?\nContoh: ${m.prefix}chatbotaiv2 ceritakan tentang Indonesia`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "AI chatbot", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("chatbotaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("chatbotaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
