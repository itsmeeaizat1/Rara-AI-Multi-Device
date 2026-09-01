// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bardaiv2 — Gemini Pro v2 (luminai.my.id)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bardaiv2", alias: ["bardaiv2"], aliases: ["bardaiv2", "geminiprov2"],
  category: "ai", description: "Chat dengan Gemini Pro v2 (luminai.my.id)",
  usage: ".bardaiv2 <pertanyaan>", example: ".bardaiv2 apa itu AI",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("bardaiv2", `Mau nanya apa?\nContoh: ${m.prefix}bardaiv2 apa itu AI`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://luminai.my.id/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, model: "gemini-pro" }),
    });
    const data = await res.json();
    await m.reply(data?.result || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("bardaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("bardaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
