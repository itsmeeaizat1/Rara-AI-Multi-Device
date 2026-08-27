// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: AllDL
 * Pembuat Code: Aizat
 * Fitur: All-in-one downloader — paste 1 link apapun, bot auto-detect & download
 *        Support: YouTube, TikTok, Instagram, Facebook, Twitter/X, Pinterest,
 *        Threads, Reddit, CapCut, Dailymotion, SoundCloud, Spotify, dll
 *
 * Strategy:
 *   1. SaveNow API (primary) — paling reliable, support banyak platform
 *   2. AIO scraper (fallback) — tikwm, fastdl, ytdl, savefbs, dll
 *   3. Error yang jelas — kasih tau user apa yang salah
 *
 * Default format: 720p video (auto), bisa override: .alldl <url> mp3
 */

import axios from "axios";
import { getSaveNowKey } from "../../src/lib/config/env-loader.js";
import { aiodl, detectPlatform } from "../../src/scraper/aio.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alldl",
  alias: ["alldl", "dl", "download", "get"],
  category: "downloader",
  description: "All-in-one downloader — paste link apapun, auto download",
  usage: ".alldl <url> [format]",
  example: ".alldl https://youtu.be/xxx\n.alldl https://vt.tiktok.com/xxx mp3",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// === SaveNow Config ===
const SAVENOW_BASE = "https://p.savenow.to/api/v2";
const POLL_INTERVAL = 3000;
const POLL_MAX = 40; // ~2 menit
const VALID_FORMATS = ["mp3", "360", "480", "720", "1080"];
const DEFAULT_FORMAT = "720";

// === Platform Detection ===
const PLATFORM_MAP = [
  { keys: ["youtube.com", "youtu.be", "m.youtube.com"], name: "YouTube", icon: "▶️" },
  { keys: ["tiktok.com", "vt.tiktok.com", "vm.tiktok.com"], name: "TikTok", icon: "🎵" },
  { keys: ["instagram.com", "instagr.am"], name: "Instagram", icon: "📸" },
  { keys: ["facebook.com", "fb.watch", "fb.com", "m.facebook.com"], name: "Facebook", icon: "👥" },
  { keys: ["twitter.com", "x.com", "t.co"], name: "Twitter/X", icon: "🐦" },
  { keys: ["pinterest.com", "pin.it"], name: "Pinterest", icon: "📌" },
  { keys: ["threads.net"], name: "Threads", icon: "🧵" },
  { keys: ["reddit.com", "redd.it"], name: "Reddit", icon: "🤖" },
  { keys: ["capcut.com"], name: "CapCut", icon: "✂️" },
  { keys: ["dailymotion.com", "dai.ly"], name: "Dailymotion", icon: "🎬" },
  { keys: ["soundcloud.com"], name: "SoundCloud", icon: "☁️" },
  { keys: ["spotify.com", "spoti.fi"], name: "Spotify", icon: "🟢" },
  { keys: ["vimeo.com"], name: "Vimeo", icon: "🎥" },
  { keys: ["snackvideo.com"], name: "SnackVideo", icon: "🍿" },
  { keys: ["likee.video", "like.video"], name: "Likee", icon: "✨" },
];

function detectInfo(url) {
  const lower = (url || "").toLowerCase();
  for (const p of PLATFORM_MAP) {
    if (p.keys.some((k) => lower.includes(k))) return p;
  }
  return { name: "Unknown", icon: "🌐" };
}

// === Format Parser ===
function parseArgs(text) {
  const parts = text.trim().split(/\s+/);
  let url = "";
  let format = DEFAULT_FORMAT;

  for (const part of parts) {
    if (part.startsWith("http")) {
      url = part;
    } else if (VALID_FORMATS.includes(part.toLowerCase())) {
      format = part.toLowerCase();
    }
  }
  return { url, format };
}

