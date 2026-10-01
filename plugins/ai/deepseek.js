// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// deepseek — DeepSeek AI (penalaran, jawab agak lama karena mikir dulu)
// Scraper DeepSeekThinking lama udah mati → sekarang lewat rantai fallback
// multi-API (rara-ai-fallback.js: Haidar deepsek → Ikyy → Xemoz deepseek).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "deepseek", alias: ["deepseek"],
  category: "ai", description: "DeepSeek AI — model penalaran (reasoning)",
  usage: ".deepseek <pertanyaan>", example: ".deepseek Jelaskan black hole",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) {
    return m.reply(raraWrap("deepseek", `AI yang bisa mikir dulu sebelum jawab — cocok buat pertanyaan yang butuh penalaran.\n\n📌 Format:\n${m.prefix}deepseek <pertanyaan>\n\n💡 Contoh:\n${m.prefix}deepseek Jelaskan black hole\n${m.prefix}deepseek Buat kode sorting algorithm\n\nBot akan mikir dulu, baru jawab — jadi agak lama sedikit`, "guide"));
  }
  try {
    await m.react("🕒");
    const reply = await aiFallbackChat(text, {
      persona: "DeepSeek AI — model penalaran yang mikir dulu sebelum jawab",
      model: "deepseek",
      sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName,
    });
    if (!reply) throw new Error("balasan AI kosong");
    await m.reply(reply);
    await m.react("🐣");
  } catch (e) {
    console.error("deepseek error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("deepseek", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
