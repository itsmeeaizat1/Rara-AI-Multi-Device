// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// venicev2 — Venice AI (dolphin-3.0-mistral-24b)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "venicev2", alias: ["venicev2"], aliases: ["venicev2", "veniceaiv2"],
  category: "ai", description: "Chat dengan Venice AI v2 (dolphin-3.0-mistral-24b)",
  usage: ".venicev2 <pertanyaan>", example: ".venicev2 jelaskan teori relativitas",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(raraWrap("venicev2", `Mau nanya apa?\nContoh: ${m.prefix}venicev2 jelaskan relativitas`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://outerface.venice.ai/api/inference/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://venice.ai", "Referer": "https://venice.ai/" },
      body: JSON.stringify({ requestId: "rara-ai", modelId: "dolphin-3.0-mistral-24b", prompt: [{ content: text, role: "user" }] }),
    });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || data?.content || "Tidak ada jawaban.";
    if (!reply || /Tidak ada jawaban/i.test(reply)) throw new Error("venice balas kosong");
    await m.reply(typeof reply === "string" ? reply : JSON.stringify(reply));
    await m.react("🐣");
  } catch (e) {

    console.error("venicev2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("venicev2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
