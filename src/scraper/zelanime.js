// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// zelanime.js — caller generik buat semua endpoint /anime/* zelapi.eu.cc
// (anibiplay, animelovers, wotanim, otakudesu — animekompi DIKELUARKAN,
// mati total DNS ENOTFOUND v6.animekompi.fun, jangan dipanggil).
// STRICT ERROR: status:false → error asli dilempar ke atas, NO FALLBACK.
// GOTCHA: anibiplay/detail/:slug field "status" itu status ANIME
// ("completed"/"ongoing"), BUKAN boolean envelope — makanya cek error
// pakai `=== false` ketat (string gak match), jangan pakai `!data.status`.
import { getZelKey as _getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc/anime";
const TIMEOUT_MS = 45000;

// Getter key: reuse infra yang sama dengan zelapi.js (ai/image suite) —
// 1 API key zelapi buat semua fitur zelapi (AI + image + anime).
function getKey() {
  if (_keyForTest !== undefined) return _keyForTest;
  try { return _getZelKey(); } catch { return null; }
}
let _keyForTest;
export function _setZelAnimeKeyForTest(k) { _keyForTest = k; }

let _http = null;
export function _setZelAnimeHttpForTest(fn) { _http = fn; }

let _sleepForTest = null;
export function _setZelAnimeSleepForTest(fn) { _sleepForTest = fn; }
function sleep(ms) {
  if (_sleepForTest) return _sleepForTest(ms);
  return new Promise((r) => setTimeout(r, ms));
}

async function doFetch(url) {
  if (_http) return _http(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
  } finally {
    clearTimeout(timer);
  }
}

async function once(url) {
  let res;
  try {
    res = await doFetch(url);
  } catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "timeout — server terlalu lama merespons" : (e?.message || String(e)), transient: true };
  }

  let json = null;
  try { json = await res.json(); } catch {}
  if (!json) return { ok: false, error: `HTTP ${res.status}`, transient: res.status >= 400 };

  // STRICT: cek error dulu (bukan cuma !json.status — beberapa endpoint
  // overload field "status" jadi status anime string, bukan boolean).
  if (json.status === false) {
    const msg = String(json.error || json.message || "unknown error").slice(0, 300);
    // Upstream proxy/anti-bot block (axios "Request failed with status code
    // 403/407/429/502" dll — kode HTTP-nya macem-macem tergantung proxy)
    // itu TRANSIENT, layak diretry. Validasi param ("Parameter X wajib
    // diisi") atau DNS mati permanen (ENOTFOUND, mis. animekompi) BUKAN.
    const transient = /request failed with status code/i.test(msg) && !/ENOTFOUND/i.test(msg);
    return { ok: false, error: msg, transient };
  }
  return { ok: true, data: json };
}

/**
 * Panggil /anime/<path> zelapi. `path` sudah termasuk path segment
 * (contoh: "anibiplay/detail/some-slug") — apikey + params lain jadi query.
 * @param {object} opts.retries — jumlah retry TAMBAHAN kalau error transient
 *   (403/429/5xx — anti-bot upstream, bukan salah param). Default 0 (gak
 *   retry). Dipakai khusus sumber flaky (animelovers ~20-40% sukses rate).
 * @returns {Promise<{ok:boolean, data?:object, error?:string}>}
 */
export async function zelAnimeGet(path, params = {}, opts = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") usp.set(k, String(v));
  }
  usp.set("apikey", key);
  const url = `${BASE}/${path}?${usp.toString()}`;

  const retries = Math.max(0, opts.retries || 0);
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    last = await once(url);
    if (last.ok || !last.transient || attempt === retries) break;
    await sleep(2500 * (attempt + 1));
  }
  return { ok: last.ok, data: last.data, error: last.error };
}

export { BASE as ZELANIME_BASE };
