// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// logiceaiv2 — LogicAI — AI fokus penalaran logis
// API asli (velyn.biz.id/aicustom) udah mati → sekarang lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "logiceaiv2", alias: ["logiceaiv2"], aliases: ["logiceaiv2", "logicev2"],
  category: "ai", description: "Logic E-AI v2 — custom persona AI",
  usage: ".logiceaiv2 <pertanyaan>", example: ".logiceaiv2 jelaskan fisika kuantum",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("logiceaiv2", `Mau tanya apa?\nContoh: ${m.prefix}logiceaiv2 jelaskan fisika kuantum`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "LogicAI — AI fokus penalaran logis", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("logiceaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("logiceaiv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
