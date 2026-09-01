// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Compliment — AI generates creative compliments

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "pujianai",
  alias: ["pujianai", "aicompliment", "complimentai", "puji"],
  category: "ai",
  description: "AI bikin pujian kreatif untuk kamu atau orang lain",
  usage: ".pujianai [nama]",
  example: ".pujianai\n.pujianai Sari",
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
    const target = text || m.pushName || "kamu";

    await m.react("🕒");

    const prompt = `Buatkan 3 pujian kreatif dan tulus untuk seseorang bernama "${target}". Pujian harus unik, tidak generik, dengan sentuhan humor yang ringan. Format:

1. [pujian pertama]
2. [pujian kedua]
3. [pujian ketiga]

Gunakan bahasa Indonesia santai. Pujian harus bikin senyum, bukan cringe.`;

    const result = await UnlimitedAI(prompt, "waguri-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("pujianai", "AI-nya lagi malu nih 😳", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴘᴜᴊɪᴀɴ ᴀɪ ✦ 」\n`;
    msg += `│ 💕 Untuk: *${target}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `│\n`;
    msg += `│ Semoga harimu jadi lebih baik! ✨\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("pujianai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("pujianai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
