// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// metav2 — Meta AI dari Meta (Facebook)
// API asli (mind.hydrooo.web.id) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "metav2", alias: ["metav2"], aliases: ["metav2", "metaaiv2", "llamav2"],
  category: "ai", description: "Meta AI v2 — Llama 3.1 8B (hydrooo.web.id)",
  usage: ".metav2 <pertanyaan>", example: ".metav2 jelaskan cara kerja HTTP",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("metav2", `Mau nanya apa?\nContoh: ${m.prefix}metav2 jelaskan HTTP`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Meta AI dari Meta (Facebook)", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("metav2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("metav2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
