// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// downloader.js — Unified Downloader
// Format: .downloader <platform> <format> <url atau keyword>
//
// Contoh:
//   .downloader youtube audio faded        → search YouTube "faded", download MP3
//   .downloader youtube video faded         → search YouTube "faded", download MP4
//   .downloader facebook <url>              → download video Facebook
//   .downloader tiktok video <url>          → download video TikTok
//   .downloader tiktok audio <url>          → download audio TikTok (MP3)
//   .downloader instagram <url>             → download media Instagram
//   .downloader twitter <url>              → download video Twitter/X
//   .downloader pinterest <url>             → download image/video Pinterest
//   .downloader soundcloud <url>            → download lagu SoundCloud
//   .downloader spotify <url>               → download lagu Spotify
//   .downloader mediafire <url>             → download file Mediafire
//   .downloader capcut <url>                → download template CapCut
//   .downloader reddit <url>                → download media Reddit
//   .downloader threads <url>               → download media Threads
//   .downloader dailymotion <url>           → download video Dailymotion

import yts from "yt-search";
import { aiodl, detectPlatform } from "../../src/scraper/aio.js";
import scdl from "../../src/scraper/soundclouddl.js";
import mediafire from "../../src/scraper/mediafire.js";
import { toSC, novaError, novaGuide, novaBox, mediaCaption, bracketBox } from "../../src/lib/nova-menu-style.js";
import { saluranCtx } from "../../src/lib/nova-context.js";

const pluginConfig = {
  name: "downloader",
  alias: ["downloader", "dl2", "get2"],
  category: "download",
  description: "Unified downloader — .downloader <platform> <format> <url/keyword>",
  usage: ".downloader <platform> <format> <url/keyword>",
  example: ".downloader youtube audio faded\n.downloader tiktok video <url>",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 2,
  isEnabled: true,
};

// === Platform registry ===
const PLATFORMS = {
  youtube:     { alias: ["yt", "ytmp3", "ytmp4"], formats: ["audio", "video", "mp3", "mp4"], icon: "▶️", needsUrl: false },
  tiktok:      { alias: ["tt", "tiktokdl"], formats: ["audio", "video", "mp3", "mp4"], icon: "🎵", needsUrl: true },
  facebook:    { alias: ["fb", "fbdl"], formats: ["video", "hd", "sd"], icon: "👥", needsUrl: true },
  instagram:   { alias: ["ig", "igdl"], formats: ["video", "image", "all"], icon: "📸", needsUrl: true },
  twitter:     { alias: ["tw", "x", "twdl"], formats: ["video", "image"], icon: "🐦", needsUrl: true },
  pinterest:   { alias: ["pin", "pindl"], formats: ["video", "image"], icon: "📌", needsUrl: true },
  soundcloud:  { alias: ["sc"], formats: ["audio"], icon: "☁️", needsUrl: true },
  spotify:     { alias: ["sp"], formats: ["audio"], icon: "🟢", needsUrl: true },
  mediafire:   { alias: ["mf", "mfdl"], formats: ["file"], icon: "📁", needsUrl: true },
  capcut:      { alias: ["cc"], formats: ["video"], icon: "✂️", needsUrl: true },
  reddit:      { alias: ["rd"], formats: ["video", "image"], icon: "🤖", needsUrl: true },
  threads:     { alias: ["th"], formats: ["image", "video"], icon: "🧵", needsUrl: true },
  dailymotion: { alias: ["dm"], formats: ["video", "audio"], icon: "🎬", needsUrl: true },
  snackvideo:  { alias: ["sv"], formats: ["video", "audio"], icon: "🍿", needsUrl: true },
  likee:       { alias: ["lk"], formats: ["video", "audio"], icon: "✨", needsUrl: true },
  terabox:     { alias: ["tb"], formats: ["file", "video"], icon: "📦", needsUrl: true },
};

function resolvePlatform(input) {
  const lower = (input || "").toLowerCase().trim();
  if (PLATFORMS[lower]) return lower;
  for (const [key, info] of Object.entries(PLATFORMS)) {
    if (info.alias.includes(lower)) return key;
  }
  return null;
}

