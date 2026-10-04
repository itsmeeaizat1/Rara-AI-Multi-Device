// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-media-result.js — KARTU HASIL DOWNLOAD berkelompok (3 Okt 2026, request owner:
// "tambah field lengkap di tiap fitur, contoh aio: size, format, duration kalau audio/video,
// date time dll"). Desain lama 「 ✦ Judul ✦ 」, teks biasa, label rata, bullet •.
//
// PRINSIP: field HANYA tampil kalau datanya benar-benar diketahui. Tidak ada angka karangan.
// Sumber data:
//   - scraper  : judul, pembuat, durasi, tanggal unggah, views, likes, kualitas
//   - HEAD URL : ukuran (content-length), format file (content-type), tanggal server (last-modified)
// HEAD ringan (tanpa unduh), timeout pendek, gagal = diam (field dilewati).
//
//   const info = await probeMedia(url);               // { size, mime, lastModified } | {}
//   const card = mediaResultCard({ header: "AIO", title, type: "video", ...info, duration, ... });

const HEAD_TIMEOUT_MS = 6000;

// ── formatter ────────────────────────────────────────────────────────────
export function fmtSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// detik ATAU string ("3:21", "00:03:21", "PT3M21S") -> "03:21" / "1:02:03". Tak dikenal -> "".
export function fmtDur(input) {
  if (input === null || input === undefined || input === "") return "";
  let sec = null;
  if (typeof input === "number" && Number.isFinite(input)) sec = input;
  else {
    const t = String(input).trim();
    if (/^\d+(\.\d+)?$/.test(t)) sec = Number(t);
    else if (/^\d{1,2}(:\d{2}){1,2}$/.test(t)) {
      const p = t.split(":").map(Number);
      sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    } else {
      const iso = t.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
      if (iso) sec = (+iso[1] || 0) * 3600 + (+iso[2] || 0) * 60 + (+iso[3] || 0);
    }
  }
  if (sec === null || !(sec > 0)) return "";
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
// tanggal (Date | ms | detik | "YYYYMMDD" | ISO | string Date) -> "02 Okt 2026" (WIB). Tak valid -> "".
export function fmtDate(input, withTime = false) {
  if (input === null || input === undefined || input === "") return "";
  let d;
  if (input instanceof Date) d = input;
  else if (typeof input === "number") d = new Date(input < 1e11 ? input * 1000 : input);
  else {
    const t = String(input).trim();
    if (/^\d{8}$/.test(t)) d = new Date(`${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T00:00:00+07:00`);
    else if (/^\d{9,13}$/.test(t)) d = new Date(Number(t) < 1e11 ? Number(t) * 1000 : Number(t));
    else d = new Date(t);
  }
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  if (d.getFullYear() < 2000 || d.getTime() > Date.now() + 86400000 * 2) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d).reduce((a, p) => ((a[p.type] = p.value), a), {});
  const base = `${parts.day} ${BULAN[Number(parts.month) - 1]} ${parts.year}`;
  return withTime ? `${base}, ${parts.hour}:${parts.minute} WIB` : base;
}

