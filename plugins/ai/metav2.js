// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// metav2 — Meta AI v2 (Llama 3.1 8B via hydrooo)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "metav2", alias: ["metav2"], aliases: ["metav2", "metaaiv2", "llamav2"],
  category: "ai", description: "Meta AI v2 — Llama 3.1 8B (hydrooo.web.id)",
  usage: ".metav2 <pertanyaan>", example: ".metav2 jelaskan cara kerja HTTP",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("metav2", `Mau nanya apa?\nContoh: ${m.prefix}metav2 jelaskan HTTP`, "guide"));
    await m.react("🕒");
    const form = new FormData();
    form.append("content", `User: ${text}`);
    form.append("model", "@groq/llama-3.1-8b-instant");
    const res = await fetch("https://mind.hydrooo.web.id/v1/chat", { method: "POST", body: form });
    const data = await res.json();
    await m.reply(data?.result || data?.full_result || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("metav2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("metav2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
