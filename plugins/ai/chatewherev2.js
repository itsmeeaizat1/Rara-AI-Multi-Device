// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chatewherev2 — ChatGPT
// API asli (chateverywhere.app) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gpt5" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "chatewherev2", alias: ["chatewherev2"], aliases: ["chatewherev2", "cewherev2"],
  category: "ai", description: "ChatEveryWhere AI v2 (chateverywhere.app)",
  usage: ".chatewherev2 <pertanyaan>", example: ".chatewherev2 jelaskan API",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("chatewherev2", `Mau nanya apa?\nContoh: ${m.prefix}chatewherev2 jelaskan API`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "ChatGPT", model: "gpt5" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("chatewherev2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("chatewherev2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
