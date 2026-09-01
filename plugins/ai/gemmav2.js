// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gemmav2 — Gemma AI v2 (gemma-2-9b-it via velyn.biz.id)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "gemmav2", alias: ["gemmav2"], aliases: ["gemmav2", "gemmaaiv2"],
  category: "ai", description: "Gemma AI v2 — Google Gemma 2 9B",
  usage: ".gemmav2 <pertanyaan>", example: ".gemmav2 jelaskan teori evolusi",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("gemmav2", `Mau nanya apa?\nContoh: ${m.prefix}gemmav2 jelaskan teori evolusi`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://www.velyn.biz.id/api/ai/gemma-2-9b-it?prompt=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data?.status) { await m.reply(data.data); await m.react("🐣"); }
    else { await m.reply(claraWrap("gemmav2", "Gagal mendapatkan data.", "error")); }
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[gemmav2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("gemmav2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("gemmav2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
