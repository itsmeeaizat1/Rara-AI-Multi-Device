// rara-vexfile.js — engine upload ke vexfile.com (file host PPD, bayar per download).
// ALUR (API vexfile = REMOTE UPLOAD, gak nerima upload file langsung):
//   [1] media → staging ke tmpfiles.org (API publik gratis, max 100 MB) → link DIRECT
//   [2] POST https://vexfile.com/api/upload/handle JSON {token, url} → vexfile nyedot file dari URL
//   [3] respon 200: {id, error:false, file, url:"https://vexfile.com/download/XXXX"}
// Format yang diterima vexfile HANYA arsip/paket game (zip,7z,rar,apk,obb,iso,dst —
// daftar lengkap ALLOWED_EXTS dari pesan error API). Format lain → dibungkus .zip
// otomatis oleh vexZipWrap sebelum staging.
// Token API: .setkey vexfile <key> (registry rara-api-keys.js) / env VEXFILES_API_KEY.
// Verifikasi live 29 Sep 2026: token owner → 200 {id:237276,error:false,url:"https://vexfile.com/download/Spct4QU3kB"};
// format .txt ditolak 400 "File download failed: format must be of zip,7z,..."; token palsu → 403
// "User authorization failed: invalid access token". NB: vexfile.com di-belakang Cloudflare —
// IP datacenter yang di-flag bakal kena halaman challenge (deteksi di bawah, error jujur).
import { getApiKey } from "./rara-api-keys.js";

const VEXFILE_API = "https://vexfile.com/api/upload/handle";
const TMPFILES_API = "https://tmpfiles.org/api/v1/upload";
const STAGING_EXPIRE_SEC = 1800; // 30 menit — vexfile nyedot beberapa detik setelah POST
export const STAGING_MAX_BYTES = 104857600; // 100 MB — batas tmpfiles.org (relay staging)
const REMOTE_TIMEOUT_MS = 300000; // 5 mnt — vexfile nyedot file server-side

// 43 format arsip/paket yang diterima vexfile (persis dari pesan error API live)
export const ALLOWED_EXTS = [
  "zip", "7z", "rar", "tar", "gz", "bz2", "xz", "lz", "lzma", "cab", "ace", "arj", "z",
  "jar", "war", "ear", "iso", "apk", "xapk", "apks", "obb", "aab", "pak", "wad", "vpk",
  "dat", "cpk", "arc", "rpf", "gcf", "bsa", "hog", "mix", "big", "sga", "pck", "sit",
  "sitx", "dmg", "pea", "sfx", "zst", "lzh",
];

export function fileExt(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || "").trim());
  return m ? m[1].toLowerCase() : "";
}

export function isVexAllowedFormat(name) {
  return ALLOWED_EXTS.includes(fileExt(name));
}

// bungkus buffer jadi .zip (stored, tanpa kompresi — media udah terkompresi)
export async function vexZipWrap(buffer, innerName) {
  const { default: AdmZip } = await import("adm-zip");
  const zip = new AdmZip();
  const safeInner = String(innerName || "file").replace(/\.zip$/i, "") || "file";
  zip.addFile(safeInner, buffer);
  return zip.toBuffer();
}

function mimeTypeFor(filename, fallback) {
  const e = fileExt(filename);
  if (e === "zip") return "application/zip";
  if (e === "apk" || e === "xapk" || e === "apks" || e === "aab") return "application/vnd.android.package-archive";
  if (e === "rar") return "application/vnd.rar";
  if (e === "7z") return "application/x-7z-compressed";
  if (e === "iso") return "application/x-iso9660-image";
  return fallback || "application/octet-stream";
}

// seam untuk e2e: override fetch seluruhnya (routing by URL)
let _http = null;
export function _setVexfileHttpForTest(fn) { _http = fn; }
const doFetch = (u, o) => (_http ? _http(u, o) : fetch(u, o));
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

// [1] staging ke tmpfiles.org → { shareUrl, directUrl } — directUrl WAJIB (vexfile nyedot dari situ)
export async function stageToTmpfiles(buffer, filename, mime) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeTypeFor(filename, mime) }), filename);
  form.append("expire", String(STAGING_EXPIRE_SEC));
  const res = await doFetch(TMPFILES_API, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120000),
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || data?.status !== "success" || !data?.data?.url) {
    throw new Error(`staging tmpfiles.org gagal: HTTP ${res?.status} ${data?.data?.message || data?.message || "respons tidak valid"}`);
  }
  const shareUrl = data.data.url;
  // link direct /dl/<token>/ di-scrape dari halaman share (token digenerate per-view)
  let directUrl = null;
  try {
    const view = await doFetch(shareUrl, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": UA } });
    if (view.ok) {
      const html = await view.text();
      const m = /href="(https:\/\/tmpfiles\.org\/dl\/[^"]+)"/.exec(html);
      directUrl = m ? m[1] : null;
    }
  } catch { directUrl = null; }
  if (!directUrl) throw new Error("staging gagal: link direct tmpfiles.org tidak bisa diambil");
  return { shareUrl, directUrl };
}

// [2] remote upload ke vexfile → { id, file, url } — throw Error jujur per jalur gagal
export async function vexfileRemoteUpload(token, url) {
  const res = await doFetch(VEXFILE_API, {
    method: "POST",
    body: JSON.stringify({ token: String(token || ""), url: String(url || "") }),
    signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
    headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": UA },
  });
  let raw = "";
  try { raw = await res.text(); } catch { raw = ""; }
  // Cloudflare challenge (IP VPS di-flag) → HTML bukan JSON
  if (/Just a moment|challenges\.cloudflare|cf-browser-verification/i.test(raw)) {
    throw new Error("vexfile.com menolak koneksi (Cloudflare challenge) — coba lagi nanti");
  }
  let data = null;
  try { data = JSON.parse(raw); } catch { data = null; }
  if (data && data.error === false && data.url) {
    return { id: data.id, file: data.file, url: String(data.url).replace(/\\\//g, "/") };
  }
  if (data && typeof data.error === "string" && data.error.trim()) {
    throw new Error(`vexfile: ${data.error.trim()}`);
  }
  throw new Error(`vexfile HTTP ${res?.status}: ${raw ? raw.slice(0, 140) : "respons kosong"}`);
}

// token dari registry .setkey vexfile / pusat apikeys.json / env VEXFILES_API_KEY
let _tokenOverride; // undefined = registry asli; string/null = paksa (e2e)
export function _setVexfileTokenForTest(v) { _tokenOverride = v; }
export function getVexfileToken() {
  if (_tokenOverride !== undefined) return String(_tokenOverride || "").trim();
  return String(getApiKey("vexfile") || "").trim();
}
