// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraGuide } from "../../src/lib/rara-menu-style.js";
import { haidarTTS } from "../../src/scraper/haidar-ai.js";

const pluginConfig = {
  name: "voicemaker",
  alias: ["voicemaker"],
  category: "tts",
  description: "Text to Speech dengan berbagai suara (voicemaker)",
  usage: ".voicemaker <text>",
  example: ".voicemaker halo selamat datang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// Engine: Haidar AI voice natural (fallback Google TTS) — route siputzx s/tts mati 404
const VOICES = [
  { id: "id-ID-ArdiNeural", name: "Ardi (Pria)", lang: "id", haidar: "Ardi" },
  { id: "id-ID-GadisNeural", name: "Gadis (Wanita)", lang: "id", haidar: "Gadis" },
  { id: "en-US-GuyNeural", name: "Guy (US Pria)", lang: "en", haidar: "Ethan" },
  { id: "en-US-JennyNeural", name: "Jenny (US Wanita)", lang: "en", haidar: "Bella" },
  { id: "ja-JP-KeitaNeural", name: "Keita (JP Pria)", lang: "ja", haidar: "Keita" },
  { id: "ja-JP-NanamiNeural", name: "Nanami (JP Wanita)", lang: "ja", haidar: "Nanami" },
];

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(raraGuide("VoiceMaker", "Mau bikin voice dari teks? Pilih voice-nya ya!", `${m.prefix}voicemaker id-ID-ArdiNeural Halo dunia`));
  }

  let voice = "id-ID-ArdiNeural";
  let ttsText = text;

  if (text.includes("|")) {
    const parts = text.split("|");
    const voiceId = parts[0].trim();
    const knownVoice = VOICES.find((v) => v.id === voiceId);
    if (knownVoice) {
      voice = knownVoice.id;
      ttsText = parts.slice(1).join("|").trim();
    }
  }

  if (!ttsText || ttsText.length > 500) {
    return m.reply("❌ Teks kosong atau kepanjangan, max 500 karakter ya!");
  }
  const knownVoice = VOICES.find((v) => v.id === voice) || VOICES[0];
  try {
    // 1. Haidar AI voice natural (pola .suaraai / .telpon)
    let buf = null;
    try {
      const audioUrl = await haidarTTS(ttsText, knownVoice.haidar);
      const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.error("[VoiceMaker] Haidar down, fallback Google TTS:", e.message);
    }

    // 2. Fallback: Google Translate TTS (free, no key) sesuai bahasa voice
    if (!buf || buf.length < 3000) {
      const res = await axios.get(
        `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(knownVoice.lang)}&client=tw-ob&q=${encodeURIComponent(ttsText)}`,
        { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }
      );
      buf = Buffer.from(res.data);
    }

    if (!buf || buf.length < 100) {
      return m.reply("❌ Gagal generate voice-nya nih");
    }

    await sock.sendMessage(
      m.chat,
      { audio: buf, mimetype: "audio/mpeg", ptt: true },
      { quoted: m }
    );
  } catch (err) {
    console.error("[VoiceMaker] Error:", err.message);
    return m.reply("❌ " + (err.message || "Gagal generate voice"));
  }
}

export { pluginConfig as config, handler };
