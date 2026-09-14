// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// luminv2 — Lumin AI
// API asli (luminai.my.id) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "luminv2", alias: ["luminv2"], aliases: ["luminv2", "luminaiv2"],
  category: "ai", description: "Lumin AI v2 (luminai.my.id)",
  usage: ".luminv2 <pertanyaan>", example: ".luminv2 apa itu quantum computing",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("luminv2", `Ada yang bisa dibantu?\nContoh: ${m.prefix}luminv2 apa itu quantum`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Lumin AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("luminv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("luminv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
