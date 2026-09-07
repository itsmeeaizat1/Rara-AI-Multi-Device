// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Command: .alldl4 (alias: alldownloader4, allv4, adl4, all4)
// All Downloader V4 — engine NixDL (nixdl-5-1.vercel.app, resolver publik
// 22 platform dengan fallback chain upstream ala v3, tapi satu pintu API).
// V1/V2/V3 gak disentuh sama sekali.

import axios from "axios";
import { claraWrap, mediaCaption, novaGuide, toSC } from "../../src/lib/nova-menu-style.js";

const NIXDL_BASE = "https://nixdl-5-1.vercel.app";

const pluginConfig = {
  name: "alldownloaderv4",
  alias: ["alldl4", "alldownloader4", "allv4", "adl4", "all4"],
  category: "download",
  description: "Universal downloader v4 engine NixDL — 22 platform (YouTube, TikTok, IG, FB, X, Spotify, SoundCloud, Douyin, dll), batch multi-link",
  usage: ".alldl4 <url> — download otomatis\n.alldl4 <url1> <url2> ... — batch (max 5)\n.alldl4 platforms — daftar 22 platform",
  example: ".alldl4 https://www.tiktok.com/@xxx/video/xxx\n.alldl4 https://youtu.be/xxx\n.alldl4 https://open.spotify.com/track/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// ── 22 platform NixDL + deteksi dari hostname ──
const PLATFORMS = [
  { id: "youtube",    name: "YouTube",     icon: "▶️", host: /(?:^|\.)(?:youtube\.com|youtu\.be|music\.youtube\.com)/ },
  { id: "tiktok",     name: "TikTok",      icon: "🎵", host: /(?:^|\.)(?:tiktok\.com)$/ },
  { id: "instagram",  name: "Instagram",   icon: "📸", host: /(?:^|\.)(?:instagram\.com|instagr\.am|ddinstagram\.com)/ },
  { id: "facebook",   name: "Facebook",    icon: "👥", host: /(?:^|\.)(?:facebook\.com|fb\.watch|fb\.com)/ },
  { id: "twitter",    name: "X / Twitter", icon: "🐦", host: /(?:^|\.)(?:twitter\.com|x\.com)/ },
  { id: "pinterest",  name: "Pinterest",   icon: "📌", host: /(?:^|\.)(?:pinterest\.[a-z.]+|pin\.it)/ },
  { id: "reddit",     name: "Reddit",      icon: "👽", host: /(?:^|\.)(?:reddit\.com|redd\.it)/ },
  { id: "snapchat",   name: "Snapchat",    icon: "👻", host: /(?:^|\.)snapchat\.com/ },
  { id: "vimeo",      name: "Vimeo",       icon: "🎬", host: /(?:^|\.)vimeo\.com/ },
  { id: "streamable", name: "Streamable",  icon: "📼", host: /(?:^|\.)streamable\.com/ },
  { id: "threads",    name: "Threads",     icon: "🧵", host: /(?:^|\.)(?:threads\.net|threads\.com)/ },
  { id: "soundcloud", name: "SoundCloud",  icon: "☁️", host: /(?:^|\.)(?:soundcloud\.com|snd\.sc)/ },
  { id: "spotify",    name: "Spotify",     icon: "🟢", host: /(?:^|\.)(?:spotify\.com|spoto\.link)/ },
  { id: "bilibili",   name: "Bilibili",    icon: "📺", host: /(?:^|\.)(?:bilibili\.com|b23\.tv)/ },
  { id: "capcut",     name: "CapCut",      icon: "✂️", host: /(?:^|\.)capcut\.com/ },
  { id: "douyin",     name: "Douyin",      icon: "🎵", host: /(?:^|\.)douyin\.com/ },
  { id: "likee",      name: "Likee",       icon: "👍", host: /(?:^|\.)likee\.(?:video|in)/ },
  { id: "snackvideo", name: "SnackVideo",  icon: "🍿", host: /(?:^|\.)snackvideo\.com/ },
  { id: "rednote",    name: "RedNote / XHS", icon: "📕", host: /(?:^|\.)(?:xiaohongshu\.com|xhslink\.com)/ },
  { id: "videy",      name: "Videy",       icon: "🎥", host: /(?:^|\.)videy\.tv/ },
  { id: "cocofun",    name: "CocoFun",     icon: "🥳", host: /(?:^|\.)cocofun\.com/ },
];

function detectPlatform(url) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  return PLATFORMS.find((p) => p.host.test(host)) || null;
}

