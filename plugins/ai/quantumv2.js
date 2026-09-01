// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quantumv2 — Quantum AI v2 (zelapioffciall)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "quantumv2", alias: ["quantumv2"], aliases: ["quantumv2", "quantumaiv2"],
  category: "ai", description: "Quantum AI v2 — chat AI canggih",
  usage: ".quantumv2 <pertanyaan>", example: ".quantumv2 what is AI",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("quantumv2", `Mau nanya apa?\nContoh: ${m.prefix}quantumv2 what is AI`, "guide"));
    await m.react("🕒");
    const res = await fetch(`https://zelapioffciall.vercel.app/ai/quantum?text=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (!data?.result) return m.reply(claraWrap("quantumv2", "Gagal mendapatkan respon.", "error"));
    await m.reply(data.result);
    await m.react("🐣");
  } catch (e) {
    console.error("quantumv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("quantumv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
