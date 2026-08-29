// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// powerbrain — PowerBrain AI chat
import { powerbrain } from "../../src/scraper/nexray-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

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
      return m.reply(claraWrap("powerbrain", `Mau nanya apa ke PowerBrain?\n\nContoh: ${m.prefix}powerbrain jelaskan teori relativitas`, "guide"));
    }

    await m.react("🕒");

    let result = await powerbrain(text);
    if (!result.status) result = await UnlimitedAI(text, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("powerbrain", "PowerBrain lagi offline 🧠", "error"));
    }

    await m.react("🐣");
    let msg = `╭──「 *ᴘᴏᴡᴇʀʙʀᴀɪɴ* 」\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("powerbrain error:", err);
    await m.react("❌");
    return m.reply(claraWrap("powerbrain", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
