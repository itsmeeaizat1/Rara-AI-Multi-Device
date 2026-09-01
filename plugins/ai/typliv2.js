// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// typliv2 — Typli AI v2 (typli.ai)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "typliv2", alias: ["typliv2"], aliases: ["typliv2", "typliaiv2"],
  category: "ai", description: "Typli AI v2 — text completion AI",
  usage: ".typliv2 <pertanyaan>", example: ".typliv2 ceritakan tentang sejarah dunia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("typliv2", `Tanya apa?\nContoh: ${m.prefix}typliv2 ceritakan sejarah dunia`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://typli.ai/api/generators/completion", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ prompt: text, temperature: 1.2 }),
    });
    const data = await res.json();
    await m.reply(typeof data === "string" ? data : (data?.result || data?.response || JSON.stringify(data)));
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[typliv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("typliv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("typliv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
