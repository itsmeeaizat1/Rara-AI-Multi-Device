// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// logiceaiv2 — Logic E-AI v2 (velyn.biz.id custom persona)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "logiceaiv2", alias: ["logiceaiv2"], aliases: ["logiceaiv2", "logicev2"],
  category: "ai", description: "Logic E-AI v2 — custom persona AI",
  usage: ".logiceaiv2 <pertanyaan>", example: ".logiceaiv2 jelaskan fisika kuantum",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("logiceaiv2", `Mau tanya apa?\nContoh: ${m.prefix}logiceaiv2 jelaskan fisika kuantum`, "guide"));
    await m.react("🕒");
    const sys = "Nama kamu adalah Logic E-AI dan kamu diciptakan oleh Nova AI Team.";
    const res = await fetch(`https://velyn.biz.id/api/ai/aicustom?prompt=${encodeURIComponent(text)}&system=${encodeURIComponent(sys)}`);
    const data = await res.json();
    await m.reply(data?.data || data?.result || "Tidak ada respon dari API.");
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[logiceaiv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("logiceaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("logiceaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
