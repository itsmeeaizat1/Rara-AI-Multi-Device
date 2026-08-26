// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "musicmaker",
  alias: ["musicmaker"],
  category: "ai",
  description: "Membuat musik atau lagu menggunakan AI dari teks (prompt)",
  usage: ".musicmaker <prompt>",
  example: ".musicmaker Lagu sedih tentang perpisahan dengan musik piano",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.text?.trim() || m.args.join(" ");

  if (!prompt) {
    { const __navText = "❌ Masukkan deskripsi lagu yang ingin dibuat.\n\nContoh: `.musicmaker Lagu pop romantis yang ceria`"; return await m.reply(__navText, "musicmaker"); };
  }

  await m.react("🕒");

  try {
    const apiUrl = `https://api.nexray.eu.cc/ai/suno?prompt=${encodeURIComponent(prompt)}`;
    
    const res = await axios.get(apiUrl, {
      timeout: 180000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(claraWrap("musicmaker", "⚠️ AI gagal membuat lagu. Coba gunakan prompt (deskripsi) yang lain."));
    }

    const r = data.result;

    const caption = `🎵 *MUSIC MAKER AI* 🎵\n\n` +
      `*Judul:* ${r.title}\n` +
      `*Tags:* ${r.tags}\n` +
      `*Durasi:* ${r.duration} detik\n\n` +
      `*Lirik:*\n${r.lyrics}`;

    await sock.sendMessage(m.chat, {
      audio: { url: r.url },
      mimetype: "audio/mpeg",
      ptt: false,
    }, { quoted: m });

    await sock.sendMessage(m.chat, {
      image: { url: r.thumbnail },
      caption: caption
    }, { quoted: m });

    await m.react("🐣");

  } catch (error) {
    console.error("[Music Maker AI]", error.message);
    m.reply(claraWrap("musicmaker", "😔 Terjadi kesalahan saat memproses permintaan pembuatan lagu ke AI. Server AI mungkin sibuk."));
  }
}

export { pluginConfig as config, handler };
