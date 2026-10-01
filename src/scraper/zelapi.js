// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zelapi.js — scraper zelapi.eu.cc (86 AI endpoint, suite .z)
// 🔹 STRICT SATUAN: status:false / key kosong → error ASLI keluar, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";
import { getZelSpec, ZEL_AI_REGISTRY } from "../lib/rara-zel-registry.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 60000;

// seam test
let _http = null;
export function _setZelHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

/** Ekstrak teks jawaban AI dari bentuk respon macem-macem (defensif). */
function extractZelText(d) {
  if (!d || typeof d !== "object") return typeof d === "string" ? d : "";
  const cands = [
    d?.data?.text, d?.data?.result, d?.data?.message, d?.data?.answer, d?.data?.response, d?.data?.content,
    d?.result, d?.message, d?.answer, d?.text, d?.response, d?.content,
    (typeof d?.data === "string" ? d.data : null),
  ];
  for (const c of cands) if (typeof c === "string" && c.trim()) return c.trim();
  // fallback: string terpanjang di kedalaman 2
  let best = "";
  const walk = (o, depth) => {
    if (depth > 2 || !o || typeof o !== "object") return;
    for (const v of Object.values(o)) {
      if (typeof v === "string" && v.trim().length > best.length) best = v.trim();
      else if (v && typeof v === "object") walk(v, depth + 1);
    }
  };
  walk(d, 0);
  return best;
}


/** Coba ambil pesan error dari body walau HTTP != 200. */
async function readZelError(res, fallback) {
  try {
    const j = await res.json();
    if (j?.error) return String(j.error).slice(0, 200);
  } catch {}
  return fallback;
}

