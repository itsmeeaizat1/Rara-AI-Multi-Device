// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// chataiv2 — ChatAI v2 (chatai.org)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "chataiv2", alias: ["chataiv2"], aliases: ["chataiv2", "chataiorgv2"],
  category: "ai", description: "ChatAI v2 (chatai.org)",
  usage: ".chataiv2 <pertanyaan>", example: ".chataiv2 apa itu blockchain",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("chataiv2", `Mau nanya apa?\nContoh: ${m.prefix}chataiv2 apa itu blockchain`, "guide"));
    await m.react("🕒");
    const res = await fetch("https://chatai.org/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json", "Origin": "https://chatai.org", "Referer": "https://chatai.org/" },
      body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
    });
    const data = await res.json();
    await m.reply(data?.content || "Tidak ada jawaban.");
    await m.react("🐣");
  } catch (e) {
    console.error("chataiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("chataiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
