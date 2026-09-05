// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// llamav2 — Llama AI dari Meta
// API asli (restapii.rioooxdzz) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "llamav2", alias: ["llamav2"], aliases: ["llamav2", "llamaaiv2"],
  category: "ai", description: "Llama AI v2 (restapii.rioooxdzz)",
  usage: ".llamav2 <pertanyaan>", example: ".llamav2 apa itu machine learning",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("llamav2", `Mau nanya apa?\nContoh: ${m.prefix}llamav2 apa itu ML`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Llama AI dari Meta", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("llamav2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("llamav2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
