// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aivelynv2 — Aivelyn AI
// API asli (velyn.biz.id) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "aivelynv2", alias: ["aivelynv2"], aliases: ["aivelynv2", "velynaiv2"],
  category: "ai", description: "Aivelyn AI v2 (velyn.biz.id)",
  usage: ".aivelynv2 <pertanyaan>", example: ".aivelynv2 apa itu deep learning",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("aivelynv2", `Mau nanya apa?\nContoh: ${m.prefix}aivelynv2 apa itu deep learning`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Aivelyn AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("aivelynv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("aivelynv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
