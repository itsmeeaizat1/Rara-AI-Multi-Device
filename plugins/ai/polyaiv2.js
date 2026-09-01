// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// polyaiv2 — Poly AI v2 (polybuzz.ai)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "polyaiv2", alias: ["polyaiv2"], aliases: ["polyaiv2", "polybuzzv2"],
  category: "ai", description: "Poly AI v2 — PolyBuzz AI chat",
  usage: ".polyaiv2 <pertanyaan>", example: ".polyaiv2 ceritakan dongeng",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("polyaiv2", `Tanya apa?\nContoh: ${m.prefix}polyaiv2 ceritakan dongeng`, "guide"));
    await m.react("🕒");
    const form = new URLSearchParams();
    form.append("currentChatStyleId", "1");
    form.append("mediaType", "2");
    form.append("needLive2D", "2");
    form.append("secretSceneId", "wHp7z");
    form.append("selectId", "209837277");
    form.append("speechText", text);
    const res = await fetch("https://api.polybuzz.ai/api/conversation/msgbystream", {
      method: "POST",
      headers: { "User-Agent": "Mozilla/5.0", "Cookie": "session=9997156d23496b9ff96fc09d162191f74821790eaa4ecc52096273a60f517ad3" },
      body: form,
    });
    const raw = await res.text();
    const result = raw.split("\n").filter(l => l.trim()).map(l => {
      try { return JSON.parse(l.trim()).content || ""; } catch { return ""; }
    }).join("");
    await m.reply(result || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[polyaiv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("polyaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("polyaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
