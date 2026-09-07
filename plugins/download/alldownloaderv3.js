// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/download/alldownloaderv3.js — ALLDOWNLOADER V3 (MORI-STYLE)
//
// Referensi arsitektur: github.com/coflyn/Mori — client-side downloader
// 14 platform dengan multi-engine fallback. Di-port ke Nova:
//   (1) Platform matrix — deteksi platform dari URL
//   (2) Multi-engine fallback — tiap platform punya RANTAI engine:
//       scraper spesifik repo → engine direct baru (pixiv/bandcamp) →
//       haidarAio → ikyyAio → omnify/valore. Engine pertama yang
//       berhasil dipakai, sisanya dilewati. Winner dilapor di caption.
//   (3) Batch multi-link — paste beberapa link sekaligus (max 5),
//       diproses berurutan dengan progress [1/N].
//   (4) Engine BARU direct tanpa API key (ala Mori): Pixiv AJAX
//       (image/multi-page/ugoira→mp4) + Bandcamp scrape (track/album).
//       Bilibili diriset — API-nya nolak dari server (412 anti-bot).
//
// Command: .alldl3 (alias: alldownloader3, allv3, adl3, all3)
// V1 (.alldl/.dl) & V2 (.alldownloader/.alldl2) gak disentuh.

import axios from "axios";
import { mkdtemp, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ttdown from "../../src/scraper/tiktok.js";
import { igDownload } from "../../src/scraper/ig.js";
import x2twitterDl from "../../src/scraper/twitter.js";
import { RedNoteDL } from "../../src/scraper/rednote.js";
import { DouyinDL } from "../../src/scraper/douyin.js";
import { snaptikDouyin } from "../../src/scraper/snaptik-douyin.js";
import { PinDL } from "../../src/scraper/pindl.js";
import { scdl } from "../../src/scraper/soundclouddl.js";
import { omnifyResolve } from "../../src/scraper/omnify-aio.js";
import { valoreResolve } from "../../src/scraper/valore-dl.js";
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import { haidarAio } from "../../src/lib/nova-haidar.js";
import { pixivDownload, pixivUgoiraToMp4 } from "../../src/scraper/pixiv.js";
import { bandcampDownload } from "../../src/scraper/bandcamp.js";
import { claraWrap, mediaCaption, novaGuide, toSC } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alldownloaderv3",
  alias: ["alldl3", "alldownloader3", "allv3", "adl3", "all3"],
  category: "download",
  description: "Universal downloader v3 ala Mori — 14 platform, multi-engine fallback (report engine winner), batch multi-link, engine direct Pixiv + Bandcamp",
  usage: ".alldl3 <url> — download otomatis (format terbaik)\n.alldl3 <url1> <url2> ... — batch multi-link (max 5)\n.alldl3 engines — daftar platform + engine chain",
  example: ".alldl3 https://www.pixiv.net/artworks/99172382\n.alldl3 https://music.monstercat.com/track/crab-rave\n.alldl3 https://vt.tiktok.com/xxx https://www.instagram.com/reel/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// ═══════════════════════════════════════════════
// PLATFORM MATRIX (14 platform ala Mori)
// ═══════════════════════════════════════════════

const PLATFORMS = {
  youtube:     { icon: "▶️", name: "YouTube",      match: (u) => /(?:^|\.)(?:youtube\.com|youtu\.be|music\.youtube\.com)/.test(u) },
  tiktok:      { icon: "🎵", name: "TikTok",       match: (u) => /(?:^|\.)(?:tiktok\.com)|vt\.tiktok\.com/.test(u) },
  douyin:      { icon: "🎵", name: "Douyin",       match: (u) => /(?:^|\.)douyin\.com/.test(u) },
  instagram:   { icon: "📸", name: "Instagram",    match: (u) => /(?:^|\.)instagram\.com/.test(u) },
  facebook:    { icon: "👥", name: "Facebook",     match: (u) => /(?:^|\.)(?:facebook\.com|fb\.watch)/.test(u) },
  twitter:     { icon: "🐦", name: "Twitter/X",    match: (u) => /(?:^|\.)(?:twitter\.com|x\.com)/.test(u) },
  threads:     { icon: "🧵", name: "Threads",      match: (u) => /(?:^|\.)threads\.net/.test(u) },
  spotify:     { icon: "🟢", name: "Spotify",      match: (u) => /(?:^|\.)spotify\.com/.test(u) },
  applemusic:  { icon: "🍎", name: "Apple Music", match: (u) => /(?:^|\.)music\.apple\.com/.test(u) },
  soundcloud:  { icon: "☁️", name: "SoundCloud",   match: (u) => /(?:^|\.)soundcloud\.com/.test(u) },
  pinterest:   { icon: "📌", name: "Pinterest",    match: (u) => /(?:^|\.)pinterest\.[a-z.]+|pin\.it/.test(u) },
  rednote:     { icon: "📕", name: "RedNote/XHS", match: (u) => /(?:^|\.)(?:xiaohongshu\.com|xhslink\.com|rednote\.com)/.test(u) },
  pixiv:       { icon: "🎨", name: "Pixiv",        match: (u) => /(?:^|\.)pixiv\.net/.test(u) },
  // Bandcamp match: /track/ atau /album/ di domain APAPUN — banyak band
  // pakai custom domain bandcamp-pro (mis. music.monstercat.com). Dicek
  // PALING AKHIR di detectPlatform biar platform lain gak ke-sangkut.
  bandcamp:    { icon: "🎸", name: "Bandcamp",     match: (u) => /\/(?:track|album)\//.test(u) },
};

function detectPlatform(url) {
  for (const key of ["pixiv", "rednote", "douyin", "tiktok", "instagram", "facebook", "twitter", "threads", "spotify", "applemusic", "soundcloud", "pinterest", "youtube", "bandcamp"]) {
    if (PLATFORMS[key].match(url)) return key;
  }
  return "generic";
}

// ═══════════════════════════════════════════════
// ENGINE ADAPTERS — semua return bentuk uniform:
//   { kind, title, author, thumb, medias: [{url, type, quality, ...}] }
// kind: "video" | "audio" | "image" | "album" | "pixivimages" | "ugoira"
// ═══════════════════════════════════════════════

const ENGINES = {
  // ── Engine direct baru ala Mori ──
  pixivDirect: {
    name: "Nova Pixiv Direct",
    fn: async (url) => {
      const r = await pixivDownload(url);
      return {
        kind: r.type === "ugoira" ? "ugoira" : "pixivimages",
        title: r.title, author: r.author, thumb: r.art, pixiv: r,
      };
    },
  },
  bandcampDirect: {
    name: "Nova Bandcamp Direct",
    fn: async (url) => {
      const r = await bandcampDownload(url);
      return {
        kind: r.type === "album" ? "album" : "audio",
        title: r.album, author: r.tracks[0]?.artist, thumb: r.art,
        medias: r.tracks.map((t) => ({
          url: t.url, type: "audio", quality: "MP3 128kbps", title: t.title, duration: t.duration,
        })),
      };
    },
  },

  // ── Scraper spesifik repo ──
  tiktokYuu: {
    name: "YuuLabs TikTok",
    fn: async (url) => {
      const r = await ttdown(url);
      const medias = (r.downloads || []).filter((d) => d?.url).map((d) => ({
        url: d.url,
        type: d.type === "mp3" ? "audio" : "video",
        quality: d.type === "nowatermark_hd" ? "HD NoWM" : d.type === "nowatermark" ? "NoWM" : "MP3",
      }));
      if (!medias.length) throw new Error("yuu kosong");
      return { kind: medias.find((m) => m.type === "video") ? "video" : "audio", title: r.title, author: r.author?.username, thumb: r.cover, medias: [medias.find((m) => m.type === "video") || medias[0]] };
    },
  },
  igNovav1: {
    name: "Nova IG v1",
    fn: async (url) => {
      const r = await igDownload(url);
      const list = Array.isArray(r) ? r : [r];
      const medias = [];
      for (const item of list) {
        for (const m of item.media || []) {
          if (m?.url && m.url !== "-") {
            medias.push({ url: m.url, type: m.type === "image" ? "image" : "video", quality: "Original" });
          }
        }
      }
      if (!medias.length) throw new Error("ig kosong");
      const kind = medias.some((m) => m.type === "video") ? "video" : "image";
      return { kind, title: (list[0] || {}).title, author: (list[0] || {}).username, thumb: (list[0] || {}).thumbnail, medias: medias.slice(0, 10) };
    },
  },
  x2twitter: {
    name: "x2twitter",
    fn: async (url) => {
      const r = await x2twitterDl(url);
      if (r?.error) throw new Error(r.message || "x2twitter gagal");
      const flat = [];
      for (const m of r.medias || r.downloads || []) {
        if (m?.url) flat.push({ url: m.url, type: (m.type || "video").toLowerCase(), quality: m.quality || "HD" });
        else if (typeof m === "string") flat.push({ url: m, type: "video", quality: "HD" });
      }
      if (!flat.length) throw new Error("x2twitter kosong");
      return { kind: "video", title: r.title, author: r.author?.username || r.author, thumb: r.cover, medias: [flat[0]] };
    },
  },
  rednoteDirect: {
    name: "RedNote DL",
    fn: async (url) => {
      const r = await RedNoteDL(url);
      if (r?.status !== true) throw new Error(r?.error || "rednote gagal");
      const medias = (r.results || []).map((u) => ({ url: u, type: r.type === "video" ? "video" : "image", quality: "Original" }));
      if (!medias.length) throw new Error("rednote kosong");
      return { kind: r.type === "video" ? "video" : "image", title: r.title, author: r.author, medias };
    },
  },
  douyinDirect: {
    name: "Douyin DL",
    fn: async (url) => {
      const r = await DouyinDL(url);
      if (r?.status !== true) throw new Error(r?.error || "douyin gagal");
      const medias = [];
      if (r.video) medias.push({ url: r.video, type: "video", quality: "NoWM" });
      if (r.audio) medias.push({ url: r.audio, type: "audio", quality: "MP3" });
      if (!medias.length) throw new Error("douyin kosong");
      return { kind: medias[0].type, title: r.title, author: r.author || null, medias: [medias[0]] };
    },
  },
  snaptikDy: {
    name: "SnapTik Douyin",
    fn: async (url) => {
      const r = await snaptikDouyin(url);
      const u = r?.url || r?.medias?.[0]?.url || r?.video || r?.download;
      if (!u) throw new Error("snaptik douyin kosong");
      return { kind: "video", title: r.title, author: r.author, thumb: r.cover || r.thumb, medias: [{ url: u, type: "video", quality: "NoWM" }] };
    },
  },
  pinDl: {
    name: "PinDL",
    fn: async (url) => {
      const r = await PinDL(url);
      if (!r?.media?.length) throw new Error("pindl kosong");
      const medias = r.media.map((m) => ({ url: m.url, type: m.type, quality: m.quality || "Original" }));
      return { kind: medias[0].type, title: r.title, author: r.author, thumb: r.thumb, medias: medias.slice(0, 10) };
    },
  },
  soundcloudDl: {
    name: "SoundCloud DL",
    fn: async (url) => {
      const r = await scdl(url);
      const u = r?.url || r?.medias?.[0]?.url || r?.download || (typeof r === "string" ? r : null);
      if (!u) throw new Error("soundcloud kosong");
      return { kind: "audio", title: r?.title, author: r?.author, thumb: r?.thumb || r?.artwork, medias: [{ url: u, type: "audio", quality: "MP3" }] };
    },
  },

  // ── Universal chain ──
  haidar: {
    name: "Haidar AIO",
    fn: async (url) => {
      const r = await haidarAio(url);
      if (!r?.medias?.length) throw new Error("haidar kosong");
      return { kind: pickBest(r.medias).type, title: r.title, author: null, medias: r.medias };
    },
  },
  ikyy: {
    name: "IkyyXD",
    fn: async (url) => {
      const r = await ikyyAio(url);
      const medias = (r?.medias || []).map((m) => ({ url: m.url, type: (m.type || "video").toLowerCase(), quality: m.quality || "Original" }));
      if (!medias.length) throw new Error("ikyy kosong");
      return { kind: pickBest(medias).type, title: r?.title, author: r?.author, medias };
    },
  },
  omnify: {
    name: "Omnify AIO",
    fn: async (url) => {
      const r = await omnifyResolve(url);
      const arr = Array.isArray(r) ? r : r?.medias || r?.result || [];
      const medias = arr.map((m) => ({
        url: m.url || m.Result_url || m.link,
        type: String(m.type || m.Type || "video").toLowerCase(),
        quality: m.quality || m.Quality || "Original",
      })).filter((m) => m.url);
      if (!medias.length) throw new Error("omnify kosong");
      return { kind: pickBest(medias).type, title: (Array.isArray(r) ? null : r?.title), author: null, medias };
    },
  },
  valore: {
    name: "Valore DL",
    fn: async (url) => {
      const r = await valoreResolve(url);
      const arr = Array.isArray(r) ? r : r?.medias || [];
      const medias = arr.map((m) => ({ url: m.url || m.link, type: (m.type || "video").toLowerCase(), quality: m.quality || "Original" })).filter((m) => m.url);
      if (!medias.length) throw new Error("valore kosong");
      return { kind: pickBest(medias).type, title: (Array.isArray(r) ? null : r?.title), author: null, medias };
    },
  },
};

function pickBest(medias) {
  const vids = (medias || []).filter((m) => m.type === "video");
  if (vids.length) {
    const score = (q) => {
      const s = String(q || "");
      const num = s.match(/(\d{3,4})p/);
      if (num) return parseInt(num[1]);
      if (/hd|720|1080/i.test(s)) return 720;
      return 360;
    };
    return vids.sort((a, b) => score(b.quality) - score(a.quality))[0];
  }
  return (medias || []).find((m) => m.type === "audio") || (medias || []).find((m) => m.type === "image") || (medias || [])[0];
}

// ── Platform → engine chain (Mori: multi-engine fallback) ──
const CHAINS = {
  pixiv:      ["pixivDirect"],
  bandcamp:   ["bandcampDirect", "haidar", "ikyy", "omnify", "valore"],
  tiktok:     ["tiktokYuu", "haidar", "ikyy"],
  douyin:     ["douyinDirect", "snaptikDy", "haidar"],
  instagram:  ["igNovav1", "haidar", "ikyy"],
  facebook:   ["haidar", "ikyy", "omnify"],
  twitter:    ["x2twitter", "haidar", "ikyy"],
  threads:    ["haidar", "ikyy", "omnify"],
  spotify:    ["haidar", "ikyy"],
  applemusic: ["haidar", "ikyy"],
  soundcloud: ["soundcloudDl", "haidar", "ikyy"],
  pinterest:  ["pinDl", "haidar"],
  rednote:    ["rednoteDirect", "haidar"],
  youtube:    ["haidar", "ikyy", "omnify"],
  generic:    ["haidar", "ikyy", "omnify", "valore"],
};

// ═══════════════════════════════════════════════
// DOWNLOAD + SEND
// ═══════════════════════════════════════════════

const MAX_BATCH = 5;
const MAX_SIZE = 95 * 1024 * 1024; // 95 MB
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function downloadBuffer(url, headers = {}) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: MAX_SIZE,
    headers: { "User-Agent": UA, ...headers },
  });
  return Buffer.from(res.data);
}

