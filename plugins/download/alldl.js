// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: AllDL
 * Pembuat Code: Aizat
 * Fitur: All-in-one downloader — paste 1 link, bot kasih opsi pilihan
 *        User pilih: Video HD, Video SD, Audio MP3, atau Image
 *        Baru bot download sesuai pilihan
 *
 * Flow:
 *   1. User: .alldl <url>
 *   2. Bot: detect platform → kirim pesan dengan tombol pilihan format
 *   3. User: klik tombol (Video 720p / Audio MP3 / dll)
 *   4. Bot: download & kirim media sesuai pilihan
 *
 * Support: YouTube, TikTok, Instagram, Facebook, Twitter/X, Pinterest,
 *          Threads, Reddit, CapCut, Dailymotion, SoundCloud, Spotify, dll
 */

import axios from "axios";
import { getSaveNowKey } from "../../src/lib/config/env-loader.js";
import { aiodl } from "../../src/scraper/aio.js";
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { offerConvert } from "../../src/lib/nova-convert.js";
import { sendMenuPreview } from "../../src/lib/send-menu.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, toSC, bracketBox, tipText, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alldl",
  alias: ["alldl", "dl", "download", "get",
    // Alias untuk button click response
    "alldl_video", "alldl_audio", "alldl_image", "alldl_hd"],
  category: "download",
  description: "All-in-one downloader — paste link, pilih format, download",
  usage: ".alldl <url>",
  example: ".alldl https://youtu.be/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 2,
  isEnabled: true,
};

// === Session: simpan URL user sementara ===
const dlSessions = new Map();
const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 menit

// === SaveNow Config ===
const SAVENOW_BASE = "https://p.savenow.to/api/v2";
const POLL_INTERVAL = 3000;
const POLL_MAX = 40;

// === Platform Detection ===
const PLATFORM_MAP = [
  { keys: ["youtube.com", "youtu.be", "m.youtube.com"], name: "YouTube", icon: "▶️", hasAudio: true, hasVideo: true, hasImage: false },
  { keys: ["tiktok.com", "vt.tiktok.com", "vm.tiktok.com"], name: "TikTok", icon: "🎵", hasAudio: true, hasVideo: true, hasImage: true },
  { keys: ["instagram.com", "instagr.am"], name: "Instagram", icon: "📸", hasAudio: false, hasVideo: true, hasImage: true },
  { keys: ["facebook.com", "fb.watch", "fb.com", "m.facebook.com"], name: "Facebook", icon: "👥", hasAudio: false, hasVideo: true, hasImage: false },
  { keys: ["twitter.com", "x.com", "t.co"], name: "Twitter/X", icon: "🐦", hasAudio: false, hasVideo: true, hasImage: true },
  { keys: ["pinterest.com", "pin.it"], name: "Pinterest", icon: "📌", hasAudio: false, hasVideo: true, hasImage: true },
  { keys: ["threads.net"], name: "Threads", icon: "🧵", hasAudio: false, hasVideo: false, hasImage: true },
  { keys: ["reddit.com", "redd.it"], name: "Reddit", icon: "🤖", hasAudio: false, hasVideo: true, hasImage: true },
  { keys: ["capcut.com"], name: "CapCut", icon: "✂️", hasAudio: false, hasVideo: true, hasImage: false },
  { keys: ["dailymotion.com", "dai.ly"], name: "Dailymotion", icon: "🎬", hasAudio: true, hasVideo: true, hasImage: false },
  { keys: ["soundcloud.com"], name: "SoundCloud", icon: "☁️", hasAudio: true, hasVideo: false, hasImage: false },
  { keys: ["spotify.com", "spoti.fi"], name: "Spotify", icon: "🟢", hasAudio: true, hasVideo: false, hasImage: false },
  { keys: ["vimeo.com"], name: "Vimeo", icon: "🎥", hasAudio: true, hasVideo: true, hasImage: false },
  { keys: ["snackvideo.com"], name: "SnackVideo", icon: "🍿", hasAudio: true, hasVideo: true, hasImage: false },
  { keys: ["likee.video", "like.video"], name: "Likee", icon: "", hasAudio: true, hasVideo: true, hasImage: false },
];

function detectInfo(url) {
  const lower = (url || "").toLowerCase();
  for (const p of PLATFORM_MAP) {
    if (p.keys.some((k) => lower.includes(k))) return p;
  }
  return { name: "Unknown", icon: "🌐", hasAudio: true, hasVideo: true, hasImage: false };
}

