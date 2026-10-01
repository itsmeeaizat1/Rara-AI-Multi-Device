// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zeldl.js — scraper ZelAPI kategori Download.
// 🔹 LIVE VERIFIED 15 Sep 2026 (42 endpoint disweep):
//   HIDUP: all (generic multi-platform), spotify (meta+preview), scribd (meta+dl)
//   MATI SERVER-SIDE (jangan pakai): youtube (bot-check), ytdl, ytmusic (link kosong),
//   dafont (bug regex zelapi), spotifylist (419), lk21 (407 proxy), idlix (404),
//   pixiv (gak nemu gambar), luvyaa (domain luvyaa.co gak respons), 9xbuddy (puppeteer zelapi crash),
//   dzstream (track unavailable), ucshare (uc-share.com gak ada link publik).
// 🔹 NSFW (plugin terpisah, default disabled — aturan owner 15 Sep 2026):
//   missav | nekopoi | eporner | kingbokep | pixhentai | tokyomotion
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 65000;

// ── seams http/key buat e2e offline ──
let _http = null;
export function _setZelDlHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelDlKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

// ── REGISTRY ──
export const ZEL_DL_KINDS = {
  all:     { path: "all",     label: "All Platform (generic)" },
  spotify: { path: "spotify", label: "Spotify" },
  scribd:  { path: "scribd",  label: "Scribd" },
};

export const ZEL_DL_NSFW_KINDS = {
  missav:       { path: "missav",       label: "MissAV" },
  nekopoi:      { path: "nekopoi",      label: "NekoPoi" },
  eporner:      { path: "eporner",      label: "Eporner" },
  kingbokep:    { path: "kingbokep",    label: "KingBokep" },
  pixhentai:    { path: "pixhentai",    label: "PixHentai" },
  tokyomotion:  { path: "tokyomotion",  label: "Tokyo Motion" },
};

// deteksi kind dari URL (buat hub .zeldl)
export function detectZelDlKind(url) {
  const s = String(url || "").toLowerCase();
  if (/scribd\.com/.test(s)) return "scribd";
  if (/open\.spotify\.com|spotify\.link/.test(s)) return "spotify";
  return "all";
}

// ── fetch helper strict (pola zeljkt) ──
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
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (65 dtk) — server lama jawab" : (e?.message || "gagal koneksi") };
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
 * Download zelapi. kind = key ZEL_DL_KINDS / ZEL_DL_NSFW_KINDS.
 * @returns { ok, kind, data }
 */
export async function zeldlDownload(kind, url, extra = {}) {
  const spec = ZEL_DL_KINDS[kind] || ZEL_DL_NSFW_KINDS[kind];
  if (!spec) return { ok: false, error: "KIND_INVALID — pilihan: " + [...Object.keys(ZEL_DL_KINDS), ...Object.keys(ZEL_DL_NSFW_KINDS)].join("/") };
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const u = String(url || "").trim();
  if (!u || !/^https?:\/\//.test(u)) return { ok: false, error: "URL_INVALID — kirim link lengkap (https://...)" };
  const p = new URLSearchParams({ apikey: key, url: u });
  for (const [k, v] of Object.entries(extra || {})) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const r = await zelGet(`${BASE}/download/${spec.path}?${p.toString()}`);
  if (!r.ok) return r;
  return { ok: true, kind, data: r.data, url: `${BASE}/download/${spec.path}?url=...&apikey=` };
}

// ── kumpulin link unduhan dari bentuk respon macem-macem ──
export function collectLinks(data) {
  const out = [];
  const push = (x) => {
    if (typeof x === "string" && /^https?:\/\//.test(x)) out.push({ url: x, label: "" });
    else if (x && typeof x === "object" && typeof x.url === "string") {
      const label = [x.quality, x.type, x.format, x.resolution].filter(Boolean).join(" ");
      out.push({ url: x.url, label });
    }
  };
  const cands = [data?.result?.download_links, data?.download_links, data?.links, data?.data?.download_links, data?.media, data?.data?.links];
  for (const c of cands) if (Array.isArray(c)) c.forEach(push);
  if (typeof data?.result?.combain === "string" && /^https?:\/\//.test(data.result.combain)) {
    out.unshift({ url: data.result.combain, label: "combined" });
  }
  // dedup
  const seen = new Set();
  return out.filter((l) => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
}

// pilih link terbaik buat dikirim langsung ke WA (file langsung, bukan stream)
export function pickDirectLink(links) {
  const DIRECT = /\.(mp4|mp3|m4a|aac|flac|wav|pdf|zip|rar|jpg|jpeg|png|webp)(\?|$)/i;
  const STREAM = /\.(m3u8|mpd)(\?|$)/i;
  const good = links.filter((l) => DIRECT.test(l.url) && !STREAM.test(l.url));
  // prioritas: video → audio → dokumen
  const rank = (u) => (/\.mp4(\?|$)/i.test(u) ? 0 : /\.(mp3|m4a|aac|flac|wav)(\?|$)/i.test(u) ? 1 : /\.(pdf|zip|rar)(\?|$)/i.test(u) ? 2 : 3);
  good.sort((a, b) => rank(a.url) - rank(b.url));
  return good[0] || null;
}

// tipe media buat dikirim (pola alldownloaderv4)
export function mediaTypeOf(url) {
  const u = String(url || "").toLowerCase();
  if (/\.(mp3|m4a|aac|flac|wav|opus)(\?|$)/.test(u)) return "audio";
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(u)) return "image";
  if (/\.(pdf|zip|rar|docx?|xlsx?|pptx?)(\?|$)/.test(u)) return "document";
  return "video";
}