function safeName(s) {
  return String(s || "download").replace(/[\\/:*?"<>|\n]+/g, " ").trim().slice(0, 60) || "download";
}

async function sendMedia(sock, m, { buffer, type, title, caption }) {
  if (type === "audio") {
    await sock.sendMessage(m.chat, {
      audio: buffer, mimetype: "audio/mpeg", ptt: false,
      fileName: `${safeName(title)}.mp3`,
    }, { quoted: m });
  } else if (type === "image") {
    await sock.sendMessage(m.chat, { image: buffer, caption: caption || undefined }, { quoted: m });
  } else {
    await sock.sendMessage(m.chat, { video: buffer, caption: caption || undefined, mimetype: "video/mp4" }, { quoted: m });
  }
}

// ── Pixiv: perlu Referer pximg + ugoira zip→mp4 ──
async function handlePixiv(sock, m, platform, r, progressLabel) {
  const cap = mediaCaption({
    platformIcon: platform.icon,
    platformName: platform.name,
    title: r.title,
    author: r.author,
    authorHandle: r.pixiv.authorHandle,
    format: r.kind === "ugoira" ? "🎞️ UGOIRA → MP4" : `🖼️ Image ×${r.pixiv.urls.length}`,
    method: "Nova Pixiv Direct",
  });
  await m.reply((progressLabel ? progressLabel + "\n" : "") + cap);

  if (r.kind === "ugoira") {
    const dir = await mkdtemp(join(tmpdir(), "nova-pixiv-"));
    try {
      const out = join(dir, "ugoira.mp4");
      await pixivUgoiraToMp4(r.pixiv.zipUrl, r.pixiv.frames, out, dir);
      const buffer = await readFile(out);
      await sendMedia(sock, m, { buffer, type: "video", title: r.title, caption: `🎞️ ${r.title}` });
    } finally {
      rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    return;
  }

  const urls = r.pixiv.urls.slice(0, 10);
  for (let i = 0; i < urls.length; i++) {
    try {
      const buf = await downloadBuffer(urls[i], { Referer: "https://www.pixiv.net/" });
      await sendMedia(sock, m, {
        buffer: buf, type: "image", title: r.title,
        caption: urls.length > 1 ? `🖼️ ${r.title} (${i + 1}/${urls.length})` : null,
      });
    } catch (e) {
      console.error("[alldl3] pixiv page fail:", e.message);
    }
  }
}

// ── Bandcamp album: kirim max 5 track ──
async function handleBandcamp(sock, m, platform, r, progressLabel) {
  const tracks = r.medias.slice(0, 5);
  const cap = mediaCaption({
    platformIcon: platform.icon,
    platformName: platform.name,
    title: r.title,
    author: r.author,
    format: r.kind === "album" ? `🎶 MP3 128kbps — ${r.medias.length} track, kirim ${tracks.length} pertama` : "🎶 MP3 128kbps",
    method: "Nova Bandcamp Direct",
  });
  await m.reply((progressLabel ? progressLabel + "\n" : "") + cap);

  for (const t of tracks) {
    try {
      const buf = await downloadBuffer(t.url);
      await sock.sendMessage(m.chat, {
        audio: buf, mimetype: "audio/mpeg", ptt: false,
        fileName: `${safeName(t.title || r.title)}.mp3`,
      }, { quoted: m });
    } catch (e) {
      console.error("[alldl3] bandcamp track fail:", e.message);
    }
  }
}

// ── Resolve satu URL lewat engine chain ──
async function resolveUrl(url, platformKey) {
  const chain = CHAINS[platformKey] || CHAINS.generic;
  const errors = [];
  for (const key of chain) {
    const engine = ENGINES[key];
    try {
      const r = await engine.fn(url);
      if (!r || (!r.medias?.length && !["ugoira", "pixivimages", "album"].includes(r.kind))) {
        throw new Error("hasil kosong");
      }
      return { result: r, engine: engine.name };
    } catch (e) {
      errors.push(`${engine.name}: ${String(e.message || e).slice(0, 60)}`);
    }
  }
  throw new Error(errors.join(" | ") || "semua engine gagal");
}

// ═══════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════

function extractUrls(text) {
  return String(text || "").match(/https?:\/\/[^\s]+/gi) || [];
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();

  // .alldl3 engines — daftar platform + engine chain
  if (sub === "engines" || sub === "platforms") {
    const body = [];
    body.push("Multi-engine fallback: engine pertama yang sukses dipakai — winner dilapor di caption hasil.");
    body.push("");
    body.push("「 ✦ ᴇɴɢɪɴᴇ ᴄʜᴀɪɴ ᴘᴇʀ ᴘʟᴀᴛꜰᴏʀᴍ ✦ 」");
    for (const [key, chain] of Object.entries(CHAINS)) {
      const p = PLATFORMS[key] || { icon: "🌐", name: "Generic/Lainnya" };
      body.push(`${p.icon} ${toSC(p.name)} — ${chain.map((c) => ENGINES[c].name).join(" → ")}`);
    }
    body.push("");
    body.push(`Batch: tempel beberapa link sekaligus (maks ${MAX_BATCH}).`);
    await m.reply(claraWrap("Downloader V3", body));
    await m.react("🐣");
    return true;
  }

  const urls = extractUrls(m.text || args.join(" "));
  if (!urls.length) {
    await m.reply(novaGuide("alldl3", "Universal downloader v3 ala Mori — 14 platform, multi-engine fallback, batch multi-link.", ".alldl3 <url>", `Tempel beberapa link sekaligus untuk batch (maks ${MAX_BATCH}). Lihat .alldl3 engines`));
    await m.react("❗");
    return true;
  }

  await m.react("🕒");
  const batch = urls.slice(0, MAX_BATCH);
  const skipped = urls.length - batch.length;
  let okCount = 0;
  const failLogs = [];

  for (let i = 0; i < batch.length; i++) {
    const url = batch[i];
    const progressLabel = batch.length > 1 ? `📥 [${i + 1}/${batch.length}]` : null;
    try {
      const platformKey = detectPlatform(url);
      const platform = PLATFORMS[platformKey] || { icon: "🌐", name: "Lainnya" };
      const { result: r, engine } = await resolveUrl(url, platformKey);

      // Pixiv & Bandcamp punya alur khusus
      if (r.kind === "pixivimages" || r.kind === "ugoira") {
        await handlePixiv(sock, m, platform, r, progressLabel);
        okCount++;
        continue;
      }
      if (r.kind === "album") {
        await handleBandcamp(sock, m, platform, r, progressLabel);
        okCount++;
        continue;
      }

      const best = pickBest(r.medias);
      const buffer = await downloadBuffer(best.url, /pximg\.net/.test(best.url) ? { Referer: "https://www.pixiv.net/" } : {});
      if (!buffer?.length) throw new Error("file kosong");

      const cap = mediaCaption({
        platformIcon: platform.icon,
        platformName: platform.name,
        title: r.title || "Download",
        author: r.author || null,
        format: best.type === "audio" ? "🎶 MP3" : best.type === "image" ? "🖼️ Image" : `🎬 ${best.quality || "Video"}`,
        method: engine,
      });
      if (progressLabel) await m.reply(progressLabel);
      await sendMedia(sock, m, { buffer, type: best.type, title: best.title || r.title, caption: cap });
      okCount++;
    } catch (e) {
      failLogs.push(`[${i + 1}] ${String(e.message || e).slice(0, 140)}`);
      console.error("[alldl3] fail:", url, e.message);
    }
  }

  if (okCount === 0) {
    await m.reply(claraWrap("Downloader V3", [
      "❌ Semua link gagal — semua engine di chain udah dicoba.",
      "",
      ...failLogs.map((l) => l.slice(0, 160)),
    ], "error"));
    await m.react("❌");
    return true;
  }

  const body = [];
  body.push(`✅ Berhasil: ${okCount}/${batch.length} link` + (skipped ? ` (skip ${skipped} link di atas limit ${MAX_BATCH})` : ""));
  if (failLogs.length) {
    body.push("");
    body.push("「 ✦ ʏᴀɴɢ ɢᴀɢᴀʟ ✦ 」");
    for (const l of failLogs) body.push("❌ " + l);
  }
  if (batch.length > 1 || failLogs.length || skipped) {
    await m.reply(claraWrap("Downloader V3", body, "success"));
  }
  await m.react("🐣");
  return true;
}

export { pluginConfig, handler };
export default { pluginConfig, handler };
