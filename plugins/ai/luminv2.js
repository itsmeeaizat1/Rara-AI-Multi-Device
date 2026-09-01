// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// luminv2 — Lumin AI v2 (luminai.my.id)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "luminv2", alias: ["luminv2"], aliases: ["luminv2", "luminaiv2"],
  category: "ai", description: "Lumin AI v2 (luminai.my.id)",
  usage: ".luminv2 <pertanyaan>", example: ".luminv2 apa itu quantum computing",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("luminv2", `Ada yang bisa dibantu?\nContoh: ${m.prefix}luminv2 apa itu quantum`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://luminai.my.id/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const data = await res.json();
    await m.reply(data?.result || data?.response || "Tidak ada respon.");
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[luminv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("luminv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("luminv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
