// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// yuprav2 — Yup AI
// API asli (text.pollinations.ai) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "yuprav2",
  alias: ["yuprav2", "yupraaiv2"],
  category: "ai",
  description: "AI chat v2 (Pollinations — free, no API key)",
  usage: ".yuprav2 <pertanyaan>",
  example: ".yuprav2 apa itu AI",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(novaWrap("yuprav2", `Tanya apa?\nContoh: ${m.prefix}yuprav2 apa itu AI`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Yup AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("yuprav2 error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("yuprav2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
