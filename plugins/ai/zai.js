// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// zai — Z.ai AI (GLM)
// API asli (z.ai direct API 403) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gemini" → Ikyy → Xemoz).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "zai",
  alias: ["zai"],
  category: "ai",
  description: "ZAI — Chat dengan Z.ai AI assistant (GLM-5.2) gratis tanpa API key",
  usage: ".zai <prompt>",
  example: ".zai jelaskan cara kerja blockchain\n.zai buatkan puisi tentang laut",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(claraWrap("zai", `Mau nanya apa?\nContoh: ${m.prefix}zai jelaskan cara kerja blockchain`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "Z.ai AI (GLM)", model: "gemini" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("zai error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("zai", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
