// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// llamav2 — Llama AI v2 (restapii.rioooxdzz)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "llamav2", alias: ["llamav2"], aliases: ["llamav2", "llamaaiv2"],
  category: "ai", description: "Llama AI v2 (restapii.rioooxdzz)",
  usage: ".llamav2 <pertanyaan>", example: ".llamav2 apa itu machine learning",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("llamav2", `Mau nanya apa?\nContoh: ${m.prefix}llamav2 apa itu ML`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://restapii.rioooxdzz.web.id/api/llama?message=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    await m.reply(data?.result || data?.response || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[llamav2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("llamav2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("llamav2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