function resolveFormat(input) {
  const lower = (input || "").toLowerCase().trim();
  // Normalize: mp3 → audio, mp4 → video
  if (["mp3", "audio", "music", "song", "lagu"].includes(lower)) return "audio";
  if (["mp4", "video", "vid", "vidio"].includes(lower)) return "video";
  if (["hd", "720", "720p", "1080", "1080p"].includes(lower)) return "hd";
  if (["sd", "360", "360p", "480", "480p"].includes(lower)) return "sd";
  if (["image", "img", "foto", "photo"].includes(lower)) return "image";
  if (["file", "doc", "document"].includes(lower)) return "file";
  if (["all", "semua"].includes(lower)) return "all";
  return null;
}

// === YouTube: search + download ===
async function handleYouTube(query, format, sock, m) {
  // Jika input adalah URL YouTube, langsung download
  if (query.match(/youtube\.com|youtu\.be/i)) {
    return await downloadYouTube(query, format, sock, m);
  }

  // Search YouTube
  const search = await yts(query);
  if (!search.videos?.length) throw new Error("Lagu/video tidak ditemukan di YouTube");

  const video = search.videos[0];
  const title = video.title;
  const channel = video.author.name;
  const duration = video.duration.timestamp;
  const views = video.views > 1e6 ? (video.views / 1e6).toFixed(1) + "M" :
                video.views > 1e3 ? (video.views / 1e3).toFixed(1) + "K" : String(video.views);

  // Info box
  const info = bracketBox("▶️", toSC("YouTube Downloader"), [
    `${toSC("Judul")} : ${title}`,
    `${toSC("Channel")} : ${channel}`,
    `${toSC("Durasi")} : ${duration}`,
    `${toSC("Views")} : ${views}`,
    `${toSC("Format")} : ${format === "audio" ? "🎵 MP3" : "📹 MP4"}`,
    `${toSC("Status")} : ⏳ Downloading...`,
  ]);
  await m.reply(info);

  await downloadYouTube(video.url, format, sock, m, { title, channel, duration, views });
}

async function downloadYouTube(url, format, sock, m, meta = {}) {
  try {
    const ytdl = (await import("../../src/scraper/ytdl.js")).default;
    const outputFormat = format === "audio" ? "mp3" : "mp4";
    const result = await ytdl(url, outputFormat);

    if (!result?.status || !result?.dl) {
      throw new Error(result?.mess || "Gagal mengunduh dari YouTube");
    }

    // Download buffer
    const axios = (await import("axios")).default;
    const res = await axios.get(result.dl, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: format === "audio" ? 50 * 1024 * 1024 : 100 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(res.data);

    const title = meta.title || result.title || "YouTube Download";
    const caption = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube",
      title,
      author: meta.channel || null,
      duration: meta.duration || null,
      format: format === "audio" ? "🎵 MP3" : "📹 MP4",
      method: "yt-dlp",
    });

    if (format === "audio") {
      await sock.sendMessage(m.chat, {
        audio: buffer,
        mimetype: "audio/mpeg",
        fileName: title.replace(/[^\w\s-]/g, "").trim().slice(0, 40) + ".mp3",
        contextInfo: saluranCtx(),
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption,
        contextInfo: saluranCtx(),
      }, { quoted: m });
    }
    await m.react("🐣");
  } catch (err) {
    await m.react("❌");
    m.reply(novaError("YouTube DL", err.message || "Gagal download YouTube"));
  }
}

