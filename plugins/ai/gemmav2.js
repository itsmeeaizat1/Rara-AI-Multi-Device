// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gemmav2 — Gemini AI dari Google
// API asli (velyn.biz.id/gemma) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "gemmav2", alias: ["gemmav2"], aliases: ["gemmav2", "gemmaaiv2"],
  category: "ai", description: "Gemma AI v2 — Google Gemma 2 9B",
  usage: ".gemmav2 <pertanyaan>", example: ".gemmav2 jelaskan teori evolusi",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("gemmav2", `Mau nanya apa?\nContoh: ${m.prefix}gemmav2 jelaskan teori evolusi`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Gemini AI dari Google", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("gemmav2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("gemmav2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
