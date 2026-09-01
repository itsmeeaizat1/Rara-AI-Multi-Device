// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// zerogptv2 — ZeroGPT AI v2 (zerogptai.org)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "zerogptv2", alias: ["zerogptv2"], aliases: ["zerogptv2", "zgptv2"],
  category: "ai", description: "ZeroGPT AI v2 — chat AI gratis",
  usage: ".zerogptv2 <pertanyaan>", example: ".zerogptv2 jelaskan quantum mechanics",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("zerogptv2", `Mau nanya apa?\nContoh: ${m.prefix}zerogptv2 jelaskan quantum mechanics`, "guide"));
    await m.react("🕒");
    const id = () => Math.random().toString(36).slice(2, 18);
    const res = await fetch("https://zerogptai.org/wp-json/mwai-ui/v1/chats/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: "default", customId: null, session: "N/A", chatId: id(), contextId: 39, messages: [], newMessage: text, newFileId: null, stream: false }),
    });
    const data = await res.json();
    await m.reply(data?.reply || data?.result || data?.data || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("zerogptv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("zerogptv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