// === Generic AIO handler (TikTok, IG, FB, Twitter, Pinterest, dll) ===
async function handleAIO(url, format, platformName, sock, m) {
  const result = await aiodl(url);
  if (!result?.media?.length) throw new Error(`Gagal mengambil media dari ${platformName}`);

  const ctxInfo = saluranCtx();
  let picked = null;

  if (format === "audio") {
    picked = result.media.find((x) => x.type === "audio") || result.media.find((x) => x.type === "video");
  } else if (format === "image") {
    picked = result.media.find((x) => x.type === "image") || result.media.find((x) => x.type === "video");
  } else if (format === "hd") {
    picked = result.media.filter((x) => x.type === "video").sort((a, b) => (b.quality || 0) - (a.quality || 0))[0] || result.media[0];
  } else {
    // video / default
    picked = result.media.find((x) => x.type === "video") || result.media[0];
  }

  if (!picked) throw new Error("Media tidak ditemukan untuk format yang diminta");

  const axios = (await import("axios")).default;
  const max = format === "audio" ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
  const res = await axios.get(picked.url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: max,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const buffer = Buffer.from(res.data);

  const caption = mediaCaption({
    platformIcon: PLATFORMS[platformName]?.icon || "🌐",
    platformName: platformName.charAt(0).toUpperCase() + platformName.slice(1),
    title: result.title || "Downloaded",
    author: result.author || null,
    duration: result.duration || null,
    format: format === "audio" ? "🎵 MP3" : format === "image" ? "🖼️ Image" : "📹 Video",
    method: "AIO Scraper",
  });

  if (format === "audio" && picked.type !== "video") {
    await sock.sendMessage(m.chat, {
      audio: buffer, mimetype: "audio/mpeg",
      fileName: (result.title || "audio").replace(/[^\w\s-]/g, "").trim().slice(0, 40) + ".mp3",
      contextInfo: ctxInfo,
    }, { quoted: m });
  } else if (format === "image" || picked.type === "image") {
    await sock.sendMessage(m.chat, {
      image: buffer, caption, contextInfo: ctxInfo,
    }, { quoted: m });
  } else {
    await sock.sendMessage(m.chat, {
      video: buffer, caption, contextInfo: ctxInfo,
    }, { quoted: m });
  }
  await m.react("🐣");
}

// === SoundCloud handler ===
async function handleSoundCloud(url, sock, m) {
  const result = await scdl(url);
  const axios = (await import("axios")).default;
  const res = await axios.get(result.download_url, {
    responseType: "arraybuffer", timeout: 120000,
    maxContentLength: 50 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const buffer = Buffer.from(res.data);

  const caption = mediaCaption({
    platformIcon: "☁️", platformName: "SoundCloud",
    title: result.title, author: result.uploader,
    duration: result.duration, format: "🎵 MP3", method: "SC API v2",
  });

  await sock.sendMessage(m.chat, {
    audio: buffer, mimetype: "audio/mpeg",
    fileName: result.title.replace(/[^\w\s-]/g, "").trim().slice(0, 40) + ".mp3",
    caption, contextInfo: saluranCtx(),
  }, { quoted: m });
  await m.react("🐣");
}

// === Spotify handler ===
async function handleSpotify(url, sock, m) {
  const { downloadSpotify } = await import("../../src/scraper/spotify.js");
  const result = await downloadSpotify(url);
  if (!result?.download_url) throw new Error("Gagal download dari Spotify");

  const axios = (await import("axios")).default;
  const res = await axios.get(result.download_url, {
    responseType: "arraybuffer", timeout: 120000,
    maxContentLength: 50 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const buffer = Buffer.from(res.data);

  const caption = mediaCaption({
    platformIcon: "🟢", platformName: "Spotify",
    title: result.title || "Spotify Track",
    author: result.author || null,
    format: "🎵 MP3", method: "Spotify Scraper",
  });

  await sock.sendMessage(m.chat, {
    audio: buffer, mimetype: "audio/mpeg",
    fileName: (result.title || "spotify").replace(/[^\w\s-]/g, "").trim().slice(0, 40) + ".mp3",
    caption, contextInfo: saluranCtx(),
  }, { quoted: m });
  await m.react("🐣");
}

// === Mediafire handler ===
async function handleMediafire(url, sock, m) {
  const result = await mediafire(url);
  if (!result?.download?.link_download) throw new Error("Gagal mengambil link Mediafire");

  const axios = (await import("axios")).default;
  const res = await axios.get(result.download.link_download, {
    responseType: "arraybuffer", timeout: 300000,
    maxContentLength: 200 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const buffer = Buffer.from(res.data);

  const filename = result.download.link_download.split("/").pop()?.split("?")[0] || "file";
  const caption = mediaCaption({
    platformIcon: "📁", platformName: "MediaFire",
    title: result.meta?.title || filename,
    format: "📦 " + (result.download.mimetype || "File"),
    method: "Direct Scrape",
  });

  await sock.sendMessage(m.chat, {
    document: buffer,
    fileName: filename,
    mimetype: result.download.mimetype || "application/octet-stream",
    caption, contextInfo: saluranCtx(),
  }, { quoted: m });
  await m.react("🐣");
}

// === Main handler ===
async function handler(m, { sock }) {
  const prefix = m.prefix || ".";
  const body = (m.body || "").trim();
  const args = body.split(/\s+/);

  // args[0] = platform, args[1] = format (optional), args[2+] = url or query
  if (!args[0]) {
    // Tampilkan panduan + list platform
    const platforms = Object.keys(PLATFORMS).map(k =>
      `│ ${PLATFORMS[k].icon} ${toSC(k.padEnd(12))} ${prefix}downloader ${k} ${PLATFORMS[k].needsUrl ? "<url>" : "<keyword>"}`
    ).join("\n");

    return m.reply(
      "╭─「 ✦ " + toSC("Unified Downloader") + " ✦ 」\n│\n" +
      "│ " + toSC("Format") + ": " + prefix + "downloader <platform> <format> <url/keyword>\n│\n" +
      "│ " + toSC("Platform tersedia") + ":\n" +
      platforms + "\n│\n" +
      "│ " + toSC("Format") + ": audio, video, image, hd, sd, file, all\n│\n" +
      "│ 📌 " + toSC("Contoh") + ":\n" +
      "│ " + prefix + "downloader youtube audio faded\n" +
      "│ " + prefix + "downloader tiktok video <url>\n" +
      "│ " + prefix + "downloader facebook <url>\n" +
      "╰────  •  ────"
    );
  }

  const platformName = resolvePlatform(args[0]);
  if (!platformName) {
    await m.react("❗");
    return m.reply(
      novaError("Downloader", `Platform "${args[0]}" tidak dikenal. Ketik ${prefix}downloader untuk lihat daftar platform.`)
    );
  }

  const platform = PLATFORMS[platformName];
  let format = "video";
  let query = "";

  if (platform.needsUrl) {
    // Platform yang butuh URL
    // Format opsional — bisa .downloader facebook <url> atau .downloader facebook video <url>
    if (args[1] && args[1].startsWith("http")) {
      // Tanpa format, langsung URL
      query = args.slice(1).join(" ");
    } else if (args[1] && resolveFormat(args[1])) {
      // Dengan format
      format = resolveFormat(args[1]);
      query = args.slice(2).join(" ");
    } else if (args[1]) {
      // Tidak ada format match, anggap semua args setelah platform = url/query
      query = args.slice(1).join(" ");
    }

    if (!query) {
      return m.reply(
        novaGuide("Downloader", `Masukkan URL ${platformName} yang mau di-download!`, `${prefix}downloader ${platformName} <url>`)
      );
    }

    // Validasi URL
    if (!query.match(/^https?:\/\//i)) {
      await m.react("❗");
      return m.reply(novaError("Downloader", `"${query.slice(0, 50)}" bukan URL yang valid.`));
    }
  } else {
    // Platform yang bisa search (YouTube)
    if (args[1] && resolveFormat(args[1])) {
      format = resolveFormat(args[1]);
      query = args.slice(2).join(" ");
    } else {
      query = args.slice(1).join(" ");
    }

    if (!query) {
      return m.reply(
        novaGuide("Downloader", `Masukkan kata kunci pencarian untuk ${platformName}!`, `${prefix}downloader ${platformName} audio faded`)
      );
    }
  }

  await m.react("🕒");

  try {
    // Route ke handler yang sesuai
    switch (platformName) {
      case "youtube":
        await handleYouTube(query, format, sock, m);
        break;

      case "soundcloud":
        await handleSoundCloud(query, sock, m);
        break;

      case "spotify":
        await handleSpotify(query, sock, m);
        break;

      case "mediafire":
        await handleMediafire(query, sock, m);
        break;

      default:
        // TikTok, Facebook, Instagram, Twitter, Pinterest, CapCut, Reddit, Threads, Dailymotion, SnackVideo, Likee, Terabox
        await handleAIO(query, format, platformName, sock, m);
        break;
    }
  } catch (err) {
    console.error(`[Downloader] ${platformName}:`, err.message);
    await m.react("❌");
    m.reply(novaError("Downloader", err.message || `Gagal download dari ${platformName}`));
  }
}

export { pluginConfig as config, handler };
