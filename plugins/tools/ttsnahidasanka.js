// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ttsnahidasanka",
  alias: ["ttsnahidasanka"],
  category: "tools",
  description: "TTS suara Nahida (Genshin Impact) via API",
  usage: ".ttsnahidasanka <text>",
  example: ".ttsnahidasanka hello everyone",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

async function handler(m, { sock, args }) {
  const text = args.join(" ").trim();

  if (!text) {
    let txt = `TTS Nahida\n\n`;
    txt += `Suara Nahida (Genshin Impact)\n\n`;
    txt += `\`${m.prefix}ttsnahida <text>\`\n\n`;
    txt += `Contoh:\n`;
    txt += `1. \`${m.prefix}ttsnahida hello everyone\`\n`;
    txt += `2. \`${m.prefix}ttsnahida こんにちは\`\n`;
    txt += `3. \`${m.prefix}ttsnahida welcome to my world\``;
    return await m.reply( txt, { commandName: "ttsnahidasanka" });
  }
  try {
    const url = `${API_BASE}/anime/ttsnahida?apikey=${API_KEY}&text=${encodeURIComponent(text)}`;

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    // Check if response is JSON (error) or audio (success)
    const contentType = res.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
      const errData = JSON.parse(Buffer.from(res.data).toString());
      throw new Error(errData.message || errData.error || "API error");
    }

    if (res.status !== 200 || res.data.length < 100) {
      throw new Error("Response tidak valid");
    }

    const audioBuffer = Buffer.from(res.data);

    let caption = `TTS Nahida\n`;
    caption += `Text: ${text}`;

    await sock.sendMessage(
      m.chat,
      {
        audio: await toVoiceNote(audioBuffer),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      },
      { quoted: m },
    );
  } catch (e) {
    console.error("[TTSNAHIDASANKA] Error:", e.message);
    let txt = `Gagal generate voice Nahida!\n\n`;
    txt += `Error: ${e.message}\n\n`;
    txt += `API mungkin sedang down atau rate limited.`;
    await m.reply(claraWrap("ttsnahidasanka", txt));
  }
}

export { pluginConfig as config, handler };