// angka besar -> "1,2 jt" / "45 rb" (gaya id). Non-angka dikembalikan apa adanya kalau sudah string pendek.
export function fmtCount(input) {
  if (input === null || input === undefined || input === "") return "";
  const raw = String(input).trim();
  const n = Number(raw.replace(/[.,\s]/g, ""));
  if (!/^[\d.,\s]+$/.test(raw) || !Number.isFinite(n)) return raw.length <= 14 ? raw : "";
  if (n <= 0) return ""; // 0 dari scraper = "tidak ada data", bukan "nol penonton" — jangan menyesatkan
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(".", ",")} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} jt`;
  if (n >= 1e4) return `${Math.round(n / 1e3)} rb`;
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// content-type / ekstensi -> { type, format }
const MIME_FORMAT = {
  "video/mp4": ["video", "MP4"], "video/webm": ["video", "WEBM"], "video/quicktime": ["video", "MOV"],
  "video/x-matroska": ["video", "MKV"], "video/3gpp": ["video", "3GP"],
  "audio/mpeg": ["audio", "MP3"], "audio/mp3": ["audio", "MP3"], "audio/mp4": ["audio", "M4A"],
  "audio/x-m4a": ["audio", "M4A"], "audio/aac": ["audio", "AAC"], "audio/ogg": ["audio", "OGG"],
  "audio/opus": ["audio", "OPUS"], "audio/wav": ["audio", "WAV"], "audio/x-wav": ["audio", "WAV"],
  "audio/webm": ["audio", "WEBM"], "audio/flac": ["audio", "FLAC"],
  "image/jpeg": ["foto", "JPEG"], "image/png": ["foto", "PNG"], "image/webp": ["foto", "WEBP"],
  "image/gif": ["gif", "GIF"], "application/pdf": ["dokumen", "PDF"], "application/zip": ["arsip", "ZIP"],
  "application/vnd.android.package-archive": ["aplikasi", "APK"],
};
const EXT_FORMAT = {
  mp4: ["video", "MP4"], webm: ["video", "WEBM"], mov: ["video", "MOV"], mkv: ["video", "MKV"], "3gp": ["video", "3GP"],
  mp3: ["audio", "MP3"], m4a: ["audio", "M4A"], aac: ["audio", "AAC"], ogg: ["audio", "OGG"], opus: ["audio", "OPUS"],
  wav: ["audio", "WAV"], flac: ["audio", "FLAC"],
  jpg: ["foto", "JPEG"], jpeg: ["foto", "JPEG"], png: ["foto", "PNG"], webp: ["foto", "WEBP"], gif: ["gif", "GIF"],
  pdf: ["dokumen", "PDF"], zip: ["arsip", "ZIP"], apk: ["aplikasi", "APK"],
};
export function detectFormat({ mime = "", ext = "", url = "" } = {}) {
  const m = String(mime).split(";")[0].trim().toLowerCase();
  if (MIME_FORMAT[m]) return { type: MIME_FORMAT[m][0], format: MIME_FORMAT[m][1] };
  let e = String(ext || "").replace(/^\./, "").toLowerCase();
  if (!e && url) { try { e = new URL(url).pathname.split(".").pop().toLowerCase(); } catch { /* skip */ } }
  if (EXT_FORMAT[e]) return { type: EXT_FORMAT[e][0], format: EXT_FORMAT[e][1] };
  return { type: "", format: "" };
}

// ── probe HEAD (ringan, tanpa unduh) ──────────────────────────────────────
// Balik {} kalau gagal/host menolak — pemanggil cukup lewati field. Tidak pernah throw.
export async function probeMedia(url, { timeoutMs = HEAD_TIMEOUT_MS, fetchFn = globalThis.fetch } = {}) {
  try {
    if (!/^https?:\/\//i.test(String(url || "")) || typeof fetchFn !== "function") return {};
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, {
        method: "HEAD", redirect: "follow", signal: ctl.signal,
        headers: { "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" },
      });
      if (!res || !res.ok) return {};
      const h = (k) => (res.headers && typeof res.headers.get === "function" ? res.headers.get(k) : null);
      const size = Number(h("content-length"));
      const out = {};
      if (Number.isFinite(size) && size > 0) out.size = size;
      const mime = h("content-type");
      if (mime && !/text\/html|application\/json|octet-stream/i.test(mime)) out.mime = mime;
      const lm = h("last-modified");
      if (lm && fmtDate(lm)) out.lastModified = lm;
      return out;
    } finally { clearTimeout(to); }
  } catch { return {}; }
}

// ── probe BUFFER (AI & fitur hasil-generasi, 4 Okt 2026) ──────────────────
// Buffer hasil AI: ukuran PASTI (bukan HEAD), dimensi via sharp (gambar),
// durasi via ffprobe (audio/video, file temp, timeout). Best-effort, tidak pernah throw.
const FFPROBE_TIMEOUT_MS = 6000;
async function ffprobeDuration(buf) {
  let tmp = "";
  try {
    const { writeFile, unlink } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    tmp = join(tmpdir(), `rara-probe-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await writeFile(tmp, buf);
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const { stdout } = await run("ffprobe",
      ["-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height", "-of", "json", tmp],
      { timeout: FFPROBE_TIMEOUT_MS });
    const j = JSON.parse(stdout);
    const dur = Number(j?.format?.duration);
    const st = (j?.streams || [])[0] || {};
    return {
      duration: Number.isFinite(dur) && dur > 0 ? dur : 0,
      codec: st.codec_name || "",
      width: Number(st.width) > 0 ? Number(st.width) : 0,
      height: Number(st.height) > 0 ? Number(st.height) : 0,
    };
  } catch { return {}; } finally {
    if (tmp) { try { await (await import("node:fs/promises")).unlink(tmp); } catch { /* best-effort */ } }
  }
}

