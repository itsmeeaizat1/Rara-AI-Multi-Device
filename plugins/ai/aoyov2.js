// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aoyov2 — Aoyo AI
// API asli (abella.icu) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "aoyov2", alias: ["aoyov2"], aliases: ["aoyov2", "aoyoaiv2"],
  category: "ai", description: "Aoyo AI v2 (abella.icu)",
  usage: ".aoyov2 <pertanyaan>", example: ".aoyov2 jelaskan cara kerja internet",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("aoyov2", `Mau nanya apa?\nContoh: ${m.prefix}aoyov2 jelaskan internet`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Aoyo AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("aoyov2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("aoyov2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
