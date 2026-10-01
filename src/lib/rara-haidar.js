// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// HaidarApis helper — api.haidarxd.my.id (336 endpoint all-in-one)
// Daftar gratis → API key: src/lib/apikey/apikeys.json → "haidar"
// Docs: https://api.haidarxd.my.id/docs
// Semua endpoint: /api/v1/<kategori>/<nama>?apikey=haidarapis-xxxx
// Catatan: tanpa apikey helper ini no-op (return null) — plugin skip diam-diam.

import { getHaidarKey } from "./config/env-loader.js";

const BASE = "https://api.haidarxd.my.id";
const DEF_TIMEOUT = 25000;

/**
 * API key tersedia? (semua helper di bawah no-op kalau false)
 */
export function isHaidarReady() {
  return Boolean(getHaidarKey());
}

/**
 * Fetch wrapper HaidarApis.
 * @param {string} path  — "/api/v1/downloader/tiktok-dl"
 * @param {Object} params — query params (apikey ditambah otomatis)
 * @returns {Promise<any|null>} field `data` dari response, null kalau gagal/belum ada key
 */
export async function haidarFetch(path, params = {}) {
  const key = getHaidarKey();
  if (!key) return null;
  const qs = new URLSearchParams({ ...params, apikey: key });
  try {
    const res = await fetch(`${BASE}${path}?${qs}`, {
      signal: AbortSignal.timeout(DEF_TIMEOUT),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status === "error" || json?.error) return null;
    // bentuk standar: { status: "success", data: {...} }
    return json?.data !== undefined ? json.data : json;
  } catch {
    return null;
  }
}

// ─── Downloader ────────────────────────────────────────────────────────────

// map platform → endpoint downloader haidar
const DL_MAP = [
  { re: /tiktok\.com|vt\.tiktok|douyin/i, ep: "tiktok-dl" },
  { re: /instagram\.com/i, ep: "instagram" },
  { re: /facebook\.com|fb\.watch/i, ep: "facebook" },
  { re: /threads\.(?:net|com)/i, ep: "threads" },
  { re: /(?:twitter|x)\.com|t\.co/i, ep: "x" },
  { re: /soundcloud\.com/i, ep: "soundcloud" },
  { re: /open\.spotify\.com|spotify\.link/i, ep: "spotify" },
  { re: /terabox|1024tera/i, ep: "terabox" },
  { re: /mediafire\.com/i, ep: "mediafire" },
  { re: /drive\.google\.com/i, ep: "gdrive" },
  { re: /mega\.nz/i, ep: "mega" },
  { re: /github\.com/i, ep: "github" },
  { re: /capcut\.com/i, ep: "capcut" },
  { re: /douyin/i, ep: "douyin" },
  { re: /bilibili\.com/i, ep: "bilibili" },
  { re: /youtube\.com|youtu\.be/i, ep: "youtubedl" }, // video+audio digabung
];

function detectDlEndpoint(url) {
  for (const { re, ep } of DL_MAP) if (re.test(url)) return ep;
  return "savefrom"; // fallback universal (26 platform)
}

// normalisasi bentuk response haidar (schema gak terdokumentasi rapi →
// cari media url di tempat-tempat umum, defensif)
function findMediaUrls(node, out = [], depth = 0) {
  if (!node || depth > 4) return out;
  if (typeof node === "string") {
    if (/^https?:\/\//.test(node) && /\.(mp4|mp3|m4a|webm|jpg|jpeg|png|webp)(\?|$)/i.test(node)) {
      out.push(node);
    }
    return out;
  }
  if (Array.isArray(node)) {
    for (const x of node) findMediaUrls(x, out, depth + 1);
    return out;
  }
  if (typeof node === "object") {
    // media object standar { url, type, quality, ext }
    if (typeof node.url === "string" && /^https?:\/\//.test(node.url)) {
      const ext = (node.ext || node.url.split("?")[0].split(".").pop() || "").toLowerCase();
      const type =
        node.type || (/mp3|m4a/.test(ext) ? "audio" : /mp4|webm/.test(ext) ? "video" : "image");
      out.push({ url: node.url, type, quality: node.quality || ext || "unknown" });
      return out;
    }
    for (const v of Object.values(node)) findMediaUrls(v, out, depth + 1);
    return out;
  }
  return out;
}

/**
 * Downloader all-in-one ala ikyyAio (shape kompatibel: { title, medias[] }).
 * @returns {Promise<{title:string, medias:{type:string,url:string,quality:string}[]}|null>}
 */
export async function haidarAio(url) {
  if (!isHaidarReady()) return null;
  const ep = detectDlEndpoint(url);
  const data = await haidarFetch(`/api/v1/downloader/${ep}`, { url });
  if (!data) return null;

  const title =
    data.title || data.name || data.caption || data.description || "Downloaded";

  const medias = [];

  // Pre-pass: format utama youtubedl-style ada di data.raw (yt-dlp format
  // { url, ext, format_note, resolution }) — ini media sebenarnya,
  // bukan data.url yang cuma URL sumber
  const raw = data.raw || data.result?.raw;
  if (raw?.url && raw?.ext && !/mhtml/i.test(String(raw.ext))) {
    const rext = String(raw.ext).toLowerCase();
    const rtype = /mp3|m4a|opus|wav/.test(rext) ? "audio" : /mp4|webm/.test(rext) ? "video" : "image";
    medias.push({ url: raw.url, type: rtype, quality: String(raw.format_note || raw.resolution || rext) });
  }

  for (const m of findMediaUrls(data)) {
    // skip URL sumber (data.url = link input, bukan media)
    if (typeof m === "string" && m === url) continue;
    if (typeof m === "object" && m.url === url) continue;
    // skip storyboard/thumbnail YouTube & format mhtml (bukan media utama)
    if (typeof m === "string" && /storyboard|maxresdefault|hqdefault|mqdefault|default\.jpg/i.test(m)) continue;
    if (typeof m === "string") {
      const ext = m.split("?")[0].split(".").pop().toLowerCase();
      const type = /jpg|jpeg|png|webp/.test(ext) ? "image" : /mp3|m4a|opus|wav/.test(ext) ? "audio" : "video";
      medias.push({ url: m, type, quality: ext || "unknown" });
    } else {
      medias.push({ type: m.type || "video", url: m.url, quality: m.quality || "unknown" });
    }
  }
  if (!medias.length) return null;

  // dedupe by url
  const seen = new Set();
  const uniq = medias.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
  return { title, medias: uniq };
}

// ─── TextPro ───────────────────────────────────────────────────────────────

// map style textpro rara → endpoint textpro haidar (22 efek tersedia)
const TEXTPRO_MAP = {
  blackpink: "blackpink",
  glitch: "glitch",
  typography: "typography",
  cartoon: "cartoon-graffiti",
  comic: "comic",
  pixel: "pixel-glitch",
  // style rara lain (neon, glow, gold, dll) gak ada padanan haidar — pakai glitch
};

/**
 * TextPro via Haidar → Buffer gambar hasil.
 * Endpoint /api/v1/textpro/<efek> balikin file gambar LANGSUNG
 * (image/jpeg), bukan JSON — jadi return Buffer siap kirim.
 * @returns {Promise<Buffer|null>} Buffer gambar, null kalau gagal
 */
export async function haidarTextpro(style, text) {
  const ep = TEXTPRO_MAP[style] || TEXTPRO_MAP[style?.toLowerCase?.()];
  if (!ep || !isHaidarReady()) return null;
  const key = getHaidarKey();
  const qs = new URLSearchParams({ text, apikey: key });
  try {
    const res = await fetch(`${BASE}/api/v1/textpro/${ep}?${qs}`, {
      signal: AbortSignal.timeout(30000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct.startsWith("image/")) {
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 100 ? buf : null;
    }
    // beberapa endpoint mungkin balikin JSON URL — dukung dua-duanya
    if (ct.includes("application/json")) {
      const json = await res.json();
      const d = json?.data?.result || json?.data || json;
      const imgUrl = d?.url || d?.image || d?.result;
      if (typeof imgUrl === "string" && /^https?:\/\//.test(imgUrl)) {
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(20000) });
        if (!imgRes.ok) return null;
        const buf = Buffer.from(await imgRes.arrayBuffer());
        return buf.length > 100 ? buf : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Games ─────────────────────────────────────────────────────────────────

/**
 * Ambil 1 soal game dari HaidarApis.
 * Endpoint tersedia: asahotak, islamic, siapakahaku, susunkata,
 * tebakkimia, tebaklirik, tebaktebakan, tekateki.
 * @param {string} gameName — nama endpoint (tanpa /api/v1/games/)
 * @returns {Promise<{soal:string, jawaban:string, deskripsi?:string}|null>}
 *   Shape kompatibel dgn rara-game-factory (questionField soal, answerField jawaban)
 */
export async function haidarGame(gameName) {
  if (!isHaidarReady()) return null;
  const data = await haidarFetch(`/api/v1/games/${gameName}`);
  if (!data) return null;

  // normalisasi defensif — schema gak terdokumentasi, coba field umum
  const src = data.result || data.data || data;
  const soal = src.soal || src.pertanyaan || src.question || src.soal1 || "";
  const jawaban = src.jawaban || src.answer || src.jawabanBenar || "";
  const deskripsi = src.deskripsi || src.info || src.penjelasan || "";

  // tebakkimia bentuk beda: { unsur, lambang } — kompatibel dgn format v1
  if (!soal && src.unsur && src.lambang) {
    return { unsur: String(src.unsur).trim(), lambang: String(src.lambang).trim() };
  }
  if (!soal || !jawaban) return null;
  const q = { soal: String(soal).trim(), jawaban: String(jawaban).trim() };
  if (deskripsi) q.deskripsi = String(deskripsi).trim();
  // susunkata punya kategori soal (tipe) — tampil jadi info hasil
  if (src.tipe) q.deskripsi = `Tipe: ${String(src.tipe).trim()}`;
  return q;
}
