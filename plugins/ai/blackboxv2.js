// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// blackboxv2 — Blackbox AI
// API asli (abella.icu/blackbox-pro) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "blackboxv2", alias: ["blackboxv2"], aliases: ["blackboxv2", "bbprov2"],
  category: "ai", description: "Chat dengan Blackbox Pro AI v2 (abella.icu)",
  usage: ".blackboxv2 <pertanyaan>", example: ".blackboxv2 jelaskan cara kerja quantum computing",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("blackboxv2", `Mau nanya apa?\nContoh: ${m.prefix}blackboxv2 jelaskan quantum computing`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Blackbox AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("blackboxv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("blackboxv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
