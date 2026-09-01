// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aimathv2 — AI Math solver v2 (nexray API + fallback)
import { aimath as nexrayAimath } from "../../src/scraper/nexray-api.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aimathv2",
  alias: ["aimathv2", "aimath2", "aicalcv2"],
  category: "ai",
  description: "AI Math Solver v2 — multi API fallback",
  usage: ".aimathv2 <soal matematika>",
  example: ".aimathv2 integral dari x^2 dx\n.aimathv2 tentukan nilai x: 2x + 5 = 15",
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
      return m.reply(claraWrap("aimathv2", `Mau selesaikan soal apa?\n\nContoh: ${m.prefix}aimathv2 integral dari x^2 dx\n${m.prefix}aimathv2 2x + 5 = 15, cari x`, "guide"));
    }

    await m.react("🕒");

    const mathPrompt = `Selesaikan soal matematika berikut dengan langkah-langkah yang jelas:\n\n${text}\n\nFormat:\nJAWABAN: [hasil akhir]\nLANGKAH:\n1. ...\n2. ...\n3. ...\n\nGunakan bahasa Indonesia.`;

    let result = await nexrayAimath(mathPrompt);
    if (!result.status) result = await UnlimitedAI(mathPrompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("aimathv2", "AI Math lagi offline 🧮", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴀɪ ᴍᴀᴛʜ ᴠ2 ✦ 」\n`;
    msg += `│ 🧮 Soal: *${text}*\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("aimathv2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aimathv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
