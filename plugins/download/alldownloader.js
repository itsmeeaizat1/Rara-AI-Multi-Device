// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: AllDownloader (Omnify AIO)
 * Pembuat Code: Aizat
 * Fitur: Universal downloader — 1 fitur support SEMUA platform downloader.
 *        Resolver utama: Omnify AIO (api-aio.omnifylabs.sbs, 30+ platform,
 *        multi-format + ukuran file). Kalau platform itu mati di Omnify
 *        (TikTok/X/Pinterest per live test 2026-09-06), otomatis fallback
 *        ke rantai internal bot (IkyyXD → builtin AIO → Haidar).
 *
 * Flow:
 *   1. User: .alldownloader <url>
 *   2. Bot: resolve link → tampilin daftar format beneran (nomor + label + ukuran)
 *   3. User: .alldownloader <nomor> (atau keyword hd/video/audio/foto)
 *   4. Bot: download & kirim media sesuai pilihan
 *   Langsung: .alldownloader <url> <nomor/keyword> → tanpa nanya
 *
 * Support (via Omnify): YouTube, Instagram, Facebook, Spotify, SoundCloud,
 *   CapCut, Threads, Vimeo, Dailymotion, dll + fallback internal: TikTok,
 *   Twitter/X, Pinterest, dan semua platform yang udah ada di scraper bot.
 */

import axios from "axios";
import { omnifyResolve, omnifyHealth } from "../../src/scraper/omnify-aio.js";
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import { aiodl } from "../../src/scraper/aio.js";
import { haidarAio } from "../../src/lib/nova-haidar.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { offerConvert } from "../../src/lib/nova-convert.js";
import {
  novaError, novaGuide, novaBerhasil, novaGagal, novaGangguan,
  toSC, bracketBox, tipText, mediaCaption,
} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alldownloader",
  alias: ["alldownloader", "adl"],
  category: "download",
  description: "Universal downloader semua platform — 1 link, daftar format asli (Omnify AIO) + fallback rantai internal",
  usage: ".alldownloader <url> — lalu pilih nomor format\n.alldownloader <url> <nomor/keyword> — langsung proses\n.alldownloader health — cek server backend",
  example: ".alldownloader https://youtu.be/xxx\n.alldownloader https://open.spotify.com/track/xxx audio",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// === Session: simpan hasil resolve user sementara ===
const adlSessions = new Map();
const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 menit

// === Tampilan platform ===
const PLATFORM_STYLE = {
  youtube:    { name: "YouTube",    icon: "▶️" },
  tiktok:     { name: "TikTok",     icon: "🎵" },
  douyin:     { name: "Douyin",     icon: "🎵" },
  instagram:  { name: "Instagram",  icon: "📸" },
  facebook:   { name: "Facebook",   icon: "👥" },
  twitter:    { name: "Twitter/X",  icon: "🐦" },
  x:          { name: "Twitter/X",  icon: "🐦" },
  pinterest:  { name: "Pinterest",  icon: "📌" },
  threads:    { name: "Threads",    icon: "🧵" },
  reddit:     { name: "Reddit",     icon: "🤖" },
  capcut:     { name: "CapCut",     icon: "✂️" },
  soundcloud: { name: "SoundCloud", icon: "☁️" },
  spotify:    { name: "Spotify",    icon: "🟢" },
  vimeo:      { name: "Vimeo",      icon: "🎥" },
  dailymotion:{ name: "Dailymotion",icon: "🎬" },
  snackvideo: { name: "SnackVideo", icon: "🍿" },
  likee:      { name: "Likee",      icon: "💫" },
  generic:     { name: "Media",      icon: "🌐" },
};

function platformStyle(key) {
  return PLATFORM_STYLE[String(key || "").toLowerCase()] || PLATFORM_STYLE.generic;
}

// === Keyword shortcut → tipe pilihan ===
const KEYWORD_MAP = {
  hd: "video", video: "video", vid: "video", vidio: "video", mp4: "video",
  audio: "audio", mp3: "audio", musik: "audio", music: "audio", lagu: "audio",
  image: "image", img: "image", foto: "image", gambar: "image",
};

