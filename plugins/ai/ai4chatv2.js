// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai4chatv2 — AI4Chat versi 2 (nexray API + fallback unlimitedai)
import { ai4chat as nexrayAi4Chat } from "../../src/scraper/nexray-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "ai4chatv2",
  alias: ["ai4chatv2", "ai4chat2"],
  category: "ai",
  description: "AI4Chat v2 — multi API fallback (nexray + unlimited)",
  usage: ".ai4chatv2 <pertanyaan>",
  example: ".ai4chatv2 apa itu machine learning?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(raraWrap("ai4chatv2", `Mau nanya apa?\n\nContoh: ${m.prefix}ai4chatv2 apa itu machine learning?`, "guide"));
    }

    await m.react("🕒");

    let result = await nexrayAi4Chat(text);
    if (!result.status) result = await UnlimitedAI(text, "rara-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("ai4chatv2", "AI offline 😅", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("ai4chatv2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("ai4chatv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
