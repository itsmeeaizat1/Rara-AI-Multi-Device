// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// typliv2 — Typli AI
// API asli (typli.ai) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "typliv2", alias: ["typliv2"], aliases: ["typliv2", "typliaiv2"],
  category: "ai", description: "Typli AI v2 — text completion AI",
  usage: ".typliv2 <pertanyaan>", example: ".typliv2 ceritakan tentang sejarah dunia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("typliv2", `Tanya apa?\nContoh: ${m.prefix}typliv2 ceritakan sejarah dunia`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Typli AI", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("typliv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("typliv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
