// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gptturbov2 — GPT Turbo dari OpenAI
// API asli (restapii.rioooxdzz) udah mati → sekarang lewat rantai fallback multi-API
// (nova-ai-fallback.js: Haidar model "gpt4" → Ikyy → Xemoz).
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

const pluginConfig = {
  name: "gptturbov2", alias: ["gptturbov2"], aliases: ["gptturbov2", "gpttv2"],
  category: "ai", description: "GPT Turbo v2 (restapii.rioooxdzz)",
  usage: ".gptturbov2 <pertanyaan>", example: ".gptturbov2 jelaskan blockchain",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(novaWrap("gptturbov2", `Mau nanya apa?\nContoh: ${m.prefix}gptturbov2 jelaskan blockchain`, "guide"));
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, { persona: "GPT Turbo dari OpenAI", model: "gpt4" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("gptturbov2 error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("gptturbov2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
