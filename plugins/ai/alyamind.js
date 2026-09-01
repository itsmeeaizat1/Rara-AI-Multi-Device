// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// alyamind — AlyaMind AI (khusus dari Alya bot)
import { alyamind } from "../../src/scraper/nexray-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "alyamind",
  alias: ["alyamind", "alyamindai", "mindai"],
  category: "ai",
  description: "Chat dengan AlyaMind AI — AI khas bot Alya",
  usage: ".alyamind <pertanyaan>",
  example: ".alyamind buatin saya jadwal belajar\n.alyamind bagaimana cara mengatasi stres?",
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
      return m.reply(claraWrap("alyamind", `Mau nanya apa ke AlyaMind?\n\nContoh: ${m.prefix}alyamind buatin jadwal belajar\n${m.prefix}alyamind bagaimana cara mengatasi stres?`, "guide"));
    }

    await m.react("🕒");

    let result = await alyamind(text);
    if (!result.status) result = await UnlimitedAI(text, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("alyamind", "AlyaMind lagi offline 🧠", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 *ᴀʟʏᴀᴍɪɴᴅ* 」\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("alyamind error:", err);
    await m.react("❌");
    return m.reply(claraWrap("alyamind", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
