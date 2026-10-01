// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import ttdown from "../../src/scraper/tiktok.js";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { novaWrap, novaLine, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const pluginConfig = {
  name: ["ttmp3"],
  alias: ["ttmp3"],
  category: "download",
  description: "Download audio TikTok",
  usage: ".ttmp3 <url>",
  example: ".ttmp3 https://vt.tiktok.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

function getTempDir() {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

async function extractAudioFromVideo(videoUrl) {
  const tmpDir = getTempDir();
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const inputFile = path.join(tmpDir, `ttmp3_${stamp}.mp4`);
  const outputFile = path.join(tmpDir, `ttmp3_${stamp}.mp3`);

  const res = await axios.get(videoUrl, {
    responseType: "arraybuffer",
    timeout: 60000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.tiktok.com/",
    },
  });

  fs.writeFileSync(inputFile, Buffer.from(res.data));

  await new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .noVideo()
      .audioCodec("libmp3lame")
      .format("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(outputFile);
  });

  if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size <= 0) {
    throw new Error("Gagal mengekstrak audio TikTok");
  }

  return {
    buffer: fs.readFileSync(outputFile),
    files: [inputFile, outputFile],
  };
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  let cleanupFiles = [];

  const cleanupTempFiles = () => {
    for (const file of cleanupFiles) {
      if (!file) continue;
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) { console.error('[ttmp3.js]:', e.message); }
    }
    cleanupFiles = [];
  };

  if (!url) {
    return m.reply(novaNoInput("TikTok Audio", "Kirim link TikTok yang ingin kamu ambil lagunya!", `${m.prefix}ttmp3 https://vt.tiktok.com/xxx`));
  }

  if (!url.match(/tiktok\.com|vt\.tiktok/i)) {
    return m.reply(novaGuide("TikTok Audio", "Link yang kamu masukkan bukan link TikTok valid!", `${m.prefix}ttmp3 https://vt.tiktok.com/xxx`));
  }
  try {
    await m.react("🕒");
    const result = await ttdown(url);
    const audioDownload = result.downloads.find((d) => d.type === "mp3");
    let audioSource = audioDownload?.url || null;

    if (!audioSource) {
      const videoDownload =
        result.downloads.find((d) => d.type === "nowatermark_hd") ||
        result.downloads.find((d) => d.type === "nowatermark");

      if (!videoDownload?.url) {
        throw new Error("Audio TikTok tidak ditemukan.");
      }

      const extractedAudio = await extractAudioFromVideo(videoDownload.url);
      cleanupFiles = extractedAudio.files;
      audioSource = extractedAudio.buffer;
    }

    // WhatsApp doesn't support caption on audio — send info as text first
    const infoText = mediaCaption({
      platformIcon: "🎵", platformName: "TikTok Audio",
      title: result.title || result.author || "TikTok Audio",
      author: result.author || null,
      duration: result.duration || null,
      format: "🎵 MP3 (Audio Extracted)",
      method: "tikwm",
    });
    await m.reply(infoText);
    await m.react("🐣");

    await sock.sendMessage(m.chat, {
      audio: Buffer.isBuffer(audioSource) ? audioSource : { url: audioSource },
      mimetype: "audio/mpeg",
      fileName: `TikTok_Audio_${Date.now()}.mp3`,
      contextInfo: mediaPreviewCard({
        title: result.title || "TikTok Audio",
        body: "TikTok • MP3 Audio",
        sourceUrl: url,
        thumbnailUrl: result.cover || result.author?.avatar || "",
      }),
    }, { quoted: m });
    // cleanup
    cleanupTempFiles();
    await m.reply(novaBerhasil("Ttmp3"));
  } catch (err) {
    cleanupTempFiles();
    console.error("[TikTokDL] Error:", err);
    m.reply(novaError("TikTok Audio", err.message || "Gagal mengunduh audio TikTok"));
  }
}

export { pluginConfig as config, handler };
