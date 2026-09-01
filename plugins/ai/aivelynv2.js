// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aivelynv2 — Aivelyn AI v2 (velyn.biz.id)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aivelynv2", alias: ["aivelynv2"], aliases: ["aivelynv2", "velynaiv2"],
  category: "ai", description: "Aivelyn AI v2 (velyn.biz.id)",
  usage: ".aivelynv2 <pertanyaan>", example: ".aivelynv2 apa itu deep learning",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("aivelynv2", `Mau nanya apa?\nContoh: ${m.prefix}aivelynv2 apa itu deep learning`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://www.velyn.biz.id/api/ai/velyn-1.0-1b?prompt=${encodeURIComponent(text)}`);
    const data = await res.json();
    await m.reply(data?.result || data?.data || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("aivelynv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("aivelynv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
