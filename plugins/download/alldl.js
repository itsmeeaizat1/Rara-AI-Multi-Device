// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
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

import { runAllDlFallback } from "../../src/lib/alldl-fallback.js";
import axios from "axios";
import { getSaveNowKey } from "../../src/lib/config/env-loader.js";
import { aiodl } from "../../src/scraper/aio.js";
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import { haidarAio } from "../../src/lib/rara-haidar.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC, bracketBox, tipText, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch download) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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

// === Format options berdasarkan platform ===
// Pilihan ditampilkan sebagai TEKS LIST (bukan tombol) — preview card +
// template buttons gak support di WA modern (owner request 2026-09-03)
function buildOptions(platform) {
  const opts = [];

  if (platform.hasVideo) {
    opts.push({ id: "alldl_hd", keyword: "hd", label: "Video HD (1080p)" });
    opts.push({ id: "alldl_video", keyword: "video", label: "Video SD (720p)" });
  }
  if (platform.hasAudio) {
    opts.push({ id: "alldl_audio", keyword: "audio", label: "Audio MP3" });
  }
  if (platform.hasImage) {
    opts.push({ id: "alldl_image", keyword: "image", label: "Image / Foto" });
  }

  // Fallback: kalau gak ada opsi, kasih semua
  if (opts.length === 0) {
    opts.push({ id: "alldl_video", keyword: "video", label: "Video" });
    opts.push({ id: "alldl_audio", keyword: "audio", label: "Audio MP3" });
  }

  return opts.slice(0, 4);
}