// === SaveNow Downloader ===
async function savenowDownload(url, format, apiKey) {
  const params = new URLSearchParams({ format, url, apikey: apiKey });
  const { data } = await axios.get(`${SAVENOW_BASE}/download?${params.toString()}`, { timeout: 15000 });

  if (!data?.success && data?.success !== undefined) {
    throw new Error(data?.message || "SaveNow request failed");
  }

  return {
    id: data.id,
    progress_url: data.progress_url,
    title: data.title || data.info?.title || "Tanpa Judul",
    thumbnail_url: data.thumbnail_url || data.info?.image || null,
    format: data.format || format,
  };
}

async function savenowPoll(progressUrl, title, thumbnailUrl) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const { data } = await axios.get(progressUrl, { timeout: 15000 });

    if (data?.success === 1 || data?.progress >= 1000) {
      if (data.download_url) {
        return {
          download_url: data.download_url,
          title: data.title || title,
          thumbnail_url: data.thumbnail_url || data.info?.image || thumbnailUrl,
        };
      }
    }
    // Error check
    if (data?.success === 0 && data?.progress === 0 && !data?.download_url && i > 15) {
      continue; // kasih kesempatan lebih lama
    }
  }
  throw new Error("Timeout — server lambat merespon");
}

async function downloadBuffer(url, maxSizeMB = 100) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: maxSizeMB * 1024 * 1024,
  });
  return Buffer.from(response.data);
}