// === Builder daftar opsi dari hasil Omnify ===
function buildOmnifyOptions(data) {
  const options = [];
  const fmts = Array.isArray(data?.formats) ? data.formats : [];

  // Video formats — urut resolusi kecil→besar biar nomor 1 = paling ringan,
  // tapi label tetap jelas. Skip format watermark kalau ada versi no-wm.
  const noWm = fmts.filter((f) => f.type === "video" && !f.hasWatermark);
  const videoFmts = (noWm.length ? noWm : fmts.filter((f) => f.type === "video"))
    .slice()
    .sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0));

  for (const f of videoFmts.slice(0, 6)) {
    options.push({
      type: "video",
      label: `${f.label || f.quality || "Video"}${f.size ? ` — ${f.size}` : ""}`,
      url: f.url,
      ext: (f.ext || "mp4").toLowerCase(),
    });
  }
  if (!options.length && data?.videoUrl) {
    options.push({ type: "video", label: "Video" + (data.hdVideoUrl ? " SD" : ""), url: data.videoUrl, ext: "mp4" });
    if (data.hdVideoUrl) options.push({ type: "video", label: "Video HD", url: data.hdVideoUrl, ext: "mp4" });
  }

  // Audio
  const audioFmt = fmts.find((f) => f.type === "audio");
  if (audioFmt?.url) {
    options.push({ type: "audio", label: audioFmt.label || "Audio MP3", url: audioFmt.url, ext: (audioFmt.ext || "mp3").toLowerCase() });
  } else if (data?.audioUrl) {
    options.push({ type: "audio", label: "Audio MP3", url: data.audioUrl, ext: "mp3" });
  } else if (data?.music?.playUrl) {
    options.push({ type: "audio", label: `Audio — ${data.music.title || "MP3"}`, url: data.music.playUrl, ext: "mp3" });
  }

  // Images (kumpulan foto / thumbnail)
  if (Array.isArray(data?.images) && data.images.length > 0) {
    options.push({
      type: "image",
      label: `Semua Foto (${data.images.length} gambar)`,
      urls: data.images.slice(0, 10),
      ext: "jpg",
    });
  } else if (data?.type === "image") {
    const coverFmt = fmts.find((f) => f.type === "image");
    if (coverFmt?.url) {
      options.push({ type: "image", label: coverFmt.label || "Foto", urls: [coverFmt.url], ext: (coverFmt.ext || "jpg").toLowerCase() });
    }
  }

  return options;
}

// === Builder daftar opsi dari rantai internal (ikyy/aiodl/haidar) ===
function normalizeMedias(medias) {
  const out = [];
  for (const item of medias || []) {
    if (!item?.url) continue;
    out.push({
      type: item.type || "video",
      label: `${item.type === "audio" ? "Audio MP3" : "Video"}${item.quality ? ` ${item.quality}` : ""}`,
      url: item.url,
      ext: (item.ext || (item.type === "audio" ? "mp3" : "mp4")).toLowerCase(),
      urls: item.type === "image" && item.thumb ? [item.thumb] : undefined,
    });
  }
  return out;
}

async function internalResolve(url) {
  // Rantai fallback internal — platform yang mati di Omnify (TikTok/X/Pinterest/dll)
  let meta = { title: "", thumbnail: "" };

  try {
    const r = await ikyyAio(url);
    const opts = normalizeMedias(r?.medias);
    if (opts.length) {
      return { source: "IkyyXD", options: opts, meta: { ...meta, title: r?.title || "", thumbnail: r?.thumbnail || "" } };
    }
  } catch {}

  try {
    const r = await aiodl(url);
    const opts = normalizeMedias(r?.media);
    if (opts.length) {
      return {
        source: "AIO Scraper",
        options: opts,
        meta: {
          title: r?.title || "",
          thumbnail: r?.thumbnail || "",
          author: r?.author || null,
          authorHandle: r?.authorHandle || null,
          duration: r?.duration || null,
          views: r?.views || null,
          likes: r?.likes || null,
          description: r?.description || null,
        },
      };
    }
  } catch {}

  try {
    const r = await haidarAio(url);
    const opts = normalizeMedias(r?.medias);
    if (opts.length) {
      return { source: "Haidar", options: opts, meta: { ...meta, title: r?.title || "" } };
    }
  } catch {}

  return null;
}

// === Download buffer ===
async function downloadBuffer(url, maxSizeMB = 100) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: maxSizeMB * 1024 * 1024,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    },
  });
  return Buffer.from(response.data);
}

