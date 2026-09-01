// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aoyo — Aoyo AI chat
import { aoyo } from "../../src/scraper/nexray-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aoyo",
  alias: ["aoyo", "aoyoai"],
  category: "ai",
  description: "Chat dengan Aoyo AI",
  usage: ".aoyo <pertanyaan>",
  example: ".aoyo apa itu quantum computing?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("aoyo", `Mau nanya apa ke Aoyo AI?\n\nContoh: ${m.prefix}aoyo apa itu quantum computing?`, "guide"));
    }

    await m.react("🕒");

    // Coba Nexray API dulu
    let result = await aoyo(text);

    // Fallback ke UnlimitedAI
    if (!result.status) {
      result = await UnlimitedAI(text, "nova-ai");
    }

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("aoyo", "Aoyo AI lagi offline 🤖", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("aoyo error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aoyo", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
