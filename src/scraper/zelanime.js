// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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

/**
 * Panggil /anime/<path> zelapi. `path` sudah termasuk path segment
 * (contoh: "anibiplay/detail/some-slug") — apikey + params lain jadi query.
 * @returns {Promise<{ok:boolean, data?:object, error?:string}>}
 */
export async function zelAnimeGet(path, params = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") usp.set(k, String(v));
  }
  usp.set("apikey", key);
  const url = `${BASE}/${path}?${usp.toString()}`;

  let res;
  try {
    res = await doFetch(url);
  } catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "timeout — server terlalu lama merespons" : (e?.message || String(e)) };
  }

  let json = null;
  try { json = await res.json(); } catch {}
  if (!json) return { ok: false, error: `HTTP ${res.status}` };

  // STRICT: cek error dulu (bukan cuma !json.status — beberapa endpoint
  // overload field "status" jadi status anime string, bukan boolean).
  if (json.status === false) {
    return { ok: false, error: String(json.error || json.message || "unknown error").slice(0, 300) };
  }
  return { ok: true, data: json };
}

export { BASE as ZELANIME_BASE };
