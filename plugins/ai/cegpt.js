// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cegpt — Chat dengan GPT-4o-mini via ChatEverywhere (free, no API key, puppeteer-based)
import { ChatEverywhere } from "../../src/scraper/chateverywhere.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "cegpt",
  alias: ["cegpt", "chateverywhere", "cegpt4"],
  category: "ai",
  description: "Chat dengan GPT-4o-mini via ChatEverywhere (gratis, no API key)",
  usage: ".cegpt <pertanyaan>",
  example: ".cegpt Jelaskan cara kerja quantum computing\n.cegpt Buatkan puisi tentang laut",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("cegpt", `Mau nanya apa ke GPT-4o mini?\n\nContoh: ${m.prefix}cegpt Jelaskan cara kerja blockchain\n${m.prefix}cegpt Buatkan resep nasi goreng`, "guide"));
    }

    await m.react("🕒");

    // Inform user that this might take longer
    const waitMsg = await sock.sendMessage(m.chat, {
      text: "⏳ _Puppeteer sedang membuka browser, mungkin butuh 10-15 detik..._",
    }, { quoted: m });

    const result = await ChatEverywhere(text, {
      systemPrompt: "Kamu adalah asisten AI yang ramah dan informatif. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia. Jawab dengan singkat, jelas, dan natural.",
    });

    // Delete the wait message
    try {
      await sock.sendMessage(m.chat, { delete: waitMsg.key });
    } catch {}

    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("cegpt", result.error || "ChatEverywhere lagi bermasalah, coba lagi nanti atau pakai .nova-ai sebagai alternatif", "error"));
    }

    await m.react("🐣");
    let msg = `╭─「 ✦ ɢᴘᴛ-4ᴏ ᴍɪɴɪ ✦ 」\n`;
    msg += `│ 🌐 via ChatEverywhere\n`;
    msg += `│\n`;
    msg += `│ ${result.answer.trim().replace(/\n/g, "\n│ ")}\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("cegpt error:", err);
    await m.react("❌");
    return m.reply(claraWrap("cegpt", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
