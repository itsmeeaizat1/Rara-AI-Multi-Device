// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

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
    return m.reply(raraGuide("MusicMaker", "Masukin deskripsi lagu nih!", ".musicmaker Lagu pop romantis yang ceria"));
  }
  try {
  await m.react("🕒");
    const apiUrl = `https://api.nexray.eu.cc/ai/suno?prompt=${encodeURIComponent(prompt)}`;
    
    const res = await axios.get(apiUrl, {
      timeout: 180000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(raraWrap("musicmaker", "⚠️ AI gagal membuat lagu. Coba gunakan prompt (deskripsi) yang lain."));
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
    // Kartu info lagu AI (audio gak bisa caption) — teks setelah audio
    try {
      const info = await probeMedia(r.url);
      const card = mediaResultCard({
        header: "musicmaker",
        title: r.title,
        request: [["Model", "AI Music Maker"], ["Tags", String(r.tags || "").slice(0, 60)]],
        size: info.size, mime: info.mime || "audio/mpeg", duration: Number(r.duration) || "",
      });
      if (card) await m.reply(card);
    } catch {}

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: { url: r.thumbnail },
      caption: caption
    }, { quoted: m });
  } catch (error) {
    console.error("[Music Maker AI]", error.message);
    m.reply(raraError("MusicMaker", "Ada error nih, AI mungkin lagi sibuk"));
  }
}

export { pluginConfig as config, handler };
