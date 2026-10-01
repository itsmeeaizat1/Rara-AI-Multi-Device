// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zelbypass.js — scraper zelapi.eu.cc kategori Bypass (18 endpoint docs,
//    diverifikasi live 14 Sep 2026 — cuma yang genuinely berguna buat user
//    chat WA yang dipasangin: shortlink bypasser (paste link → dapet link
//    tujuan asli) + fixupx (fix tweet embed).
//    HIDUP (live verified): linkvertise, fixupx, bicolink.
//    MATI (server bug, JANGAN dipasang): ouo ("browserService is not
//    defined" — bug di server zelapi, konsisten di 2 link real berbeda).
//    BELUM DIVERIFIKASI PENUH (link real gak ketemu pas tes, tapi endpoint
//    ada di docs & gak nunjukin tanda mati) — dipasang tetap, error asli
//    keluar kalau gagal: shrinkme, bypasscity, just2earn, tutwuri.
//    SENGAJA GAK DIPASANG: aliyun/captchav2/cloudflare/cloudflareuam/
//    geetest/kasada/recaptchav3/turnstile/cors-proxy — solver captcha
//    teknis (butuh sitekey/pageUrl, bukan alur "paste link" biasa user
//    WA) + terabox (udah ada 3 implementasi downloader lain di bot).
// 🔹 STRICT: status:false / HTTP error → error ASLI keluar, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 45000;

// seam test
let _http = null;
export function _setZelBypassHttpForTest(fn) { _http = fn; }
export function _resetZelBypassHttpForTest() { _http = null; }
let _keyForTest;
export function _setZelBypassKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

// Provider yang beneran dipasang (path shortlink/link-fix — bukan captcha solver teknis)
export const BYPASS_PROVIDERS = {
  linkvertise: { path: "/bypass/linkvertise", label: "Linkvertise", hosts: ["linkvertise.com", "link-target.net", "up-to-down.net"] },
  shrinkme: { path: "/bypass/shrinkme", label: "ShrinkMe", hosts: ["shrinkme.io"] },
  bicolink: { path: "/bypass/bicolink", label: "Bicolink", hosts: ["bicolink.com"] },
  bypasscity: { path: "/bypass/bypasscity", label: "Bypass City", hosts: ["bypass.city"] },
  just2earn: { path: "/bypass/just2earn", label: "Just2Earn", hosts: ["just2earn.com"] },
  tutwuri: { path: "/bypass/tutwuri", label: "Tutwuri", hosts: ["tutwuri.id"] },
};

/** Deteksi provider dari host URL. Return null kalau gak dikenali. */
export function detectBypassProvider(url) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
  for (const [key, p] of Object.entries(BYPASS_PROVIDERS)) {
    if (p.hosts.some((h) => host === h || host.endsWith("." + h))) return key;
  }
  return null;
}

async function doFetch(url) {
  const fn = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    } finally { clearTimeout(t); }
  });
  return fn(url);
}

async function readErr(res, fallback) {
  try {
    const j = await res.json();
    if (j?.error) return String(j.error).slice(0, 250);
  } catch {}
  return fallback;
}

/**
 * Bypass shortlink (Linkvertise/ShrinkMe/Bicolink/BypassCity/Just2Earn/Tutwuri)
 * → link tujuan asli.
 * @param {string} providerKey salah satu key di BYPASS_PROVIDERS
 * @param {string} url shortlink yang mau di-bypass
 */
export async function zelBypassLink(providerKey, url) {
  const provider = BYPASS_PROVIDERS[providerKey];
  if (!provider) return { ok: false, error: `provider "${providerKey}" gak dikenal` };
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: "URL_INVALID" };

  const qs = new URLSearchParams({ url, apikey: key });
  const fullUrl = `${BASE}${provider.path}?${qs.toString()}`;

  let res;
  try { res = await doFetch(fullUrl); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? `TIMEOUT (${TIMEOUT_MS / 1000} dtk) — server lama jawab` : (e?.message || "gagal koneksi") };
  }

  const status = res?.status || 0;
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status} — ${await readErr(res, "endpoint gagal / link gak valid")}` };

  let data;
  try { data = await res.json(); }
  catch (e) { return { ok: false, error: "respon bukan JSON: " + (e?.message || "") }; }

  if (data?.status === false) return { ok: false, error: data?.error || "gagal bypass link ini" };

  const dest = data?.bypassed_url || data?.result?.destination || data?.destination || data?.result?.url || data?.url;
  if (!dest) return { ok: false, error: "link tujuan gak ketemu di respons" };
  return { ok: true, destination: dest, provider: provider.label };
}

/**
 * Fix embed tweet via FixupX — otomatis ganti domain twitter.com/x.com jadi
 * fixupx.com dulu (API-nya emang wajib format fixupx.com).
 * @param {string} tweetUrl link tweet (x.com / twitter.com / fixupx.com)
 */
export async function zelFixupxTweet(tweetUrl) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  if (!tweetUrl || !/^https?:\/\//i.test(tweetUrl)) return { ok: false, error: "URL_INVALID" };

  let normalized;
  try {
    const u = new URL(tweetUrl);
    const host = u.hostname.replace(/^www\./, "");
    if (!["twitter.com", "x.com", "fixupx.com", "fxtwitter.com"].includes(host)) {
      return { ok: false, error: "URL harus link tweet dari twitter.com / x.com" };
    }
    u.hostname = "fixupx.com";
    normalized = u.toString();
  } catch {
    return { ok: false, error: "URL_INVALID" };
  }

  const qs = new URLSearchParams({ url: normalized, apikey: key });
  const fullUrl = `${BASE}/bypass/fixupx?${qs.toString()}`;

  let res;
  try { res = await doFetch(fullUrl); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? `TIMEOUT (${TIMEOUT_MS / 1000} dtk) — server lama jawab` : (e?.message || "gagal koneksi") };
  }

  const status = res?.status || 0;
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200 && status !== 400) return { ok: false, error: `HTTP ${status} — ${await readErr(res, "endpoint gagal")}` };

  let data;
  try { data = await res.json(); }
  catch (e) { return { ok: false, error: "respon bukan JSON: " + (e?.message || "") }; }

  if (data?.status === false || data?.ok === false) return { ok: false, error: data?.error || "gagal ambil tweet ini" };

  const tweet = data?.tweet || {};
  const user = data?.user || {};
  return {
    ok: true,
    text: tweet.text || "",
    media: Array.isArray(tweet.media) ? tweet.media : [],
    likes: tweet.favorite_count,
    retweets: tweet.retweet_count,
    replies: tweet.reply_count,
    views: tweet.view_count,
    username: user.screen_name || user.username,
    name: user.name,
  };
}
