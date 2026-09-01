// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// videy.js — Download video dari Videy.co (direct CDN, no API)
import axios from "axios";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

const pluginConfig = {
  name: "videy",
  alias: ["videy", "videydl"],
  category: "download",
  description: "Download video dari Videy.co",
  usage: ".videy <url_videy>",
  example: ".videy https://videy.co/v?id=xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function getVideyDownload(url) {
  // Extract video ID dari URL
  let videoId;
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9]+)/) || url.match(/\/v\/([a-zA-Z0-9]+)/) || url.match(/videy\.co\/([a-zA-Z0-9]+)/);
  if (idMatch) {
    videoId = idMatch[1];
  } else {
    // Mungkin user kirim ID langsung
    videoId = url.trim();
  }

  if (!videoId) throw new Error("ID video tidak ditemukan dari URL");

  // Videy CDN pattern: https://cdn.videy.co/{id}.mp4
  const cdnUrl = `https://cdn.videy.co/${videoId}.mp4`;

  // Verify URL valid dengan HEAD request
  try {
    const headRes = await axios.head(cdnUrl, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
    if (headRes.status === 200) return cdnUrl;
  } catch (e) {
    // Coba format .webm
    try {
      const cdnWebm = `https://cdn.videy.co/${videoId}.webm`;
      const headRes2 = await axios.head(cdnWebm, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
      if (headRes2.status === 200) return cdnWebm;
    } catch {}
  }

  throw new Error("Video tidak ditemukan. Mungkin URL invalid atau video sudah dihapus.");
}

async function handler(m, { sock }) {
  try {
    // Try IkyyXD videy first
    const ikyyResult = await ikyyDl("videy", url);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      await sock.sendMedia(m.chat, video.url, ikyyResult.title || "Videy", m, {
        type: "video", contextInfo: { forwardingScore: 0, isForwarded: false }
      });
      return;
    }

    const url = m.text?.trim();
    if (!url) {
      return m.reply(novaGuide("Videy", "Kirim URL video Videy yang mau kamu download!", ".videy https://videy.co/v?id=xxx"));
    }

    await m.react("🕒");

    const videoUrl = await getVideyDownload(url);

    // Download video buffer
    const vidRes = await axios.get(videoUrl, {
      responseType: "arraybuffer", timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(vidRes.data);

    const caption = mediaCaption({
      platformIcon: "🎬",
      platformName: "Videy",
      title: "Videy Video",
      format: "📹 Video",
      method: "Direct CDN",
    });

    await sock.sendMessage(m.chat, {
      video: buffer,
      caption,
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("[Videy]", err);
    await m.react("❌");
    m.reply(novaError("Videy", err.message || "Gagal download video Videy. Pastikan URL valid!"));
  }
}

export { pluginConfig as config, handler };