/** Bersihin markdown ringan biar rapi di WA. */
function cleanZelText(t) {
  return String(t)
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Chat AI zelapi by command (.zchatgpt dst).
 * @param {string} cmd nama command tanpa titik (zchatgpt)
 * @param {string} text pesan user
 * @param {{imageUrl?: string}} opts imageUrl khusus type vision
 * @returns {Promise<{ok:boolean, text?:string, error?:string, spec?:object}>}
 */
export async function zelAiChat(cmd, text, opts = {}) {
  const spec = getZelSpec(cmd);
  if (!spec) return { ok: false, error: `Command .${cmd} gak ada di registry — ketik .zel list` };
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };

  if (spec.type === "vision" && !opts.imageUrl) {
    return { ok: false, error: "VISION_NOIMAGE" };
  }
  if (!text || !text.trim()) return { ok: false, error: "TEXT_KOSONG" };

  const p = new URLSearchParams({ apikey: key, [spec.textParam]: text });
  if (spec.type === "vision" && opts.imageUrl) p.set("image", opts.imageUrl);

  const url = `${BASE}/ai/${spec.slug}?${p.toString()}`;
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
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status} — ${await readZelError(res, "endpoint gagal")}` };

  let data;
  try { data = await res.json(); }
  catch (e) { return { ok: false, error: "respon bukan JSON: " + (e?.message || "") }; }

  if (data?.status === false) {
    return { ok: false, error: (data?.error || "endpoint mati") + (data?.error_code ? ` (${data.error_code})` : "") };
  }
  const out = extractZelText(data);
  const images = findImageUrls(data);
  if (!out && !images.length) return { ok: false, error: "jawaban kosong (endpoint mungkin mati/limit)" };
  return { ok: true, text: cleanZelText(out), images, spec };
}

/**
 * zimage — generator gambar zelapi → buffer gambar.
 * @returns {Promise<{ok:boolean, buffer?:Buffer, error?:string}>}
 */
export async function zelAiImage(prompt) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  if (!prompt || !prompt.trim()) return { ok: false, error: "TEXT_KOSONG" };
  const p = new URLSearchParams({ apikey: key, prompt: prompt.trim() });
  const url = `${BASE}/ai/zimage?${p.toString()}`;
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90000);
    try {
      return await fetch(u, { signal: ctrl.signal });
    } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (90 dtk)" : (e?.message || "gagal koneksi") };
  }
  if (res?.status !== 200) return { ok: false, error: `HTTP ${res?.status}` };
  const ct = String(res.headers?.get?.("content-type") || "");
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf?.length || buf.length < 1000) return { ok: false, error: "gambar kosong dari server" };
  if (ct.includes("json") || buf[0] === 0x7b /* { */) {
    try {
      const j = JSON.parse(buf.toString("utf8"));
      return { ok: false, error: j?.error || "server balikin JSON (gagal generate)" };
    } catch {}
  }
  return { ok: true, buffer: buf, spec: getZelSpec("zimage") };
}

export { ZEL_AI_REGISTRY };

// ═════════════════════════════════════════════
// 🔹 IMAGE GEN — kategori /ai-image zelapi (text2img + edit foto)
// 🔹 Owner 14 Sep: AI yang support generate gambar + upload gambar (vision/edit) ditambahin.
// ═════════════════════════════════════════════

/** Kumpulin URL gambar dari bentuk respon macem-macem (defensif). */
function findImageUrls(d) {
  const out = [];
  const push = (u) => {
    if (typeof u === "string" && /^https?:\/\//.test(u) && !out.includes(u)) out.push(u);
  };
  const walk = (o, depth) => {
    if (depth > 3 || !o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") {
        // field yang namanya mengarah ke gambar
        if (/image|photo|picture|url|thumb|media|result|link/i.test(k) && /^https?:\/\/\S+\.(jpe?g|png|webp|gif)/i.test(v)) push(v);
      } else if (Array.isArray(v)) {
        // array of string url — cuma kalau key-nya jelas gambar (biar sources gak nyasar)
        if (/image|photo|picture|thumb|media/i.test(k)) {
          v.forEach((x) => { if (typeof x === "string" && /^https?:\/\//.test(x)) push(x); });
        }
        v.forEach((x) => walk(x, depth + 1));
      } else if (v && typeof v === "object") walk(v, depth + 1);
    }
  };
  walk(d, 0);
  return out;
}

/**
 * Endpoint image zelapi (kategori /ai-image).
 * @param {string} path path lengkap tanpa base (ai-image/bingimage)
 * @param {string} prompt teks/prompt
 * @param {{imageUrl?: string, imageUrl2?: string, imageParam?: string, imageParam2?: string, needImage?: boolean, noText?: boolean, extra?: object}} opts
 * @returns {Promise<{ok:boolean, images?:string[], buffer?:Buffer, error?:string}>}
 */
export async function zelImageEndpoint(path, prompt, opts = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  if (!opts.noText) {
    if (!prompt || !prompt.trim()) return { ok: false, error: "TEXT_KOSONG" };
  }
  if (opts.needImage && !opts.imageUrl) return { ok: false, error: "NEED_IMAGE" };

  // param teks sesuai docs endpoint (textParam), jangan kirim param nyasar
  const textParam = opts.textParam || "prompt";
  const p = new URLSearchParams({ apikey: key });
  if (!opts.noText || (prompt && prompt.trim())) {
    p.set(textParam, (prompt || "").trim());
  }
  if (opts.imageUrl) {
    // image param beda-beda per endpoint — kirim varian yang cocok aja via imageParam
    const ip = opts.imageParam || "image";
    p.set(ip, opts.imageUrl);
  }
  if (opts.imageUrl2) {
    // image param kedua (e.g. outfit)
    const ip2 = opts.imageParam2 || "image2";
    p.set(ip2, opts.imageUrl2);
  }
  // param tambahan per endpoint (model, batch, template, dll)
  for (const [k, v] of Object.entries(opts.extra || {})) p.set(k, String(v));
  const url = `${BASE}/${path}?${p.toString()}`;
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90000);
    try { return await fetch(u, { signal: ctrl.signal }); } finally { clearTimeout(t); }
  });

  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (90 dtk) — generate lama" : (e?.message || "gagal koneksi") };
  }
  if (res?.status === 401 || res?.status === 403) return { ok: false, error: `API_KEY_INVALID (${res.status})` };
  if (res?.status !== 200) return { ok: false, error: `HTTP ${res.status} — ${await readZelError(res, "endpoint gagal")}` };

  const ct = String(res.headers?.get?.("content-type") || "");
  const hasArrayBuffer = typeof res.arrayBuffer === "function";
  // binary langsung (png/webp) — cuma kalau beneran binary (bukan respon JSON)
  if (hasArrayBuffer && !ct.includes("json")) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 1000) return { ok: true, buffer: buf };
    return { ok: false, error: "gambar kosong dari server" };
  }
  let data;
  try { data = await res.json(); }
  catch (e) { return { ok: false, error: "respon bukan JSON" }; }

  if (data?.status === false) return { ok: false, error: data?.error || "endpoint gagal generate" };
  const images = findImageUrls(data);
  if (images.length) return { ok: true, images };
  // respon aneh (status bukan true, gak ada gambar) → kasih error asli kalau ada
  return { ok: false, error: data?.error || "gak ada gambar di respon — endpoint mungkin mati" };
}

// ═════════════════════════════════════════════
// 🔹 STALK SUITE — kategori /stalk zelapi (cek profil sosial media/game/dev)
// 🔹 Owner 14 Sep: nambah fitur baru dari zelapi v3.0.0 (448 endpoint).
// 🔹 DIVERIFIKASI LIVE hidup: discord, github, githubrepo, roblox, telegram,
//    youtube, pinterest (param wajib "q" bukan "username" — beda dari docs!),
//    ttrepost, genshin, mlbb. DIKELUARKAN (mati/gak reliable pas dites live):
//    npm (403 Forbidden), facebook (selalu "not found" akun publik sekalipun),
//    tiktok (selalu "not found" akun publik sekalipun), xiaomi ("invalid params"
//    konsisten walau format id macem-macem udah dicoba).
// ═════════════════════════════════════════════

/** Spesifikasi tiap platform stalk: path, param query asli ke API, dan param yg diterima user. */
export const ZEL_STALK_REGISTRY = {
  discord: { path: "stalk/discord", queryParam: "id", label: "Discord", hint: "Discord user ID (angka, bukan username)" },
  github: { path: "stalk/github", queryParam: "username", label: "GitHub", hint: "username GitHub" },
  githubrepo: { path: "stalk/githubrepo", queryParam: null, label: "GitHub Repo", hint: "user/repo (contoh: torvalds/linux)", multiParam: { user: 0, repo: 1 }, splitBy: "/" },
  roblox: { path: "stalk/roblox", queryParam: "user", label: "Roblox", hint: "username Roblox" },
  telegram: { path: "stalk/telegram", queryParam: "username", label: "Telegram", hint: "username Telegram (tanpa @)" },
  youtube: { path: "stalk/youtube", queryParam: "query", label: "YouTube", hint: "nama channel YouTube" },
  pinterest: { path: "stalk/pinterest", queryParam: "q", label: "Pinterest", hint: "username Pinterest" },
  ttrepost: { path: "stalk/ttrepost", queryParam: "username", label: "TikTok Repost", hint: "username TikTok (tanpa @)", extra: { limit: 6 } },
  genshin: { path: "stalk/genshin", queryParam: "uid", label: "Genshin Impact", hint: "UID pemain Genshin Impact", extra: { lang: "id" } },
  mlbb: { path: "stalk/mlbb", queryParam: null, label: "Mobile Legends", hint: "userID zoneID (contoh: 123456789 1234)", multiParam: { user_id: 0, zone_id: 1 } },
};

/**
 * Cek profil/akun via kategori /stalk zelapi.
 * @param {string} platform key di ZEL_STALK_REGISTRY (discord/github/dst)
 * @param {string} query teks yang diketik user (bisa multi-token buat githubrepo/mlbb)
 * @returns {Promise<{ok:boolean, data?:object, error?:string, spec?:object}>}
 */
export async function zelStalk(platform, query) {
  const spec = ZEL_STALK_REGISTRY[platform];
  if (!spec) return { ok: false, error: `Platform "${platform}" gak ada — ketik .stalk list` };
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const text = (query || "").trim();
  if (!text) return { ok: false, error: "QUERY_KOSONG", spec };

  const p = new URLSearchParams({ apikey: key });
  if (spec.multiParam) {
    const tokens = spec.splitBy ? text.split(spec.splitBy).map((t) => t.trim()) : text.split(/\s+/);
    for (const [param, idx] of Object.entries(spec.multiParam)) {
      if (!tokens[idx]) return { ok: false, error: "PARAM_KURANG", spec };
      p.set(param, tokens[idx]);
    }
  } else {
    p.set(spec.queryParam, text);
  }
  for (const [k, v] of Object.entries(spec.extra || {})) p.set(k, String(v));

  const url = `${BASE}/${spec.path}?${p.toString()}`;
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try { return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } }); } finally { clearTimeout(t); }
  });

  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (60 dtk)" : (e?.message || "gagal koneksi"), spec };
  }
  const status = res?.status || 0;
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})`, spec };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi", spec };
  if (status !== 200) return { ok: false, error: `HTTP ${status} — ${await readZelError(res, "endpoint gagal")}`, spec };

  let data;
  try { data = await res.json(); }
  catch (e) { return { ok: false, error: "respon bukan JSON: " + (e?.message || ""), spec }; }

  if (data?.status === false) {
    return { ok: false, error: data?.message || data?.error || "akun tidak ditemukan / private", spec };
  }
  return { ok: true, data, spec };
}

