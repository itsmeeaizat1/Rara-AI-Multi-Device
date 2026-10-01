// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// powerbrain — PowerBrain AI chat
import { powerbrain } from "../../src/scraper/nexray-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "powerbrain",
  alias: ["powerbrain", "pbai", "pbrain"],
  category: "ai",
  description: "Chat dengan PowerBrain AI",
  usage: ".powerbrain <pertanyaan>",
  example: ".powerbrain jelaskan teori relativitas",
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
      return m.reply(raraWrap("powerbrain", `Mau nanya apa ke PowerBrain?\n\nContoh: ${m.prefix}powerbrain jelaskan teori relativitas`, "guide"));
    }

    await m.react("🕒");

    let result = await powerbrain(text);
    if (!result.status) result = await UnlimitedAI(text, "rara-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(raraWrap("powerbrain", "PowerBrain lagi offline 🧠", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("powerbrain error:", err);
    await m.react("❌");
    return m.reply(raraWrap("powerbrain", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
