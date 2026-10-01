// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chataiv2 — AI asisten ChatAI
// API asli (chatai.org) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gpt4o" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "chataiv2", alias: ["chataiv2"], aliases: ["chataiv2", "chataiorgv2"],
  category: "ai", description: "ChatAI v2 (chatai.org)",
  usage: ".chataiv2 <pertanyaan>", example: ".chataiv2 apa itu blockchain",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("chataiv2", `Mau nanya apa?\nContoh: ${m.prefix}chataiv2 apa itu blockchain`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "AI asisten ChatAI", model: "gpt4o" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("chataiv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("chataiv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
