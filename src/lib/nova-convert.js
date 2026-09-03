// NOVA CONVERT — Universal media converter session & format registry
// Dipakai plugin download buat nawarin convert setelah media kekirim,
// dan plugin .convert buat eksekusi konversi via ffmpeg.
import fs from "fs";
import path from "path";
import os from "os";
import { novaBox } from "./nova-menu-style.js";

const CONVERT_TTL = 10 * 60 * 1000; // 10 menit
const SESSION_DIR = path.join(os.tmpdir(), "nova-convert-sessions");

// ── Format registry ──────────────────────────────────────────────
export const AUDIO_FORMATS = {
  mp3:  { codec: "libmp3lame",        ext: "mp3",  mime: "audio/mpeg",     desc: "MP3 (universal)" },
  wav:  { codec: "pcm_s16le",         ext: "wav",  mime: "audio/wav",      desc: "WAV (uncompressed)" },
  flac: { codec: "flac",              ext: "flac", mime: "audio/flac",     desc: "FLAC (lossless)" },
  aac:  { codec: "aac",               ext: "aac",  mime: "audio/aac",      desc: "AAC (efficient)" },
  m4a:  { codec: "aac",               ext: "m4a",  mime: "audio/mp4",      desc: "M4A (Apple)" },
  ogg:  { codec: "libvorbis",         ext: "ogg",  mime: "audio/ogg",       desc: "OGG Vorbis" },
  opus: { codec: "libopus",           ext: "opus", mime: "audio/opus",     desc: "Opus (low bitrate)" },
  wma:  { codec: "wmav2",             ext: "wma",  mime: "audio/x-ms-wma", desc: "WMA (Windows)" },
  ac3:  { codec: "ac3",               ext: "ac3",  mime: "audio/ac3",      desc: "AC3 (Dolby)" },
  amr:  { codec: "libopencore_amrnb", ext: "amr",  mime: "audio/amr",      desc: "AMR (mobile)" },
  aiff: { codec: "pcm_s16le",         ext: "aiff", mime: "audio/aiff",     desc: "AIFF (Apple)" },
  au:   { codec: "pcm_s16le",         ext: "au",   mime: "audio/basic",   desc: "AU (Sun)" },
};

export const VIDEO_FORMATS = {
  mp4:  { codec: "libx264",    ext: "mp4",  mime: "video/mp4",        audio: "aac",       desc: "MP4 (universal)", extra: "-preset fast -crf 23" },
  mkv:  { codec: "libx264",    ext: "mkv",  mime: "video/x-matroska", audio: "aac",       desc: "MKV (Matroska)",  extra: "-preset fast -crf 23" },
  avi:  { codec: "mpeg4",      ext: "avi",  mime: "video/x-msvideo",  audio: "mp3",       desc: "AVI (legacy)",     extra: "-q:v 5" },
  mov:  { codec: "libx264",    ext: "mov",  mime: "video/quicktime",   audio: "aac",       desc: "MOV (QuickTime)", extra: "-preset fast -crf 23" },
  webm: { codec: "libvpx",     ext: "webm", mime: "video/webm",       audio: "libvorbis", desc: "WebM (web)",      extra: "-b:v 1M -b:a 128k" },
  flv:  { codec: "libx264",    ext: "flv",  mime: "video/x-flv",       audio: "aac",       desc: "FLV (Flash)",     extra: "-preset fast -crf 23" },
  "3gp":{ codec: "libx264",    ext: "3gp",  mime: "video/3gpp",        audio: "aac",       desc: "3GP (mobile)",    extra: "-s 320x240 -b:v 200k" },
  wmv:  { codec: "wmv2",       ext: "wmv",  mime: "video/x-ms-wmv",   audio: "wmav2",     desc: "WMV (Windows)",   extra: "-b:v 1M" },
  mpeg: { codec: "mpeg1video", ext: "mpeg", mime: "video/mpeg",        audio: "mp2",       desc: "MPEG (VCD)",      extra: "-q:v 5" },
  m4v:  { codec: "libx264",    ext: "m4v",  mime: "video/x-m4v",       audio: "aac",       desc: "M4V (Apple)",     extra: "-preset fast -crf 23" },
  ts:   { codec: "libx264",    ext: "ts",   mime: "video/mp2t",        audio: "aac",       desc: "TS (broadcast)",  extra: "-preset fast -crf 23" },
  ogv:  { codec: "libtheora",  ext: "ogv",  mime: "video/ogg",        audio: "libvorbis", desc: "OGV (Ogg)",       extra: "-b:v 1M" },
  gif:  { codec: "gif",        ext: "gif",  mime: "image/gif",        audio: "",           desc: "GIF (no audio)",  extra: "-s 480x320 -r 12" },
};