export async function probeBuffer(buf, { mime = "" } = {}) {
  const out = {};
  try {
    if (!buf || !buf.length) return out;
    out.size = buf.length;
    if (mime) out.mime = mime;
    let isImage = false;
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(buf).metadata();
      if (meta?.width && meta?.height) {
        isImage = true;
        out.width = meta.width; out.height = meta.height;
        out.mime = out.mime || `image/${meta.format === "jpeg" ? "jpeg" : meta.format}`;
      }
    } catch { /* bukan gambar / sharp gagal */ }
    if (!isImage) {
      const av = await ffprobeDuration(buf);
      if (av.duration) out.duration = av.duration;
      if (av.width && av.height) { out.width = av.width; out.height = av.height; }
      if (!out.mime && av.codec) {
        const CODEC_MIME = { h264: "video/mp4", hevc: "video/mp4", vp9: "video/webm", vp8: "video/webm",
          aac: "audio/mp4", mp3: "audio/mpeg", opus: "audio/ogg", vorbis: "audio/ogg", pcm_s16le: "audio/wav" };
        if (CODEC_MIME[av.codec]) out.mime = CODEC_MIME[av.codec];
      }
    }
  } catch { /* best-effort */ }
  return out;
}


// ── render kartu ──────────────────────────────────────────────────────────
const JENIS_LABEL = { video: "video", audio: "audio", foto: "foto", gif: "gif", dokumen: "dokumen", arsip: "arsip", aplikasi: "aplikasi" };

function group(title, rows) {
  const r = rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
  if (!r.length) return "";
  const w = Math.max(...r.map(([l]) => l.length));
  return `「 ✦ ${title} ✦ 」\n` + r.map(([l, v]) => `• ${l.padEnd(w)} : ${String(v).trim()}`).join("\n");
}

function wrap(text, width = 30) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const out = []; let line = "";
  for (const w of words) {
    if (/^https?:\/\//i.test(w)) { if (line) out.push(line); out.push(w); line = ""; continue; }
    if ((line + " " + w).trim().length > width) { if (line) out.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) out.push(line);
  return out.join("\n");
}

/**
 * @param {object} p
 *  header   nama fitur (judul kartu)
 *  title    judul media (dipotong 2 baris rapi)
 *  type     video|audio|foto|gif|... (kosong = dideteksi dari mime/ext/url)
 *  mime, ext, url, size (bytes), quality, bitrate (kbps), width, height
 *  duration (detik/"3:21"/ISO), uploadDate, lastModified, platform, author, authorHandle
 *  views, likes, comments, shares, checkedAt (default: sekarang)
 *  request  [[label, nilai], ...] — data PERMINTAAN pengguna (perintah, teks/argumen, model). Kelompok "Permintaan".
 */
export function mediaResultCard(p = {}) {
  const det = detectFormat({ mime: p.mime, ext: p.ext, url: p.url });
  const type = String(p.type || det.type || "").toLowerCase();
  const isTimed = type === "video" || type === "audio" || type === "gif";
  const title = String(p.title || "").trim();
  const head = `「 ✦ ${String(p.header || "Media").toUpperCase()} ✦ 」`;
  const titleBlock = title ? `\n${wrap(title.length > 90 ? title.slice(0, 87) + "..." : title)}` : "";

  const dim = p.width && p.height ? `${p.width} x ${p.height}` : "";
  const detail = group("Detail Media", [
    ["Jenis", JENIS_LABEL[type] || ""],
    ["Format", p.format || det.format],
    ["Kualitas", p.quality && p.quality !== "default" ? p.quality : ""],
    ["Bitrate", Number(p.bitrate) > 0 ? `${Math.round(p.bitrate)} kbps` : ""],
    ["Ukuran", fmtSize(p.size)],
    ["Durasi", isTimed ? fmtDur(p.duration) : ""],
    ["Dimensi", dim],
  ]);

  const author = p.author && p.authorHandle ? `${p.author} (@${String(p.authorHandle).replace(/^@/, "")})`
    : p.author ? String(p.author) : p.authorHandle ? `@${String(p.authorHandle).replace(/^@/, "")}` : "";
  const sumber = group("Sumber", [
    ["Platform", p.platform],
    ["Pembuat", author],
    ["Diunggah", fmtDate(p.uploadDate)],
    ["Dimodifikasi", !p.uploadDate ? fmtDate(p.lastModified) : ""],
    ["Dicek", fmtDate(p.checkedAt || new Date(), true)],
  ]);

  const stat = group("Statistik", [
    ["Views", fmtCount(p.views)],
    ["Likes", fmtCount(p.likes)],
    ["Komentar", fmtCount(p.comments)],
    ["Share", fmtCount(p.shares)],
  ]);

  const permintaan = Array.isArray(p.request) ? group("Permintaan", p.request) : "";

  // Tidak ada satu pun field media diketahui (hanya "Dicek") -> kartu tak informatif: balik "" (pemanggil pakai caption lama).
  if (!title && !detail && !stat && !permintaan && !p.platform && !author && !p.uploadDate && !p.lastModified) return "";
  return [head + titleBlock, permintaan, detail, sumber, stat].filter(Boolean).join("\n\n");
}