// === Main Handler ===
async function handler(m, { sock }) {
  const text = m.text?.trim();
  const prefix = m.prefix || ".";

  if (!text) {
    const platformList = PLATFORM_MAP.map((p) => `${p.icon} ${toSC(p.name)}`).join(" · ");
    const helpBox = bracketBox("📥", "All Downloader", [
      `${toSC("Paste link apapun, bot auto-detect & download")}`,
      "",
      `${toSC("Format")}:`,
      `mp3 — ${toSC("Audio saja")}`,
      `360/480/720/1080 — ${toSC("Video (pilih kualitas)")}`,
      `${toSC("Default")}: 720p`,
    ]);
    const supportBox = bracketBox("🌐", toSC("Platform Support"), platformList.split(" · ").map((s) => s));
    const exampleBox = bracketBox("💡", toSC("Contoh"), [
      `${prefix}alldl https://youtu.be/xxx`,
      `${prefix}alldl https://vt.tiktok.com/xxx`,
      `${prefix}alldl https://ig reel/xxx mp3`,
      `${prefix}dl https://fb.watch/xxx 1080`,
    ]);

    return m.reply(
      helpBox + "\n\n" + supportBox + "\n\n" + exampleBox + "\n\n" + tipText(`${toSC("Cukup paste link, bot otomatis detect!")}`)
    );
  }

  const { url, format } = parseArgs(text);

  if (!url || !url.startsWith("http")) {
    await m.react("❗");
    return m.reply(claraWrap("alldl", `${toSC("URL tidak valid!")} ${toSC("Kirim link dari YouTube, TikTok, IG, FB, dll")}`));
  }

  const platform = detectInfo(url);
  const isAudio = format === "mp3";
  const apiKey = getSaveNowKey();

  await m.react("🕒");

  // === Kirim info proses ===
  let progressMsg = await m.reply(
    bracketBox(platform.icon, `${toSC("All Downloader")} — ${toSC(platform.name)}`, [
      `${toSC("Format")}: ${isAudio ? "🎵 MP3" : `📹 ${format}p`}`,
      `${toSC("URL")}: ${url.slice(0, 50)}...`,
      `⏳ ${toSC("Sedang diproses...")}`,
    ])
  );

  let result = null;
  let usedMethod = "savenow";

  // === TRY 1: SaveNow API ===
  if (apiKey) {
    try {
      const req = await savenowDownload(url, format, apiKey);
      const polled = await savenowPoll(req.progress_url, req.title, req.thumbnail_url);
      result = {
        title: polled.title,
        download_url: polled.download_url,
        thumbnail: polled.thumbnail_url,
        type: isAudio ? "audio" : "video",
        format,
      };
    } catch (savenowErr) {
      console.error("[alldl] SaveNow failed:", savenowErr.message);
      usedMethod = "aio";
    }
  } else {
    usedMethod = "aio";
  }

  // === TRY 2: AIO Scraper (fallback) ===
  if (!result) {
    try {
      const aioResult = await aiodl(url);
      if (aioResult?.media?.length) {
        // Pick best media
        const videoMedia = aioResult.media.find((x) => x.type === "video");
        const audioMedia = aioResult.media.find((x) => x.type === "audio");
        const imageMedia = aioResult.media.find((x) => x.type === "image");

        const picked = isAudio ? audioMedia : (videoMedia || imageMedia || audioMedia);
        if (!picked) throw new Error("No suitable media found");

        result = {
          title: aioResult.title || "Downloaded",
          download_url: picked.url,
          thumbnail: aioResult.thumbnail || null,
          type: picked.type,
          format: picked.quality || format,
        };
      }
    } catch (aioErr) {
      console.error("[alldl] AIO failed:", aioErr.message);
    }
  }

  // === Gagal semua ===
  if (!result || !result.download_url) {
    if (progressMsg?.key) {
      try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
    }
    await m.react("❌");
    return m.reply(
      claraWrap(
        "alldl",
        `${toSC("Gagal download dari")} ${platform.name}\n` +
        `${toSC("Semua API sedang bermasalah untuk URL ini")}\n\n` +
        `${toSC("Coba")}: ${prefix}${isAudio ? "ytmp3" : "ytmp4"} ${toSC("untuk YouTube")}\n` +
        `${toSC("Atau coba lagi beberapa saat")}`,
        "error"
      )
    );
  }

  // === Download buffer ===
  const maxSize = isAudio ? 50 : 100;
  let buffer = null;
  try {
    buffer = await downloadBuffer(result.download_url, maxSize);
  } catch (dlErr) {
    // File terlalu besar — kirim URL aja
    if (progressMsg?.key) {
      try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
    }
    await m.react("🐣");
    return m.reply(
      bracketBox(platform.icon, `${toSC("All Downloader")} — ${toSC(platform.name)}`, [
        `${toSC("File terlalu besar untuk dikirim langsung")}`,
        `${toSC("Download manual")}:`,
        result.download_url,
      ])
    );
  }

  // === Hapus pesan progress ===
  if (progressMsg?.key) {
    try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
  }

  // === Kirim media ===
  const ctxInfo = saluranCtx();
  const title = (result.title || "Downloaded").slice(0, 60);
  const methodTag = usedMethod === "savenow" ? "SaveNow" : "AIO";

  const caption = bracketBox(platform.icon, `${toSC("All Downloader")} — ${toSC(platform.name)}`, [
    `${toSC("Judul")}: ${toSC(title)}`,
    `${toSC("Format")}: ${isAudio ? "🎵 MP3" : `📹 ${result.format}p`}`,
    `${toSC("Via")}: ${toSC(methodTag)}`,
  ]);

  try {
    if (result.type === "audio" || isAudio) {
      await sock.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: "audio/mpeg",
          fileName: title.replace(/[^\w\s-]/g, "").trim().slice(0, 40) + ".mp3",
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
    } else if (result.type === "image") {
      await sock.sendMessage(
        m.chat,
        {
          image: buffer,
          caption,
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
    } else {
      await sock.sendMessage(
        m.chat,
        {
          video: buffer,
          caption,
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
    }
    await m.react("🐣");
  } catch (sendErr) {
    console.error("[alldl] Send error:", sendErr.message);
    await m.react("❌");
    m.reply(claraWrap("alldl", `${toSC("Gagal mengirim media")}: ${sendErr.message.slice(0, 80)}`, "error"));
  }
}

export { pluginConfig as config, handler };
