// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allamv2 — Allam AI v2 (allam-2-7b via velyn.mom)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "allamv2", alias: ["allamv2"], aliases: ["allamv2", "allamaiv2"],
  category: "ai", description: "Allam AI v2 (allam-2-7b)",
  usage: ".allamv2 <pertanyaan>", example: ".allamv2 siapa presiden Indonesia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("allamv2", `Mau nanya apa?\nContoh: ${m.prefix}allamv2 siapa presiden Indonesia`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://www.velyn.mom/api/ai/allam-2-7b?prompt=${encodeURIComponent(text)}`);
    const data = await res.json();
    await m.reply(data?.data?.result || data?.result || "Tidak ada respon dari AI.");
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[allamv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("allamv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("allamv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
