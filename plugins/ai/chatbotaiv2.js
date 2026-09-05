// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chatbotaiv2 — ChatBot AI v2 (abella.icu)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "chatbotaiv2", alias: ["chatbotaiv2"], aliases: ["chatbotaiv2", "cbotv2"],
  category: "ai", description: "ChatBot AI v2 (abella.icu onlinechatbot)",
  usage: ".chatbotaiv2 <pertanyaan>", example: ".chatbotaiv2 ceritakan tentang Indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("chatbotaiv2", `Mau nanya apa?\nContoh: ${m.prefix}chatbotaiv2 ceritakan tentang Indonesia`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://www.abella.icu/onlinechatbot?q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data?.data?.answer?.data) { await m.react("🐣"); await m.reply(data.data.answer.data); }
    else { await m.reply(claraWrap("chatbotaiv2", "Tidak menemukan jawaban.", "error")); }
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[chatbotaiv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("chatbotaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("chatbotaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
