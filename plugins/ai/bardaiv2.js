// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bardaiv2 — Bard AI dari Google
// API asli (luminai.my.id) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "bardaiv2", alias: ["bardaiv2"], aliases: ["bardaiv2", "geminiprov2"],
  category: "ai", description: "Chat dengan Gemini Pro v2 (luminai.my.id)",
  usage: ".bardaiv2 <pertanyaan>", example: ".bardaiv2 apa itu AI",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(novaWrap("bardaiv2", `Mau nanya apa?\nContoh: ${m.prefix}bardaiv2 apa itu AI`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Bard AI dari Google", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("bardaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("bardaiv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
