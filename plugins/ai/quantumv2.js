// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quantumv2 — Quantum AI
// API asli (zelapioffciall.vercel.app) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "quantumv2", alias: ["quantumv2"], aliases: ["quantumv2", "quantumaiv2"],
  category: "ai", description: "Quantum AI v2 — chat AI canggih",
  usage: ".quantumv2 <pertanyaan>", example: ".quantumv2 what is AI",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("quantumv2", `Mau nanya apa?\nContoh: ${m.prefix}quantumv2 what is AI`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Quantum AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("quantumv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("quantumv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