function safeName(title, ext) {
  const base = (title || "nixdl-media")
    .replace(/[\\/:*?"<>|\n\r]/g, "")
    .trim()
    .slice(0, 60) || "nixdl-media";
  return `${base}.${ext}`;
}

// ── panggil resolver NixDL ──
async function nixdlResolve(providerId, url) {
  const res = await axios.get(`${NIXDL_BASE}/api/download`, {
    params: { provider: providerId, url },
    timeout: 55000, // resolver publik lambat pas cold start
    validateStatus: () => true,
  });
  const data = res.data;
  if (!data || data.ok !== true || !Array.isArray(data.formats) || !data.formats.length) {
    throw new Error(data?.error || "NixDL gak nemu media yang bisa diunduh");
  }
  return data;
}

// pilih format terbaik: video dulu (urutan API = kualitas tertinggi duluan), sisanya audio
function pickFormat(formats) {
  const video = formats.find((f) => f?.url && /video|mp4/i.test(`${f.type} ${f.mime} ${f.url}`));
  const audio = formats.find((f) => f?.url && /audio|mp3|m4a|opus|flac/i.test(`${f.type} ${f.mime} ${f.url}`));
  return video || audio || formats.find((f) => f?.url);
}

// type media buat dikirim ke WA
function mediaType(format) {
  const t = `${format?.type || ""} ${format?.mime || ""} ${format?.url || ""}`.toLowerCase();
  if (/audio|mp3|m4a|opus|flac|wav/.test(t)) return "audio";
  if (/image|jpg|jpeg|png|webp/.test(t)) return "image";
  return "video";
}

// download file lewat proxy NixDL (/api/file) — biar link yang IP-locked
// (googlevideo dll) atau ada hotlink-protection tetap bisa diambil.
async function nixdlFetchFile(mediaUrl, filename, type) {
  const res = await axios.get(`${NIXDL_BASE}/api/file`, {
    params: { url: mediaUrl, filename, ...(type ? { type } : {}) },
    responseType: "arraybuffer",
    timeout: 120000,
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    throw new Error(`Proxy file NixDL HTTP ${res.status}`);
  }
  return Buffer.from(res.data);
}

async function sendMedia(sock, m, { buffer, type, filename, title, caption }) {
  if (type === "audio") {
    await sock.sendMessage(m.chat, {
      audio: buffer, mimetype: "audio/mpeg", ptt: false,
      fileName: filename || `${safeName(title, "mp3")}`,
    }, { quoted: m });
  } else if (type === "image") {
    await sock.sendMessage(m.chat, { image: buffer, caption: caption || undefined }, { quoted: m });
  } else {
    await sock.sendMessage(m.chat, { video: buffer, caption: caption || undefined, mimetype: "video/mp4" }, { quoted: m });
  }
}

async function handler(m, { sock, args }) {
  const first = (args[0] || "").toLowerCase();

  // guide
  if (!args.length) {
    return m.reply(
      novaGuide(
        "alldl4",
        "Universal downloader v4 — engine NixDL, 22 platform, auto-detect dari link",
        `${m.command || ".alldl4"} https://vt.tiktok.com/xxx\n${m.command || ".alldl4"} link1 link2 (batch max 5)\n${m.command || ".alldl4"} platforms`,
        "V1 .alldl / V2 .alldownloader / V3 .alldl3 tetep ada, gak diganti."
      )
    );
  }

  // daftar platform
  if (first === "platforms" || first === "list" || first === "site") {
    const lines = PLATFORMS.map((p) => `${p.icon} ${p.name} — ${p.id}`).join("\n");
    return m.reply(claraWrap("All Downloader V4 — NixDL", `22 platform didukung:\n\n${lines}`));
  }

  // kumpulin semua URL dari args (batch)
  const urls = args.filter((a) => /^https?:\/\//i.test(a)).slice(0, 5);
  if (!urls.length) {
    await m.react("❗");
    return m.reply(novaGuide("alldl4", "Link-nya gak kebaca — masukkan URL lengkap diawali http:// atau https://", `${m.command || ".alldl4"} https://vt.tiktok.com/xxx`));
  }

  await m.react("🕒");

  let ok = 0, fail = 0;
  const errors = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const progress = urls.length > 1 ? `[${i + 1}/${urls.length}] ` : "";

    try {
      const platform = detectPlatform(url);
      if (!platform) {
        throw new Error("platform link ini gak dikenal NixDL — ketik .alldl4 platforms buat lihat daftar");
      }

      // resolve
      const r = await nixdlResolve(platform.id, url);
      const format = pickFormat(r.formats);
      if (!format) throw new Error("gak ada format media yang bisa diunduh");
      const type = mediaType(format);
      const ext = type === "audio" ? "mp3" : type === "image" ? "jpg" : "mp4";
      const filename = safeName(r.title, ext);

      // cek ukuran dulu (head via proxy biar gak ngunduh file raksasa buat batas WA)
      let sizeBytes = 0;
      try {
        const head = await axios.get(`${NIXDL_BASE}/api/file`, {
          params: { url: format.url, filename },
          method: "head",
          timeout: 30000,
          validateStatus: () => true,
        });
        sizeBytes = Number(head.headers?.["content-length"]) || 0;
      } catch {}

      if (sizeBytes > 90 * 1024 * 1024) {
        throw new Error(`file kegedean buat dikirim via WA (${(sizeBytes / 1048576).toFixed(0)}MB)`);
      }

      // unduh via proxy
      const buffer = await nixdlFetchFile(format.url, filename, format.type || type);
      if (buffer.length < 1024) throw new Error("file yang diunduh gak valid");

      const cap = mediaCaption({
        platformIcon: platform.icon,
        platformName: platform.name,
        title: r.title,
        author: r.author || "",
        format: `${(format.quality || format.label || "Media").toString().slice(0, 30)}`,
        method: "NixDL v4",
      });

      await sendMedia(sock, m, { buffer, type, filename, title: r.title, caption: cap });
      ok++;
    } catch (e) {
      fail++;
      errors.push(`${progress}${(e?.message || "gagal").slice(0, 120)}`);
    }
  }

  if (urls.length > 1 && fail) {
    await m.react(fail && !ok ? "❌" : "🐣");
    return m.reply(
      claraWrap(
        "All Downloader V4",
        `Berhasil ${ok}/${urls.length} link.` + (errors.length ? `\n\nGagal:\n${errors.join("\n")}` : "")
      )
    );
  }

  if (!ok) {
    await m.react("❌");
    return m.reply(claraWrap("All Downloader V4", `Gagal: ${errors[0] || "link gak bisa diproses"}\n\nCoba ulang beberapa detik lagi (resolver publik kadang cold start), atau pakai .alldl / .alldownloader / .alldl3 sebagai alternatif.`));
  }

  await m.react("🐣");
}

export { pluginConfig as config, handler };