// Map kata user → id pilihan (synonim biar gampang)
const KEYWORD_MAP = {
  hd: "alldl_hd", 1080: "alldl_hd", fhd: "alldl_hd",
  video: "alldl_video", vid: "alldl_video", vidio: "alldl_video", mp4: "alldl_video", sd: "alldl_video", 720: "alldl_video",
  audio: "alldl_audio", mp3: "alldl_audio", musik: "alldl_audio", music: "alldl_audio", lagu: "alldl_audio",
  image: "alldl_image", img: "alldl_image", foto: "alldl_image", gambar: "alldl_image", picture: "alldl_image",
};

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
// Jalankan download dari session aktif — dipakai jalur tombol (legacy) & teks
async function runSessionDownload(sock, m, session, choice) {
  const { url, platform } = session;
  const format = formatForChoice(choice);
  const isAudio = isAudioChoice(choice);
  const isImage = isImageChoice(choice);
  const apiKey = getSaveNowKey();
  // Kirim info proses
  let progressMsg = await m.reply(
    bracketBox(platform.icon, `${toSC("Downloading")} — ${toSC(platform.name)}`, [
      `${toSC("Format")}: ${isAudio ? "🎵 MP3" : isImage ? "🖼️ Image" : `📹 ${format}p`}`,
      `🕒 ${toSC("Sedang diproses...")}`,
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

  // TRY 4: HaidarApis (fallback terakhir — api.haidarxd.my.id, 26 platform)
  if (!result) {
    try {
      const haidarResult = await haidarAio(url);
      if (haidarResult?.medias?.length) {
        const videoMedia = haidarResult.medias.find((x) => x.type === "video");
        const audioMedia = haidarResult.medias.find((x) => x.type === "audio");
        const imageMedia = haidarResult.medias.find((x) => x.type === "image");

        let picked;
        if (isImage) picked = imageMedia || videoMedia;
        else if (isAudio) picked = audioMedia || videoMedia;
        else picked = videoMedia || audioMedia || imageMedia;

        if (picked) {
          result = {
            title: haidarResult.title || "Downloaded",
            download_url: picked.url,
            type: picked.type,
            format: picked.quality || format,
          };
          usedMethod = "haidar";
        }
      }
    } catch (haidarErr) {
      console.error("[alldl] Haidar failed:", haidarErr.message);
    }
  }

  // Gagal semua
  if (!result || !result.download_url) {
    if (progressMsg?.key) {
      try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
    }
    // Clear session
    dlSessions.delete(m.sender);
    return m.reply(raraGagal("AllDL"));
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
      raraError(
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
  // format owner 19 Sep (disamakan ke semua downloader): judul/uploader/username/
  // durasi/view/like/komentar/share/download — header dinamis per platform
  const caption = tiktokCaption({
    header: `${platform.name} Downloader`,
    title,
    uploader: aioMeta.author || null,
    username: aioMeta.authorHandle || null,
    duration: aioMeta.duration || null,
    views: aioMeta.views || null,
    likes: aioMeta.likes || null,
    comments: aioMeta.comments || null,
    shares: aioMeta.shares || null,
    download: isAudio ? "MP3" : isImage ? "Foto" : (result.format || "HD"),
  });

  try {
    // kartu info media (batch download)
    const sendCard = await dlCard((result.type === "audio" || isAudio) ? "audio" : (result.type === "image" || isImage) ? "gambar" : "video", { buffer: buffer }, [["Judul", String(title).slice(0, 40)], ["Platform", result.platform || platform.name || "-"]]);
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
      // kartu teks setelah audio (audio gak bisa caption)
      if (sendCard) await m.reply(sendCard);
    } else if (result.type === "image" || isImage) {
      await sock.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: (sendCard || caption),
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
    } else {
      await sock.sendMessage(
        m.chat,
        {
          video: buffer,
          caption: (sendCard || caption),
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
      await offerConvert(sock, m, { buffer, type: "video", platform: platform.name, title, sourceUrl: url });
    }
    await m.reply(raraBerhasil("AllDL"));
  } catch (sendErr) {
    console.error("[alldl] Send error:", sendErr.message);
    m.reply(raraGangguan("AllDL"));
  }

  // Clear session
  dlSessions.delete(m.sender);
  return;
}

async function handlerCore(m, { sock }) {
  const prefix = m.prefix || ".";
  const body = m.body?.trim() || "";
  const command = m.command?.toLowerCase() || "";

  // ── MODE 1: Button click response (legacy — tombol udah gak dikirim lagi,
  // tapi alias dibiarkan supaya client lama yang masih render tombol tetap jalan)
  if (["alldl_video", "alldl_audio", "alldl_image", "alldl_hd"].includes(command)) {
    const session = dlSessions.get(m.sender);
    if (!session) {
      await m.react("❗");
      return m.reply(
        raraGuide("AllDL", "Sesi download sudah kedaluwarsa nih! Silakan kirim ulang linknya ya.", `${prefix}alldl <url>`)
      );
    }
    return runSessionDownload(sock, m, session, command);
  }

  // ── MODE 1.5: Pilihan format via TEKS ──
  // Setelah bot kasih list format, user tinggal ketik: .alldl hd / .alldl video /
  // .alldl audio / .alldl image (tanpa URL)
  {
    const textRaw = (m.text || "").trim();
    const hasUrl = /https?:\/\//.test(textRaw);
    const firstWord = (m.args?.[0] || "").toLowerCase();
    if (!hasUrl && KEYWORD_MAP[firstWord]) {
      const session = dlSessions.get(m.sender);
      if (!session) {
        await m.react("❗");
        return m.reply(
          raraGuide("AllDL", "Sesi download sudah kedaluwarsa nih! Silakan kirim ulang linknya ya.", `${prefix}alldl <url>`)
        );
      }
      const wanted = KEYWORD_MAP[firstWord];
      const valid = buildOptions(session.platform).some((o) => o.id === wanted);
      if (!valid) {
        await m.react("❗");
        const list = buildOptions(session.platform)
          .map((o) => `• ${prefix}alldl ${o.keyword} — ${toSC(o.label)}`)
          .join("\n");
        return m.reply(
          bracketBox(session.platform.icon, toSC("All Downloader"), [
            toSC("Format itu gak tersedia buat platform ini! Pilihan yang valid:"),
            "",
            list,
          ])
        );
      }
      return runSessionDownload(sock, m, session, wanted);
    }
  }


  // ── MODE 2: Initial command — .alldl <url> ──
  const text = m.text?.trim();

  if (!text) {
    return m.reply(
      raraGuide(
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
      raraGuide(
        "AllDL",
        "URL-nya tidak valid nih! Kirim link dari YouTube, TikTok, IG, FB, dll.",
        `${prefix}alldl https://youtu.be/xxx`
      )
    );
  }

  // Detect platform
  const platform = detectInfo(url);

  // Format bisa langsung disebut sekalian: ".alldl <url> video" → langsung proses
  const extraWords = text.split(/\s+/).filter((w) => !w.startsWith("http"));
  const fmtWord = extraWords.map((w) => KEYWORD_MAP[w.toLowerCase()]).find(Boolean);
  dlSessions.set(m.sender, { url, platform, startedAt: Date.now() });
  setTimeout(() => dlSessions.delete(m.sender), SESSION_TIMEOUT);

  if (fmtWord && buildOptions(platform).some((o) => o.id === fmtWord)) {
    return runSessionDownload(sock, m, { url, platform, startedAt: Date.now() }, fmtWord);
  }

  // Pilihan format ditampilkan sebagai TEKS LIST (bukan tombol) —
  // preview card + template buttons gak support di WA modern
  const options = buildOptions(platform);
  const optionLines = options.map((o) => `${prefix}alldl ${o.keyword} — ${toSC(o.label)}`);
  const infoText = bracketBox(platform.icon, `${toSC("All Downloader")} — ${toSC(platform.name)}`, [
    `${toSC("Link terdeteksi!")}`,
    "",
    `${toSC("URL")}: ${url.slice(0, 50)}${url.length > 50 ? "..." : ""}`,
    "",
    `${toSC("Pilih format — ketik salah satu:")}`,
    ...optionLines,
  ]);
  await m.react("🐣");
  return m.reply(raraWrap("alldl", `${infoText}\n\n${tipText(`Sesi 3 menit — atau langsung sekalian: ${prefix}alldl <url> <format>`)}`, "guide"));
}

async function handler(m, ctx = {}) {
  // dipanggil langsung dari chain fallback — jangan wrap lagi
  if (ctx.__novaAllDlAttempt) return handlerCore(m, ctx);
  return runAllDlFallback("v1", m, ctx);
}

export { pluginConfig as config, handler };
