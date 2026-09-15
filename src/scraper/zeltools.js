// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zeltools.js — scraper ZelAPI kategori /tools.
// 🔹 LIVE VERIFIED 15 Sep 2026 (45 endpoint disweep):
//   HIDUP: coderunner (sandbox JS v24), domain (lookup IP/geo/ISP),
//          obfuscate (JS obfuscator), convert (ESM↔CJS),
//          getsource (HTML source), debugbear (website speed test)
//   MATI SERVER-SIDE (jangan pakai): pagespeed (frame detached),
//          dtsen (session fail), truecaller (installationId kosong),
//          ipqs (timeout), agedetect (403 upstream), removewm (404),
//          cekkodepos (field kodepos gak ke-scrape — cuma provinsi),
//          nsfw checker (400), tiktokearning (403), capcutgen, tikview.
// 🔹 DUPE FITUR BOT (gak dipasang): text2qr/qr2text (qrgen/qr.js ada),
//          morse, translate, ssweb, removebg, toanime, enchane/wink,
//          whatanime (.lens), img2prompt, ytplay, soundcloud, ephoto,
//          pastebin/gist extractor (getpaste), shortlink/tinyurl,
//          wach (.zchannel), currency.
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 90000; // debugbear bisa 60s+

// ── seams http/key buat e2e offline ──
let _http = null;
export function _setZelToolsHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelToolsKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

export const ZEL_TOOLS_KINDS = {
  code:      { path: "coderunner", label: "Code Runner (sandbox JS)", args: ["code"] },
  obfuscate: { path: "obfuscate",  label: "Code Obfuscator",          args: ["code"] },
  convert:   { path: "convert",    label: "ESM ↔ CJS Converter",     args: ["code", "type"] },
  domain:    { path: "domain",     label: "Domain Checker",          args: ["q"] },
  source:    { path: "getsource",   label: "Get Source",              args: ["url"] },
  webtest:   { path: "debugbear",  label: "Website Speed Test",      args: ["url", "device"] },
  // ── backup z-variant (owner 15 Sep: "z di depan = cadangan meski bot udah punya") ──
  qr:        { path: "text2qr",    label: "Text → QR Code",          args: ["text"], binary: true },
  readqr:    { path: "qr2text",    label: "QR → Text (decode)",      args: ["url"] },
  morse:     { path: "morse",      label: "Morse Encoder",           args: ["text"] },
  kurs:      { path: "currency",   label: "Kurs USD → IDR",          args: ["amount"] },
  shortlink: { path: "shortlink",  label: "CDN Shortlink",           args: ["url"] },
  tinyurl:   { path: "tinyurl",    label: "TinyURL",                 args: ["url"] },
  ephoto:    { path: "ephoto",     label: "Ephoto360 Text Effect",  args: ["effect", "text"] },
  whatanime: { path: "whatanime",  label: "WhatAnime (anime match)", args: ["url"] },
  img2prompt:{ path: "img2prompt", label: "Image → AI Prompt",      args: ["url"] },
  gist:      { path: "gist",       label: "Gist Extractor",          args: ["url"] },
  pastebin:  { path: "pastebin",   label: "Pastebin Extractor",     args: ["url"] },
};

// efek ephoto360 zelapi (respons error zelapi 15 Sep 2026)
export const ZEL_EPHOTO_EFFECTS = [
  "glitch", "write", "advancedglow", "typography", "pixelglitch", "neonglitch",
  "flag", "flag3d", "deleting", "blackpinkstyle", "glowing", "underwater",
  "logomaker", "cartoonstyle", "papercutstyle", "watercolor", "effectclouds",
  "blackpinklogo", "gradient", "summerbeach", "luxurygold", "multicoloredneon",
  "sandsummer", "galaxywallpaper", "1917style", "makingneon", "royal",
  "freecreate", "galaxystyle", "lighteffects",
];

export const ZEL_CONVERT_TYPES = ["toesm", "tocjs"];

// ── fetch helper strict (pola zeldl) ──
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
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (90 dtk) — server lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  let buffer = null;
  const ctype = (res?.headers?.get?.("content-type") || res?.headers?.["content-type"] || "");
  if (ctype.includes("image") || ctype.includes("octet-stream")) {
    try { buffer = Buffer.from(await res.arrayBuffer()); } catch { /* fallback json */ }
  }
  if (!buffer) {
    try { data = await res.json(); } catch { /* body bukan json */ }
    if (!data && status === 200 && typeof res?.arrayBuffer === "function") {
      try { buffer = Buffer.from(await res.arrayBuffer()); } catch { /* biarkan */ }
    }
  }
  if (buffer && status === 200) return { ok: true, data: null, buffer };
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status}) — key zelapi kosong/expired, isi apikeys.json` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) {
    const errText = data?.error || data?.message || "";
    return { ok: false, error: `HTTP ${status}${errText ? " — " + errText : ""}` };
  }
  if (data?.status === false) return { ok: false, error: String(data?.error || data?.message || "endpoint balik status false").slice(0, 200) };
  return { ok: true, data };
}

/**
 * Panggil tools zelapi. kind = key ZEL_TOOLS_KINDS.
 * @param {string} kind
 * @param {Record<string,string>} params — sesuai spec.args (tanpa apikey)
 */
export async function zelToolCall(kind, params = {}) {
  const spec = ZEL_TOOLS_KINDS[kind];
  if (!spec) return { ok: false, error: "KIND_INVALID — pilihan: " + Object.keys(ZEL_TOOLS_KINDS).join("/") };
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const p = new URLSearchParams({ apikey: key });
  for (const a of spec.args) {
    const v = String(params[a] ?? "").trim();
    if (a === "code" && !v) return { ok: false, error: "CODE_EMPTY — kirim kode-nya (teks atau reply pesan kode)" };
    if (a === "text" && !v) return { ok: false, error: "TEXT_EMPTY — kirim teksnya" };
    if (a === "effect" && kind === "ephoto" && !ZEL_EPHOTO_EFFECTS.includes(v.toLowerCase())) return { ok: false, error: "EFFECT_INVALID — ketik .zepho list buat daftar efek" };
    if (a === "url" && v && !/^https?:\/\//.test(v)) return { ok: false, error: "URL_INVALID — kirim link lengkap (https://...)" };
    if (a === "q" && !v) return { ok: false, error: "QUERY_EMPTY — kirim domain-nya (contoh: google.com)" };
    if (a === "type" && kind === "convert") {
      if (!ZEL_CONVERT_TYPES.includes(v)) return { ok: false, error: "TYPE_INVALID — pilihan: " + ZEL_CONVERT_TYPES.join(" / ") };
    }
    if (v) p.set(a, v);
  }
  const r = await zelGet(`${BASE}/tools/${spec.path}?${p.toString()}`);
  if (!r.ok) return r;
  return r.buffer ? { ok: true, kind, data: null, buffer: r.buffer } : { ok: true, kind, data: r.data };
}
