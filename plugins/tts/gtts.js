// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "gtts",
  alias: ["gtts", "googletts", "gtts2"],
  category: "tts",
  description: "Google Text-to-Speech (multi bahasa)",
  usage: ".gtts <bahasa> | <teks>",
  example: ".gtts id | Halo semuanya\n.gtts en | Hello world",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const input = m.args.join(" ").trim();
    let lang = "id";
    let text = "";

    if (input.includes("|")) {
      const [langPart, ...textParts] = input.split("|");
      lang = langPart.trim() || "id";
      text = textParts.join("|").trim();
    } else {
      text = input;
    }

    if (!text) {
      return m.reply(raraWrap("gtts", `Format: ${m.prefix}gtts <bahasa> | <teks>\n\nContoh:\n${m.prefix}gtts id | Halo semuanya\n${m.prefix}gtts en | Hello world\n${m.prefix}gtts ja | こんにちは`, "guide"));
    }

    if (text.length > 500) {
      return m.reply(raraWrap("gtts", "Teks terlalu panjang! Maksimal 500 karakter.", "error"));
    }

    await m.react("🕒");

    // Google Translate TTS (free, no key)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const { data } = await axios.get(ttsUrl, {
      responseType: "arraybuffer", timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const buffer = Buffer.from(data);

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mp4",
      ptt: true,
      contextInfo: {
        externalAdReply: {
          title: "Google TTS",
          body: `Language: ${lang}`,
          sourceUrl: "https://translate.google.com",
        },
      },
    });
  } catch (err) {
    console.error("gtts error:", err);
    await m.react("❌");
    return m.reply(raraWrap("gtts", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
