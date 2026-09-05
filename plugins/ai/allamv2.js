// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allamv2 — Allam AI — model bahasa buatan SDAIA (Arab Saudi)
// API asli (velyn.mom) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "allamv2", alias: ["allamv2"], aliases: ["allamv2", "allamaiv2"],
  category: "ai", description: "Allam AI v2 (allam-2-7b)",
  usage: ".allamv2 <pertanyaan>", example: ".allamv2 siapa presiden Indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("allamv2", `Mau nanya apa?\nContoh: ${m.prefix}allamv2 siapa presiden Indonesia`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Allam AI — model bahasa buatan SDAIA (Arab Saudi)", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("allamv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("allamv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
