// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "voicemaker",
  alias: ["vmaker", "vmake"],
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
    let help = "🎙️ *ᴠᴏɪᴄᴇᴍᴀᴋᴇʀ ᴛᴛꜱ*\n\n";
    help += "Gunakan:\n";
    help += `\`${m.prefix}voicemaker <teks>\` - Default (Ardi)\n`;
    help += `\`${m.prefix}voicemaker <voice>|<teks>\` - Pilih voice\n\n`;
    help += "*ᴠᴏɪᴄᴇ ᴛᴇʀꜱᴇᴅɪᴀ:*\n";
    for (const v of VOICES) {
      help += `${v.id} - ${v.name}\n`;
    }
    return m.reply( help, "voicemaker");
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
    return m.reply( "❌ Teks kosong atau terlalu panjang (max 500 karakter).", "voicemaker");
  }

  await m.react("🕒");

  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/tts?text=${encodeURIComponent(ttsText)}&voice=${encodeURIComponent(voice)}`,
      { responseType: "arraybuffer", timeout: 30000 }
    );

    const buf = Buffer.from(res.data);
    if (buf.length < 100) {
      return m.reply( "❌ Gagal generate voice. Coba lagi.", "voicemaker");
    }

    await sock.sendMessage(
      m.chat,
      { audio: buf, mimetype: "audio/mpeg", ptt: true },
      { quoted: m }
    );
    await m.react("🐣");
  } catch (err) {
    console.error("[VoiceMaker] Error:", err.message);
    await m.react("❌");
    return m.reply( te(m.prefix, m.command, m.pushName), "voicemaker");
  }
}

export { pluginConfig as config, handler };