export const IMAGE_FORMATS = {
  jpg:  { desc: "JPG (universal)" },
  png:  { desc: "PNG (transparan)" },
  webp: { desc: "WebP (ringan)" },
};

const AUDIO_KEYS = Object.keys(AUDIO_FORMATS).join(", ");
const VIDEO_KEYS = Object.keys(VIDEO_FORMATS).join(", ");

// ── Session store ────────────────────────────────────────────────
// Key: `${chat}|${sender}` → media terakhir yang diunduh di chat itu.
const sessions = new Map();

function sessionKey(m) {
  return `${m.chat || m.key?.remoteJid || m.sender}|${m.sender || m.key?.participant || ""}`;
}

function cleanupSessionFile(session) {
  if (session?.filePath && fs.existsSync(session.filePath)) {
    try { fs.unlinkSync(session.filePath); } catch {}
  }
}

export function setConvertSession(m, data) {
  const key = sessionKey(m);
  const old = sessions.get(key);
  if (old?.timer) clearTimeout(old.timer);
  cleanupSessionFile(old); // file lama dibuang, diganti media terbaru

  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  let filePath = null;
  if (data.buffer) {
    filePath = path.join(SESSION_DIR, `src_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    fs.writeFileSync(filePath, data.buffer);
  }

  const session = {
    filePath,
    mediaUrl: data.buffer ? null : data.mediaUrl,
    type: data.type || "video",
    platform: data.platform || "Media",
    title: data.title || "",
    sourceUrl: data.sourceUrl || "",
    startedAt: Date.now(),
    timer: null,
  };
  session.timer = setTimeout(() => {
    cleanupSessionFile(session);
    sessions.delete(key);
  }, CONVERT_TTL);
  if (typeof session.timer.unref === "function") session.timer.unref();
  sessions.set(key, session);
  return session;
}

export function getConvertSession(m) {
  const key = sessionKey(m);
  const s = sessions.get(key);
  if (!s) return null;
  if (Date.now() - s.startedAt > CONVERT_TTL) {
    cleanupSessionFile(s);
    sessions.delete(key);
    return null;
  }
  return s;
}

// ── Offer message ────────────────────────────────────────────────
// Dipanggil plugin download SETELAH media terkirim.
// mediaUrl = link CDN langsung (bisa di-download ulang), ATAU
// buffer = media yang barusan diunduh (disimpan ke temp file).
export async function offerConvert(sock, m, { mediaUrl, buffer, type = "video", platform = "Media", title = "", sourceUrl = "" }) {
  try {
    setConvertSession(m, { mediaUrl, buffer, type, platform, title, sourceUrl });

    // Copy sesuai request owner: "Apakah kakak ingin mengconvert file ini?"
    const lines = [
      "Apakah kakak ingin mengconvert",
      "file ini ke yang lain? 🤔",
      "",
      { sub: "Daftar Convert" },
    ];
    if (type === "audio") {
      lines.push(
        { sub: "Audio" },
        "mp3, aac, m4a, wav, flac,",
        "ogg, opus, wma, ac3, amr, dll",
      );
    } else {
      lines.push(
        { sub: "Audio" },
        "mp3, aac, m4a, wav, dll",
        "",
        { sub: "Video" },
        "mp4, mpg, mpeg, avi, mkv,",
        "mov, webm, 3gp, gif, dll",
      );
    }
    lines.push(
      "",
      "Balas file di atas dengan",
      "format yang mau, contoh:",
      `${".convert mp3"} (audio)`,
      ...(type === "audio" ? [] : [`${".convert avi"} (video)`]),
      "",
      "Session aktif 10 menit — yang",
      "diconvert media terakhir kamu unduh.",
    );
    const msg = novaBox("Convert", lines);
    await sock.sendMessage(m.chat, { text: msg }, { quoted: m });
  } catch (e) {
    console.error("[nova-convert] offerConvert error:", e.message);
  }
}
