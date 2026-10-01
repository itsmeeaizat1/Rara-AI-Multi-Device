// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nayaai — Naya AI via api.cuki.biz.id
import { nayaAI } from "../../src/scraper/cuki-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "nayaai",
  alias: ["nayaai", "naya", "ainaya"],
  category: "ai",
  description: "Chat dengan Naya AI",
  usage: ".nayaai <pertanyaan>",
  example: ".nayaai rekomendasi film horor\n.nayaai cara membuat kopi manual brew",
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
      return m.reply(raraWrap("nayaai", `Mau nanya apa ke Naya AI?\n\nContoh: ${m.prefix}nayaai rekomendasi film horor\n${m.prefix}nayaai cara membuat kopi manual brew`, "guide"));
    }

    await m.react("🕒");

    let result = await nayaAI(text);
    if (!result.status) result = await UnlimitedAI(text, "rara-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("nayaai", "Naya AI lagi offline 🤖", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("nayaai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("nayaai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
