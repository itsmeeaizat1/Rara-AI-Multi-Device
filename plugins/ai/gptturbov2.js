// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gptturbov2 — GPT Turbo v2 (restapii.rioooxdzz)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "gptturbov2", alias: ["gptturbov2"], aliases: ["gptturbov2", "gpttv2"],
  category: "ai", description: "GPT Turbo v2 (restapii.rioooxdzz)",
  usage: ".gptturbov2 <pertanyaan>", example: ".gptturbov2 jelaskan blockchain",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("gptturbov2", `Mau nanya apa?\nContoh: ${m.prefix}gptturbov2 jelaskan blockchain`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://restapii.rioooxdzz.web.id/api/gptturbo?message=${encodeURIComponent(text)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    await m.reply(data?.result || data?.response || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("gptturbov2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("gptturbov2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
