// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// yuprav2 — Yupra AI v2 (yupradev.biz.id)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "yuprav2", alias: ["yuprav2"], aliases: ["yuprav2", "yupraaiv2"],
  category: "ai", description: "Yupra AI v2 (yupradev.biz.id)",
  usage: ".yuprav2 <pertanyaan>", example: ".yuprav2 apa itu AI",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("yuprav2", `Mau nanya apa?\nContoh: ${m.prefix}yuprav2 apa itu AI`, "guide"));
    await m.react("🕒");
    const ts = Date.now();
    const res = await fetch(`https://api.yupradev.biz.id/ai/ypai?text=${encodeURIComponent(text)}&t=${ts}&session=${m.chat}`, {
      headers: { "Accept": "*/*", "Origin": "https://ai.yupradev.biz.id", "Referer": "https://ai.yupradev.biz.id/" },
    });
    const data = await res.json();
    await m.reply(data?.response || data?.result || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("yuprav2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("yuprav2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
