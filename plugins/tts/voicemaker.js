// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { novaGuide } from "../../src/lib/nova-menu-style.js";

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

const VOICES = [
  { id: "id-ID-ArdiNeural", name: "Ardi (Pria)", lang: "id" },
  { id: "id-ID-GadisNeural", name: "Gadis (Wanita)", lang: "id" },
  { id: "en-US-GuyNeural", name: "Guy (US Pria)", lang: "en" },
  { id: "en-US-JennyNeural", name: "Jenny (US Wanita)", lang: "en" },
  { id: "ja-JP-KeitaNeural", name: "Keita (JP Pria)", lang: "ja" },
  { id: "ja-JP-NanamiNeural", name: "Nanami (JP Wanita)", lang: "ja" },
];

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaGuide("VoiceMaker", "Mau bikin voice dari teks? Pilih voice-nya ya!", `${m.prefix}voicemaker id-ID-ArdiNeural Halo dunia`));
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
  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/tts?text=${encodeURIComponent(ttsText)}&voice=${encodeURIComponent(voice)}`,
      { responseType: "arraybuffer", timeout: 30000 }
    );

    const buf = Buffer.from(res.data);
    if (buf.length < 100) {
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