// === SaveNow API ===
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
    if (data?.success === 0 && data?.progress === 0 && !data?.download_url && i > 15) {
      continue;
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

// === Build format options berdasarkan platform ===
function buildOptions(platform) {
  const opts = [];

  if (platform.hasVideo) {
    opts.push({ id: "alldl_hd", text: toSC("Video HD") });
    opts.push({ id: "alldl_video", text: toSC("Video SD") });
  }
  if (platform.hasAudio) {
    opts.push({ id: "alldl_audio", text: toSC("Audio MP3") });
  }
  if (platform.hasImage) {
    opts.push({ id: "alldl_image", text: toSC("Image / Foto") });
  }

  // Fallback: kalau gak ada opsi, kasih semua
  if (opts.length === 0) {
    opts.push({ id: "alldl_video", text: toSC("Video") });
    opts.push({ id: "alldl_audio", text: toSC("Audio MP3") });
  }

  return opts.slice(0, 4); // max 4 buttons
}

// === Format mapping ===
function formatForChoice(choice) {
  switch (choice) {
    case "alldl_hd": return "1080";
    case "alldl_video": return "720";
    case "alldl_audio": return "mp3";
    case "alldl_image": return "image";
    default: return "720";
  }
}

function isAudioChoice(choice) {
  return choice === "alldl_audio";
}

function isImageChoice(choice) {
  return choice === "alldl_image";
}

// === Main handler ===
async function handler(m, { sock }) {
  const prefix = m.prefix || ".";
  const body = m.body?.trim() || "";
  const command = m.command?.toLowerCase() || "";

  // ── MODE 1: Button click response ──
  // command = alldl_video / alldl_audio / alldl_image / alldl_hd
  if (["alldl_video", "alldl_audio", "alldl_image", "alldl_hd"].includes(command)) {
    const session = dlSessions.get(m.sender);
    if (!session) {
      await m.react("❗");
      return m.reply(
        novaGuide("AllDL", "Sesi download sudah kedaluwarsa nih! Silakan kirim ulang linknya ya.", `${prefix}alldl <url>`)
      );
    }

    const { url, platform } = session;
    const choice = command;
    const format = formatForChoice(choice);
    const isAudio = isAudioChoice(choice);
    const isImage = isImageChoice(choice);
    const apiKey = getSaveNowKey();
    // Kirim info proses
    let progressMsg = await m.reply(
      bracketBox(platform.icon, `${toSC("Downloading")} — ${toSC(platform.name)}`, [
        `${toSC("Format")}: ${isAudio ? "🎵 MP3" : isImage ? "🖼️ Image" : `📹 ${format}p`}`,
        `⏳ ${toSC("Sedang diproses...")}`,
      ])
    );

    let result = null;
    let usedMethod = "ikyy";

    // TRY 1: IkyyXD all-in-one (primary)
    if (!isImage) {
      try {
        const ikyyResult = await ikyyAio(url);
        if (ikyyResult?.medias?.length) {
          const videoMedia = ikyyResult.medias.find((x) => x.type === "video");
          const audioMedia = ikyyResult.medias.find((x) => x.type === "audio");

          let picked;
          if (isAudio) picked = audioMedia || videoMedia;
          else picked = videoMedia || audioMedia;

          if (picked) {
            result = {
              title: ikyyResult.title || "Downloaded",
              download_url: picked.url,
              type: picked.type,
              format: picked.quality || format,
            };
          }
        }
      } catch (ikyyErr) {
        console.error("[alldl] IkyyXD failed:", ikyyErr.message);
        usedMethod = "savenow";
      }
    } else {
      usedMethod = "savenow";
    }

    // TRY 2: SaveNow (untuk video & audio, fallback dari IkyyXD)
    if (!result && apiKey && !isImage) {
      try {
        const req = await savenowDownload(url, format, apiKey);
        const polled = await savenowPoll(req.progress_url, req.title, req.thumbnail_url);
        result = {
          title: polled.title,
          download_url: polled.download_url,
          thumbnail_url: polled.thumbnail_url,
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

    // TRY 3: AIO scraper (fallback terakhir atau untuk image)
    if (!result) {
      try {
        const aioResult = await aiodl(url);
        if (aioResult?.media?.length) {
          const videoMedia = aioResult.media.find((x) => x.type === "video");
          const audioMedia = aioResult.media.find((x) => x.type === "audio");
          const imageMedia = aioResult.media.find((x) => x.type === "image");

          let picked;
          if (isImage) picked = imageMedia || videoMedia;
          else if (isAudio) picked = audioMedia || videoMedia;
          else picked = videoMedia || imageMedia || audioMedia;

          if (!picked) throw new Error("No suitable media found");

          result = {
            title: aioResult.title || "Downloaded",
            download_url: picked.url,
            type: picked.type,
            format: picked.quality || format,
            aioResult: aioResult,
          };
        }
      } catch (aioErr) {
        console.error("[alldl] AIO failed:", aioErr.message);
      }
    }

    // Gagal semua
    if (!result || !result.download_url) {
      if (progressMsg?.key) {
        try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
      }
      // Clear session
      dlSessions.delete(m.sender);
      return m.reply(novaGagal("AllDL"));
    }

    // Download buffer
    const maxSize = isAudio ? 50 : 100;
    let buffer = null;
    try {
      buffer = await downloadBuffer(result.download_url, maxSize);
    } catch (dlErr) {
      if (progressMsg?.key) {
        try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
      }
      dlSessions.delete(m.sender);
      return m.reply(
        novaError(
          "AllDL",
          `File terlalu besar untuk dikirim langsung. Download manual di:\n${result.download_url}`
        )
      );
    }

    // Hapus pesan progress
    if (progressMsg?.key) {
      try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
    }

    // Format metadata kaya jika dari AIO
    const title = result.title || "Downloaded";
    const formatLabel = isAudio ? "🎵 MP3" : isImage ? "🖼️ Image" : `📹 ${result.format || "HD"}`;
    const methodTag = usedMethod === "savenow" ? "SaveNow" : "AIO Scraper";

    const aioMeta = result.aioResult || {};
    const ctxInfo = mediaPreviewCard({
      title,
      body: `${platform.name} • ${isAudio ? "MP3 Audio" : isImage ? "Image" : "Video"}`,
      sourceUrl: url,
      thumbnailUrl: aioMeta.thumbnail || result.thumbnail_url || "",
    });
    const caption = mediaCaption({
      platform: platform.name,
      platformIcon: platform.icon,
      title: title,
      author: aioMeta.author || null,
      authorHandle: aioMeta.authorHandle || null,
      duration: aioMeta.duration || null,
      uploadDate: aioMeta.uploadDate || null,
      views: aioMeta.views || null,
      likes: aioMeta.likes || null,
      comments: aioMeta.comments || null,
      shares: aioMeta.shares || null,
      downloads: aioMeta.downloads || null,
      description: aioMeta.description || null,
      format: formatLabel,
      method: methodTag,
    });

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
      } else if (result.type === "image" || isImage) {
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
        await offerConvert(sock, m, { buffer, type: "video", platform: platform.name, title, sourceUrl: url });
      }
      await m.reply(novaBerhasil("AllDL"));
    } catch (sendErr) {
      console.error("[alldl] Send error:", sendErr.message);
      m.reply(novaGangguan("AllDL"));
    }

    // Clear session
    dlSessions.delete(m.sender);
    return;
  }

  // ── MODE 2: Initial command — .alldl <url> ──
  const text = m.text?.trim();

  if (!text) {
    return m.reply(
      novaGuide(
        "AllDL",
        "Kirim link media dari YouTube, TikTok, IG, FB, dll. Nanti kamu bisa pilih mau download Video, Audio, atau Foto!",
        `${prefix}alldl https://youtu.be/xxx`
      )
    );
  }

  // Parse URL
  const url = text.split(/\s+/).find((p) => p.startsWith("http"));
  if (!url) {
    await m.react("❗");
    return m.reply(
      novaGuide(
        "AllDL",
        "URL-nya tidak valid nih! Kirim link dari YouTube, TikTok, IG, FB, dll.",
        `${prefix}alldl https://youtu.be/xxx`
      )
    );
  }

  // Detect platform
  const platform = detectInfo(url);
  // Simpan session
  dlSessions.set(m.sender, { url, platform, startedAt: Date.now() });
  setTimeout(() => dlSessions.delete(m.sender), SESSION_TIMEOUT);

  // Build pilihan berdasarkan platform
  const options = buildOptions(platform);

  // Kirim pesan dengan tombol pilihan
  const infoText = bracketBox(platform.icon, `${toSC("All Downloader")} — ${toSC(platform.name)}`, [
    `${toSC("Link terdeteksi!")}`,
    `${toSC("Pilih format download di bawah")}`,
    "",
    `${toSC("URL")}: ${url.slice(0, 50)}${url.length > 50 ? "..." : ""}`,
  ]);
  await sendMenuPreview(sock, m, {
    text: infoText,
    footer: "",
    buttons: options,
    title: `${toSC("Nova AI")} — ${toSC("Downloader")}`,
    body: toSC(platform.name),
    sourceUrl: url,
  });
}

export { pluginConfig as config, handler };
