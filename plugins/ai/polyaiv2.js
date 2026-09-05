// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// polyaiv2 — Poly AI v2 (polybuzz.ai)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { aiFallbackChat } from "../../src/lib/nova-ai-fallback.js";

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
    if (!result) throw new Error("polya balas kosong");
    await m.reply(result);
    await m.react("🐣");
  } catch (e) {
    // 🔹 FALLBACK: API mati/balas kosong → rantai multi-API (bawa sesi obrolan)
    try {
      const fbReply = await aiFallbackChat(text?.trim() || m.text, {
        persona: "Poly AI",
        sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName,
      });
      if (fbReply) return m.reply(fbReply);
    } catch (fbErr) {
      console.error("[polyaiv2.js] fallback chain failed:", fbErr.message);
    }

    console.error("polyaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("polyaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
