// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Travel — AI travel planner

import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "travelai",
  alias: ["travelai", "aitravel", "itinerari", "liburanai"],
  category: "ai",
  description: "AI bikin rencana liburan/itinerari lengkap dengan estimasi biaya",
  usage: ".travelai <tujuan> <hari>",
  example: ".travelai Bali 3 hari\n.travelai Tokyo 5 hari",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("travelai", `Mau liburan ke mana?\n\nContoh:\n${m.prefix}travelai Bali 3 hari\n${m.prefix}travelai Jogja 2 hari\n${m.prefix}travelai Tokyo 5 hari`, "guide"));
    }

    await m.react("🕒");

    const prompt = `Buatkan rencana liburan ke: "${text}". Format:

DESTINASI: [nama tempat]
ESTIMASI BIAYA: [range biaya dalam Rupiah]
WAKTU TERBAIK: [kapan terbaik untuk visit]

HARI 1:
- Pagi: [aktivitas]
- Siang: [aktivitas + makan]
- Sore: [aktivitas]
- Malam: [aktivitas]

HARI 2:
- (sama format)

TIPS:
- [tips 1]
- [tips 2]
- [tips 3]

Gunakan bahasa Indonesia. Sesuaikan jumlah hari dengan yang diminta. Praktis dan realistis.`;

    const result = await UnlimitedAI(prompt, "nova-ai");

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("travelai", "AI-nya lagi packing 🧳", "error"));
    }

    const lines = result.answer.trim().split("\n");
    let formatted = "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("DESTINASI:")) {
        formatted += `│ 🗺️ *${t.replace("DESTINASI:", "").trim()}*\n│\n`;
      } else if (t.startsWith("ESTIMASI BIAYA:")) {
        formatted += `│ 💰 ${t.replace("ESTIMASI BIAYA:", "").trim()}\n`;
      } else if (t.startsWith("WAKTU TERBAIK:")) {
        formatted += `│ 📅 ${t.replace("WAKTU TERBAIK:", "").trim()}\n│\n`;
      } else if (t.startsWith("HARI")) {
        formatted += `│ 📌 *${t}*\n`;
      } else if (t.startsWith("TIPS:")) {
        formatted += `│\n│ 💡 *ᴛɪᴘs:*\n`;
      } else if (t.startsWith("-")) {
        formatted += `│   ${t}\n`;
      } else {
        formatted += `│ ${t}\n`;
      }
    }

    if (!formatted) {
      formatted = `│ ${result.answer.trim()}\n`;
    }

    await m.react("🐣");
    let msg = `╭──「 *ᴛʀᴀᴠᴇʟ ᴀɪ* 」\n`;
    msg += `│ 🗺️ Tujuan: *${text}*\n`;
    msg += `│\n`;
    msg += formatted;
    msg += `│\n`;
    msg += `│ Selamat liburan! 🌴\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("travelai error:", err);
    await m.react("❌");
    return m.reply(claraWrap("travelai", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
