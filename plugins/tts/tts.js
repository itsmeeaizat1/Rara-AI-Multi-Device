// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "tts",
  alias: ["tts", "ttsbot", "say"],
  category: "tts",
  description: "Google Text To Speech",
  usage: ".tts <text>",
  example: ".tts halo semua",
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();

  if (!text) {
    { const __navText = `🎤 *Google TTS*\n\nGunakan:\n${m.prefix}tts halo dunia`; return await m.reply( __navText, "tts"); };
  }


  async function textToSpeech2(text) {
    try {
      const response = await novaApi.nexray.geminiTts(text);
      return response;
    } catch (error) {
      return error;
    }
  }

  try {
    const t = await textToSpeech2(text);
    await sock.sendMessage(
      m.chat,
      {
        audio: { url: t.result },
        mimetype: "audio/mpeg",
      },
      { quoted: m },
    );
    m.react("✅");
  } catch (err) {
    m.reply(claraWrap("tts", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
