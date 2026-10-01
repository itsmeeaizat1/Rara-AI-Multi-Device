// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// onedl.js — Onepunya API: DOWNLOADER (6 platform, auto-detect dari URL).
// .onedl <url> [mp3|144p|360p|480p|720p|1080p]
//   YouTube/YT Music  → format MP4 (kualitas) atau MP3
//   Facebook          → MP4 atau MP3
//   Instagram         → video/reel/foto (detail generik key:value)
//   TikTok            → video no-watermark
//   SnackVideo        → video
//   Douyin            → video
// Sumber: onepunya.qzz.io (key .setkey onepunya) — engine Onepunya, beda dari
// .aio/.alldl yang udah ada; jadi alternatif kalau downloader lain down.
import axios from "axios";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { youtubeDownload, tiktokDownload, douyinDownload, instaDownload, facebookDownload, snackvideoDownload } from "../../src/lib/rara-onepunya.js";

const pluginConfig = {
  name: "onedl",
  alias: ["onedl", "onepunyadl"],
  category: "download",
  description: "Downloader 6 platform via Onepunya API (yt/fb/ig/tiktok/snack/douyin)",
  usage: ".onedl <url> [mp3|144p|360p|480p|720p|1080p]",
  example: ".onedl https://youtube.com/watch?v=xxx 720p",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 3,
  isEnabled: true,
};

const QUALITIES = ["144p", "360p", "480p", "720p", "1080p"];

function detectPlatform(u) {
  // NOTE: jangan pakai (?:^|\.) — URL https://youtube.com punya "//" sebelum
  // domain, jadi prefix-anchor itu gak pernah match (bug ketemu e2e).
  if (/youtu\.be|youtube\.com/.test(u)) return "youtube";
  if (/facebook\.com|fb\.watch|fb\.me/.test(u)) return "facebook";
  if (/instagram\.com/.test(u)) return "instagram";
  if (/tiktok\.com/.test(u)) return "tiktok";
  if (/snackvideo|sck\.io/.test(u)) return "snackvideo";
  if (/douyin\.com/.test(u)) return "douyin";
  return null;
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const url = (args[0] || "").trim();
  if (!url || !/^https?:\/\//.test(url)) {
    return m.reply(raraWrap("Onepunya Downloader", `Kirim link yang valid!\n\nContoh: .onedl https://youtube.com/watch?v=xxx 720p\nOpsional: mp3 | ${QUALITIES.join(" | ")}`));
  }
  const platform = detectPlatform(url);
  if (!platform) {
    return m.reply(raraWrap("Onepunya Downloader", "Platform link gak dikenal. Didukung: YouTube, Facebook, Instagram, TikTok, SnackVideo, Douyin."));
  }
  const opt = (args[1] || "").toLowerCase();
  const wantMp3 = opt === "mp3" || opt === "audio";
  const quality = QUALITIES.includes(opt) ? opt : "720p";
  const apiKey = getApiKey("onepunya");

  try {
    let media = null; // { url, filename, mimetype, caption }
    let detail = "";

    if (platform === "youtube" || platform === "facebook") {
      const res = platform === "youtube"
        ? await youtubeDownload(apiKey, url, wantMp3 ? "MP3" : "MP4", quality)
        : await facebookDownload(apiKey, url, wantMp3 ? "MP3" : "MP4");
      const isAudio = (res?.format || "").toLowerCase() === "mp3" || wantMp3;
      const fileUrl = res?.url || res?.media || "";
      if (!fileUrl) throw new Error("Server gak balikin link file.");
      media = {
        url: fileUrl,
        filename: String(res?.filename || (res?.title || "media")).replace(/[\\/:*?"<>|]/g, "_").slice(0, 100) + (isAudio ? ".mp3" : ".mp4"),
        mimetype: isAudio ? "audio/mpeg" : "video/mp4",
        isAudio,
      };
      detail = `🎬 ${res?.title || url}\n💾 ${res?.quality || quality} · ${res?.format || (isAudio ? "mp3" : "mp4")}`;
    } else if (platform === "tiktok" || platform === "snackvideo" || platform === "douyin") {
      const res = platform === "tiktok" ? await tiktokDownload(apiKey, url)
        : platform === "snackvideo" ? await snackvideoDownload(apiKey, url)
        : await douyinDownload(apiKey, url);
      // bentuk respon variasi antar platform — cari URL media di kedalaman objek
      const found = findMediaUrl(res);
      if (!found) throw new Error("Gak nemu URL media di respon server.");
      media = { url: found.url, filename: `onepunya-${platform}-${Date.now()}.${found.ext}`, mimetype: found.mimetype, isAudio: false };
      detail = `🎵 ${res?.title || platform} (${platform})`;
    } else {
      // instagram — respon generik
      const res = await instaDownload(apiKey, url);
      const found = findMediaUrl(res);
      if (!found) throw new Error("Gak nemu URL media di respon server.");
      media = { url: found.url, filename: `onepunya-ig-${Date.now()}.${found.ext}`, mimetype: found.mimetype, isAudio: false };
      detail = `📸 Instagram (${found.ext})`;
    }

    await m.reply(raraWrap("Onepunya Downloader", `${detail}\n\n⬇️ File lagi dikirim...`));

    // kirim: coba buffer dulu, fallback document URL
    try {
      const dl = await axios.get(media.url, { responseType: "arraybuffer", timeout: 180_000 });
      const buf = Buffer.from(dl.data);
      if (media.isAudio) {
        await sock.sendMessage(m.chat, { audio: buf, mimetype: "audio/mpeg", ptt: false, fileName: media.filename }, { quoted: m });
      } else if (media.mimetype === "image/jpeg" || media.mimetype === "image/png") {
        await sock.sendMessage(m.chat, { image: buf, fileName: media.filename, caption: media.filename }, { quoted: m });
      } else {
        await sock.sendMessage(m.chat, { video: buf, mimetype: media.mimetype, fileName: media.filename }, { quoted: m });
      }
    } catch {
      await sock.sendMessage(m.chat, { document: { url: media.url }, fileName: media.filename, mimetype: media.mimetype }, { quoted: m });
    }
  } catch (e) {
    return m.reply(raraWrap("Onepunya Downloader", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

// cari URL media (mp4/mp3/jpg/png/webp) di kedalaman objek respon — struktur
// respon tiap platform beda-beda dan gak konsisten di dok API
function findMediaUrl(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return null;
  if (Array.isArray(obj)) {
    for (const it of obj) { const r = findMediaUrl(it, depth + 1); if (r) return r; }
    return null;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && /^https?:\/\//.test(v)) {
      const ext = (v.split("?")[0].match(/\.(\w{3,4})(?:$|\/)/) || [])[1]?.toLowerCase() || "";
      const isVideo = /mp4|webm/i.test(ext) || /video/i.test(k) || /\/video\//.test(v);
      const isImage = /jpg|jpeg|png|webp/i.test(ext) || /image|thumb/i.test(k);
      const isAudio = /mp3|opus|m4a|aac/i.test(ext) || /audio/i.test(k);
      if (isVideo) return { url: v, ext: ext || "mp4", mimetype: "video/mp4" };
      if (isImage) return { url: v, ext: ext || "jpg", mimetype: ext === "png" ? "image/png" : "image/jpeg" };
      if (isAudio) return { url: v, ext: ext || "mp3", mimetype: "audio/mpeg" };
    } else if (typeof v === "object" && v !== null) {
      const r = findMediaUrl(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

export { pluginConfig as config, handler };