// ═════════════════════════════════════════════
// 🔹 AI LYRICS GENERATOR — kategori /ai-generate zelapi
// 🔹 Owner 14 Sep: dites live — suno/sunora/melody/remusic (music generator
//    ASLI, keluar audio) SEMUA MATI (Not found / 400 / 400 / timeout).
//    Yang hidup cuma generator LIRIK TEKS: lyricsai & ailyrics.
// ═════════════════════════════════════════════

export async function zelLyrics(engine, opts = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const p = new URLSearchParams({ apikey: key });
  let path;
  if (engine === "lyricsai") {
    if (!opts.topic || !opts.topic.trim()) return { ok: false, error: "TOPIC_KOSONG" };
    path = "ai-generate/lyricsai";
    p.set("topic", opts.topic.trim());
    if (opts.style) p.set("style", opts.style);
  } else if (engine === "ailyrics") {
    if (!opts.theme || !opts.theme.trim()) return { ok: false, error: "TOPIC_KOSONG" };
    path = "ai-generate/ailyrics";
    p.set("theme", opts.theme.trim());
    if (opts.genre) p.set("genre", opts.genre);
    if (opts.emotion) p.set("emotion", opts.emotion);
    if (opts.language) p.set("language", opts.language);
  } else {
    return { ok: false, error: `Engine "${engine}" gak dikenal` };
  }

  const url = `${BASE}/${path}?${p.toString()}`;
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 40000);
    try { return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } }); } finally { clearTimeout(t); }
  });

  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (40 dtk) — server lama, coba lagi" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status} — ${await readZelError(res, "endpoint gagal")}` };

  let data;
  try { data = await res.json(); }
  catch (e) { return { ok: false, error: "respon bukan JSON: " + (e?.message || "") }; }

  if (data?.status === false) return { ok: false, error: data?.error || "endpoint mati" };

  const lyrics = data?.lyrics?.full || data?.lyrics || data?.song?.lyrics?.full || data?.song?.lyrics;
  if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
    return { ok: false, error: "lirik kosong dari server" };
  }
  return {
    ok: true,
    lyrics: lyrics.trim(),
    title: data?.title || data?.song?.title || "-",
    genre: data?.genre || data?.song?.genre || opts.style || opts.genre || "-",
  };
}
