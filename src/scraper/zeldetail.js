// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zeldetail.js — scraper ZelAPI kategori Details (7 endpoint):
//   appstore | gmaps | googleplay | idnlive | speedtest | whatsapp | xiaomi
//   (docs zelapi.eu.cc/docs/details)
// 🔹 STRICT SATUAN: key kosong / 401 / 429 / status:false → error ASLI,
//   gak nyolong fallback (aturan owner).
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 60000;

// ── seams http/key buat e2e offline ──
let _http = null;
export function _setZelDetailHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelDetailKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

// ── REGISTRY: 7 endpoint /details/<kind>?<param>=<value>&apikey= ──
export const ZEL_DETAIL_KINDS = {
  appstore:   { param: "id",  label: "Apple App Store",   hint: ".zappstore <nama app | link apps.apple.com | id angka>" },
  gmaps:      { param: "url", label: "Google Maps",      hint: ".zgmaps <link google maps>" },
  googleplay: { param: "id",  label: "Google Play Store", hint: ".zplaystore <package | link play.google.com>" },
  idnlive:    { param: "url", label: "IDN Live",         hint: ".zidnlive <link idn.app>" },
  speedtest:  { param: "id",  label: "SpeedTest",        hint: ".zspeedtest <id hasil speedtest.net>" },
  whatsapp:   { param: "url", label: "WA Channel",      hint: ".zchannel <link channel WhatsApp>" },
  xiaomi:     { param: "url", label: "Xiaomi Product",  hint: ".zxiaomi <link produk mi.com>" },
};

export function findZelDetailKind(q) {
  const s = String(q || "").toLowerCase().trim();
  if (!s) return null;
  if (ZEL_DETAIL_KINDS[s]) return s;
  const alias = { playstore: "googleplay", play: "googleplay", app: "appstore",
    maps: "gmaps", idn: "idnlive", live: "idnlive", speed: "speedtest",
    channel: "whatsapp", wachannel: "whatsapp", mi: "xiaomi" };
  return alias[s] || null;
}

// deteksi kind dari isi URL user (buat hub .zeldetail)
export function detectZelDetailKind(value) {
  const s = String(value || "").toLowerCase();
  if (/apps\.apple\.com/.test(s)) return "appstore";
  if (/play\.google\.com/.test(s)) return "googleplay";
  if (/google\.[a-z.]+\/maps|maps\.google\.[a-z.]+/.test(s)) return "gmaps";
  if (/idn\.app/.test(s)) return "idnlive";
  if (/speedtest\.net/.test(s)) return "speedtest";
  if (/whatsapp\.com\/channel/.test(s)) return "whatsapp";
  if (/mi\.com/.test(s)) return "xiaomi";
  if (/^\d{6,}$/.test(s)) return "speedtest";
  return null;
}

// ── fetch helper (satu pintu biar seam gampang) ──
async function zelGet(url) {
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (60 dtk) — server lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { /* body bukan json */ }
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status}) — key zelapi kosong/expired, isi apikeys.json` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) {
    const errText = data?.error || data?.message || (data ? null : (await res.text?.().catch(() => "") || "").slice(0, 120));
    return { ok: false, error: `HTTP ${status}${errText ? " — " + errText : ""}` };
  }
  if (data?.status === false) return { ok: false, error: String(data?.error || data?.message || "endpoint balik status false").slice(0, 200) };
  return { ok: true, data };
}

/**
 * Detail endpoint utama.
 * @param {string} kind  salah satu key ZEL_DETAIL_KINDS
 * @param {string} value id atau url (final — tanpa resolve)
 */
export async function zeldetailDetail(kind, value) {
  const spec = ZEL_DETAIL_KINDS[kind];
  if (!spec) return { ok: false, error: "KIND_INVALID — pilihan: " + Object.keys(ZEL_DETAIL_KINDS).join("/") };
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const v = String(value || "").trim();
  if (!v) return { ok: false, error: "VALUE_KOSONG" };
  const p = new URLSearchParams({ apikey: key });
  p.set(spec.param, v);
  const r = await zelGet(`${BASE}/details/${kind}?${p.toString()}`);
  if (!r.ok) return r;
  return { ok: true, kind, data: r.data, url: `${BASE}/details/${kind}?${spec.param}=<${spec.param}>&apikey=` };
}

// ── expand shortlink maps.app.goo.gl → full URL (zelapi nolak shortlink) ──
let _shortResolver = null;
export function _setZelShortResolverForTest(fn) { _shortResolver = fn; }
export async function resolveGmapsShortlink(url) {
  const s = String(url || "").trim();
  if (!/maps\.app\.goo\.gl|goo\.gl\/maps/.test(s)) return { ok: true, url: s };
  const doFetch = _shortResolver || _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try { return await fetch(u, { signal: ctrl.signal, redirect: "follow" }); } finally { clearTimeout(t); }
  });
  try {
    const res = await doFetch(s);
    const final = res?.url || res?.headers?.get?.("location") || "";
    if (final && /google\.[a-z.]+\/maps|maps\.google\.[a-z.]+/.test(final)) return { ok: true, url: final };
    return { ok: false, error: "Shortlink gak bisa dibuka — share ulang pakai link penuh dari google maps" };
  } catch {
    return { ok: false, error: "Shortlink gak bisa dibuka — coba kirim link penuh google.com/maps" };
  }
}

// ── resolve nama app → id App Store via iTunes Search (free, tanpa key) ──
let _itunesHttp = null;
export function _setItunesHttpForTest(fn) { _itunesHttp = fn; }
export async function resolveAppstoreId(query) {
  const s = String(query || "").trim();
  if (!s) return { ok: false, error: "QUERY_KOSONG" };
  if (/^\d{3,}$/.test(s)) return { ok: true, appId: s, name: null, via: "id" };
  if (/apps\.apple\.com/.test(s)) {
    const m = s.match(/\/id(\d{3,})/);
    if (m) return { ok: true, appId: m[1], name: null, via: "link" };
    return { ok: false, error: "Link apps.apple.com gak punya id — copy link lengkap dari halaman app" };
  }
  if (/^https?:\/\//.test(s)) return { ok: false, error: "Bukan link App Store — pakai nama app atau link apps.apple.com" };
  const doFetch = _itunesHttp || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try { return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } }); } finally { clearTimeout(t); }
  });
  try {
    const p = new URLSearchParams({ term: s, country: "id", entity: "software", limit: "5" });
    const res = await doFetch(`https://itunes.apple.com/search?${p.toString()}`);
    if (res?.status && res.status !== 200) return { ok: false, error: `iTunes search HTTP ${res.status}` };
    const j = await res.json();
    const first = j?.results?.[0];
    if (!first?.trackId) return { ok: false, error: `App "${s}" gak ketemu di App Store — coba nama lain` };
    return { ok: true, appId: String(first.trackId), name: first.trackName, via: "search" };
  } catch (e) {
    return { ok: false, error: "iTunes search gagal — " + (e?.message || "koneksi") };
  }
}
