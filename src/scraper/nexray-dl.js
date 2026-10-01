// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// nexray-dl.js — Scraper AIO downloader api.nexray.web.id (porting fitur
// .aio script JPM APENBOTZ ke Rara sebagai .aio2, 21 Sep 2026).
// Endpoint GET (redirect 301 otomatis diikuti axios):
//   /downloader/aio?url=<link>     → semua platform (yt/tt/ig/x/fb/dll)
//   /downloader/terabox?url=<link> → file TeraBox
const NEXRAY_DL_BASE = "https://api.nexray.web.id";
import axios from "axios";

let _http = axios; // seam buat e2e

export function _setNexrayDlHttpForTest(fn) { _http = fn; }
export function _resetNexrayDlHttpForTest() { _http = axios; }

async function dlGet(endpoint, url) {
  const res = await _http.get(`${NEXRAY_DL_BASE}${endpoint}`, {
    params: { url },
    timeout: 45000,
    headers: { "User-Agent": "NexRay-API-Client/1.0.0", "Accept": "application/json" },
    maxContentLength: 2 * 1024 * 1024,
  });
  const d = res?.data;
  if (d?.status === false || d?.error) {
    throw new Error(String(d?.error || "API nexray nolak"));
  }
  return d;
}

/** AIO downloader semua platform. Balikin {source, title, author, medias[]} */
export async function aioDl(url) {
  const d = await dlGet("/downloader/aio", url);
  const r = d?.result;
  const medias = Array.isArray(r?.medias) ? r.medias : [];
  if (!r || !medias.length) throw new Error("Gak nemu media di link itu");
  return {
    source: r.source || "unknown",
    title: r.title || "",
    author: r.author || "",
    duration: r.duration || 0,
    statistics: r.statistics || null,
    medias,
  };
}

/** TeraBox — balikin {folder, total, files[{filename,quality,size_formatted,duration,download_url}]} */
export async function teraboxDl(url) {
  const d = await dlGet("/downloader/terabox", url);
  const r = d?.result;
  const files = Array.isArray(r?.file) ? r.file : [];
  if (!files.length) throw new Error("Gak nemu file di link TeraBox itu");
  return {
    folder: r.folder || files[0]?.folder || "/",
    total: r.total_file || files.length,
    files,
  };
}

/** Unduh buffer file pilihan (URL hasil popup) — dipakai receiver .aio2dl. */
export async function fetchChoiceBuffer(url, maxBytes = 300 * 1024 * 1024) {
  const res = await _http.get(url, {
    responseType: "arraybuffer",
    timeout: 180000,
    maxContentLength: maxBytes,
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36" },
  });
  const buf = Buffer.from(res?.data || res || []);
  if (!buf.length) throw new Error("File kosong / gak bisa diunduh");
  return buf;
}
