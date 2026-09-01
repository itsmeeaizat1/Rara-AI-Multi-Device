// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// savenow.js — All-in-one downloader (Sanka AIO + ytdl fallback, no API key)
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "savenow",
  alias: ["savenow", "sn", "snnow"],
  category: "download",
  description: "Download video/audio all-in-one (Sanka AIO + ytdl)",
  usage: ".savenow <url> [format]",
  example: ".savenow https://youtube.com/watch?v=xxx mp3",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();
const VALID_FORMATS = ["mp3", "360", "480", "720", "1080", "mp4", "video", "audio"];

async function downloadMedia(url, format) {
  const isAudio = format === "mp3" || format === "audio";

  // Method 1: Sanka AIO API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/aio?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 30000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      if (isAudio) {
        const dl = r.mp3 || r.audio || r.dl;
        if (dl) return { url: dl, title: r.title, method: "Sanka AIO" };
      } else {
        const dl = r.mp4 || r.video || r.dl || r.url;
        if (dl) return { url: dl, title: r.title, method: "Sanka AIO" };
      }
    }
  } catch (e) { console.error('[savenow.js] Sanka:', e.message); }

  // Method 2: ytdl-core (untuk YouTube)
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    try {
      const type = isAudio ? "mp3" : "mp4";
      const result = await ytdl(url, type);
      if (result?.status && result?.dl) {
        return { url: result.dl, title: result.title, method: "ytdl" };
      }
    } catch (e) { console.error('[savenow.js] ytdl:', e.message); }
  }

  throw new Error("Gagal mendapatkan link download");
}

async function handler(m, { sock }) {
  try {
    const args = m.text?.trim().split(/\s+/);
    const url = args?.[0];
    const format = args?.[1] || "mp4";

    if (!url) {
      return m.reply(novaGuide("SaveNow", "Kirim URL yang mau di-download!", ".savenow https://youtube.com/watch?v=xxx mp3"));
    }

    const isAudio = format === "mp3" || format === "audio";
    const result = await downloadMedia(url, format);

    const caption = mediaCaption({
      platformIcon: "📥",
      platformName: "SaveNow AIO",
      title: result.title || "Download",
      format: isAudio ? "🎵 Audio (MP3)" : "📹 Video",
      method: result.method,
    });

    if (isAudio) {
      const audioRes = await axios.get(result.url, { responseType: "arraybuffer", timeout: 60000 });
      await sock.sendMessage(m.chat, {
        audio: Buffer.from(audioRes.data),
        mimetype: "audio/mpeg", ptt: false,
        fileName: `${result.title || "audio"}.mp3`,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        video: { url: result.url },
        caption,
      }, { quoted: m });
    }
    await m.reply(caption);
    await m.react("🐣");
  } catch (err) {
    console.error("[SaveNow]", err);
    await m.react("❌");
    m.reply(novaError("SaveNow", "Gagal download. Coba URL lain atau gunakan .ytmp3/.ytmp4 untuk YouTube!"));
  }
}

export { pluginConfig as config, handler };