// === Kirim media sesuai pilihan ===
async function sendMedia(sock, m, session, opt, meta) {
  const style = platformStyle(session.platform);
  const title = meta.title || session.title || "Downloaded";
  const ctxInfo = mediaPreviewCard({
    title,
    body: `${style.name} • ${opt.type === "audio" ? "Audio" : opt.type === "image" ? "Image" : "Video"}`,
    sourceUrl: session.url,
    thumbnailUrl: meta.cover || meta.thumbnail || "",
  });
  const caption = mediaCaption({
    platformName: style.name,
    platformIcon: style.icon,
    title,
    author: meta.author || null,
    authorHandle: meta.authorHandle || null,
    duration: meta.duration || null,
    views: meta.views || null,
    likes: meta.likes || null,
    description: meta.description || null,
    format: opt.label,
    method: session.source,
  });

  if (opt.type === "audio") {
    await sock.sendMessage(
      m.chat,
      {
        audio: opt.buffer,
        mimetype: "audio/mpeg",
        fileName: String(title).replace(/[^\w\s-]/g, "").trim().slice(0, 40) + ".mp3",
        contextInfo: ctxInfo,
      },
      { quoted: m }
    );
  } else if (opt.type === "image") {
    const urls = opt.urls?.length ? opt.urls : [opt.url];
    for (let i = 0; i < urls.length; i++) {
      try {
        const buf = await downloadBuffer(urls[i], 30);
        await sock.sendMessage(
          m.chat,
          {
            image: buf,
            caption: i === 0 ? caption : undefined,
            contextInfo: ctxInfo,
          },
          { quoted: m }
        );
      } catch {}
    }
  } else {
    await sock.sendMessage(
      m.chat,
      {
        video: opt.buffer,
        caption,
        contextInfo: ctxInfo,
      },
      { quoted: m }
    );
    await offerConvert(sock, m, {
      buffer: opt.buffer,
      type: "video",
      platform: style.name,
      title,
      sourceUrl: session.url,
    });
  }
}

// === Proses download + kirim dari session aktif ===
async function runDownload(sock, m, session, opt) {
  const style = platformStyle(session.platform);
  await m.react("⏬");

  const progressMsg = await m.reply(
    bracketBox(style.icon, `${toSC("Downloading")} — ${toSC(style.name)}`, [
      `${toSC("Format")}: ${opt.label}`,
      `⏳ ${toSC("Sedang diproses...")}`,
    ])
  );

  // Image multi-foto ditangani langsung di sendMedia (tanpa buffer awal)
  if (opt.type !== "image") {
    try {
      opt.buffer = await downloadBuffer(opt.url, opt.type === "audio" ? 50 : 100);
    } catch (err) {
      console.error("[alldownloader] download error:", err.message);
      if (progressMsg?.key) {
        try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
      }
      adlSessions.delete(m.sender);
      return m.reply(
        novaError(
          "AllDownloader",
          `File terlalu besar untuk dikirim langsung. Download manual di:\n${opt.url}`
        )
      );
    }
  }

  if (progressMsg?.key) {
    try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
  }

  try {
    await m.react("🐣");
    await sendMedia(sock, m, session, opt, session.meta || {});
    await m.reply(novaBerhasil("AllDownloader"));
  } catch (err) {
    console.error("[alldownloader] send error:", err.message);
    await m.reply(novaGangguan("AllDownloader"));
  }

  adlSessions.delete(m.sender);
  return;
}

