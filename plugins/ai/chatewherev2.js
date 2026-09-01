// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chatewherev2 — ChatEverywhere AI v2
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "chatewherev2", alias: ["chatewherev2"], aliases: ["chatewherev2", "cewherev2"],
  category: "ai", description: "ChatEveryWhere AI v2 (chateverywhere.app)",
  usage: ".chatewherev2 <pertanyaan>", example: ".chatewherev2 jelaskan API",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("chatewherev2", `Mau nanya apa?\nContoh: ${m.prefix}chatewherev2 jelaskan API`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://chateverywhere.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://chateverywhere.app", "Referer": "https://chateverywhere.app/id" },
      body: JSON.stringify({
        model: { id: "gpt-3.5-turbo-0613", name: "GPT-3.5", maxLength: 12000, tokenLimit: 4000 },
        prompt: text, messages: [{ pluginId: null, content: text, role: "user" }],
      }),
    });
    const data = await res.json();
    await m.reply(typeof data === "string" ? data : (data?.choices?.[0]?.message?.content || data?.reply || JSON.stringify(data)));
    await m.react("🐣");
  } catch (e) {
    console.error("chatewherev2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("chatewherev2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
