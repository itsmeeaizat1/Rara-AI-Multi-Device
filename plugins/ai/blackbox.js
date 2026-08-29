// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// blackbox — Blackbox AI chat (free, no API key)
import { blackboxAI } from "../../src/scraper/blackbox-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "blackbox",
  alias: ["blackbox", "bbai", "blackboxai"],
  category: "ai",
  description: "Chat dengan Blackbox AI (gratis, no API key)",
  usage: ".blackbox <pertanyaan>",
  example: ".blackbox tulis kode Python untuk fibonacci\n.blackbox jelaskan cara kerja blockchain",
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
      return m.reply(claraWrap("blackbox", `Mau nanya apa ke Blackbox?\n\nContoh: ${m.prefix}blackbox tulis kode Python fibonacci\n${m.prefix}blackbox jelaskan blockchain`, "guide"));
    }

    await m.react("🕒");

    let result = await blackboxAI(text);
    if (!result.status) result = await UnlimitedAI(text, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("blackbox", "Blackbox lagi offline 📦", "error"));
    }

    await m.react("🐣");
    let msg = `╭──「 *ʙʟᴀᴄᴋʙᴏx ᴀɪ* 」\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("blackbox error:", err);
    await m.react("❌");
    return m.reply(claraWrap("blackbox", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