// === Main handler ===
async function handler(m, { sock }) {
  const prefix = m.prefix || ".";
  const body = m.body?.trim() || "";
  const command = m.command?.toLowerCase() || "";

  // ── Health check backend ──
  const firstArg = (m.args?.[0] || "").toLowerCase();
  if (firstArg === "health" || firstArg === "status") {
    try {
      await m.react("🕒");
      const h = await omnifyHealth();
      await m.react("🐣");
      return m.reply(
        bracketBox("🌐", toSC("Omnify AIO Server"), [
          `${toSC("Status")}: ${h?.status || "?"}`,
          `${toSC("Service")}: ${h?.service || "?"}`,
          `${toSC("Versi")}: ${h?.version || "?"}`,
        ])
      );
    } catch (err) {
      await m.react("❗");
      return m.reply(novaGangguan("AllDownloader"));
    }
  }

  // ── MODE 1: Pilih format dari session aktif (tanpa URL) ──
  // Cuma intercept kalau token-nya nomor/keyword format — kalau bukan
  // (misal user typo ".alldownloader hlo"), jatuh ke guide utama biar gak
  // nyas sesi dengan pesan "sesi kedaluwarsa" yang nyaru.
  const textRaw = (m.text || "").trim();
  const hasUrl = /https?:\/\//.test(textRaw);
  const pickToken = (m.args?.[0] || "").toLowerCase();
  const isPickToken = /^\d+$/.test(pickToken) || !!KEYWORD_MAP[pickToken];

  if (!hasUrl && (command === "alldownloader" || command === "adl") && isPickToken) {
    const session = adlSessions.get(m.sender);
    if (!session) {
      await m.react("❗");
      return m.reply(
        novaGuide(
          "AllDownloader",
          "Sesi download sudah kedaluwarsa nih! Kirim ulang linknya ya.",
          `${prefix}alldownloader <url>`
        )
      );
    }

    let opt = null;
    const num = parseInt(pickToken, 10);
    if (!isNaN(num) && num >= 1 && num <= session.options.length) {
      opt = session.options[num - 1];
    } else {
      // Keyword: hd/video → video pertama, audio → audio, foto → image
      const want = KEYWORD_MAP[pickToken];
      if (want) {
        opt =
          session.options.find((o) => o.type === want) ||
          session.options.find((o) =>
            want === "video" ? o.type === "audio" : o.type === "video"
          );
      }
    }

    if (!opt) {
      await m.react("❗");
      const list = session.options
        .map((o, i) => `${prefix}alldownloader ${i + 1} — ${toSC(o.label)}`)
        .join("\n");
      return m.reply(
        bracketBox("🌐", toSC("All Downloader"), [
          toSC("Pilihan gak valid! Yang tersedia:"),
          "",
          list,
        ])
      );
    }
    return runDownload(sock, m, session, opt);
  }

  // ── MODE 2: Command utama dengan URL ──
  const url = textRaw.split(/\s+/).find((p) => p.startsWith("http"));
  if (!url) {
    await m.react("❗");
    return m.reply(
      novaGuide(
        "AllDownloader",
        "Kirim link media dari platform mana aja — YouTube, TikTok, IG, FB, Spotify, SoundCloud, Pinterest, CapCut, dll. Bot kasih daftar format, kamu tinggal pilih nomor!",
        `${prefix}alldownloader https://youtu.be/xxx`
      )
    );
  }

  await m.react("🕒");
  await m.react("🔍");

  // TRY 1: Omnify AIO (resolver utama)
  let session = null;
  try {
    const res = await omnifyResolve(url);
    const data = res?.data || {};
    const options = buildOmnifyOptions(data);
    if (options.length) {
      const style = platformStyle(data.platform || res?.platform);
      session = {
        url,
        platform: data.platform || res?.platform || "generic",
        source: "Omnify AIO",
        title: data.title || data.music?.title || "",
        options,
        meta: {
          title: data.title || data.music?.title || "",
          cover: data.cover || "",
          thumbnail: data.cover || "",
          author: data.author?.nickname || data.music?.author || null,
          authorHandle: (data.author?.uniqueId || "").replace(/^@/, "") || null,
          duration: data.stats?.durationFormatted || data.duration || null,
          views: data.stats?.playCount || null,
          likes: data.stats?.likeCount || null,
          description: data.description || null,
        },
        startedAt: Date.now(),
      };
      void style;
    }
  } catch (err) {
    console.error("[alldownloader] Omnify failed:", err.message);
  }

  // TRY 2: Rantai internal (TikTok/X/Pinterest/dll yang mati di Omnify)
  if (!session) {
    const internal = await internalResolve(url);
    if (internal?.options?.length) {
      let platformKey = "generic";
      const lower = url.toLowerCase();
      for (const key of Object.keys(PLATFORM_STYLE)) {
        if (key !== "generic" && lower.includes(key)) { platformKey = key; break; }
      }
      session = {
        url,
        platform: platformKey,
        source: internal.source,
        title: internal.meta.title || "",
        options: internal.options,
        meta: internal.meta,
        startedAt: Date.now(),
      };
    }
  }

  // Gagal semua
  if (!session) {
    await m.react("❗");
    return m.reply(novaGagal("AllDownloader"));
  }

  adlSessions.set(m.sender, session);
  setTimeout(() => adlSessions.delete(m.sender), SESSION_TIMEOUT);

  // Pilihan langsung sekalian: ".alldownloader <url> <nomor/keyword>"
  const extraWords = textRaw
    .split(/\s+/)
    .filter((w) => !w.startsWith("http") && w.toLowerCase() !== "alldownloader" && w.toLowerCase() !== "adl");
  const pick = (extraWords[0] || "").toLowerCase();
  if (pick) {
    const num = parseInt(pick, 10);
    let opt = null;
    if (!isNaN(num) && num >= 1 && num <= session.options.length) {
      opt = session.options[num - 1];
    } else if (KEYWORD_MAP[pick]) {
      const want = KEYWORD_MAP[pick];
      opt =
        session.options.find((o) => o.type === want) ||
        session.options.find((o) => (want === "video" ? o.type === "audio" : o.type === "video"));
    }
    if (opt) return runDownload(sock, m, session, opt);
  }

  // Tampilkan daftar format
  const style = platformStyle(session.platform);
  const optionLines = session.options
    .map((o, i) => `${prefix}alldownloader ${i + 1} — ${toSC(o.label)}`)
    .join("\n");
  await m.react("🐣");
  const box = bracketBox(style.icon, `${toSC("All Downloader")} — ${toSC(style.name)}`, [
    `${toSC("Link terdeteksi!")}`,
    "",
    `${toSC("Judul")}: ${String(session.title || "Tanpa judul").slice(0, 60)}`,
    "",
    `${toSC("Pilih format — ketik nomor atau keyword (hd/video/audio/foto):")}`,
    optionLines,
  ]);
  return m.reply(`${box}\n\n${tipText(`Sesi 3 menit — atau langsung sekalian: ${prefix}alldownloader <url> <nomor>`)}`);
}

export { pluginConfig as config, handler };
