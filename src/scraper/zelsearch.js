// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zelsearch.js — scraper ZelAPI kategori /search (live verified 15 Sep 2026):
//   /search/apkmody?q= — cari APK mod (name/version/feature/url)
//   /search/cookpad?q= — cari resep cookpad (title/prepTime/servings/url)
//   /search/detikcom?q= — cari berita detik (title/channel/url)
//   /search/deviantart?q= — cari art deviantart (title/artist/url)
//   /search/dns?domain= — DNS lookup lengkap (A/AAAA/MX/TXT/NS/CNAME/SOA/CAA)
//   /search/groupwa?q= — cari grup WA (name/link)
//   /search/hiitwixtor?q= — cari twixtor clips anime (title/views/link)
//   /search/jadwaltv?channel= — jadwal tayang TV (time/title)
//   /search/acode?q= — plugin editor Acode (name/version/downloads/rating/link)
// 🔹 MATI server-side (gak dipasang): baidu (timeout), komiku (403), sound (403),
//   stickerly (400), surah (407), tokopedia (407), cekbansos (timeout >90s),
//   jikan (upstream 504), tevi (hasil cuma personal space — noise).
// 🔹 DUP bot (diskip): applemusic/buildml/gsmarena/kbbi/mcpedl/npm/pddikti/loker/
//   lirik/shazam/pinterest/pixiv/soundcloud/spotify/tiktok/douyin/wattpad/lahelu/
//   happymod/snackvideo/youtube/dns? (bot punya .zdomain tapi beda fungsi — ini records).
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 60000;

let _http = null;
export function _setZelSearchHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelSearchKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

async function searchGet(path, params = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const p = new URLSearchParams({ ...params, apikey: key });
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try { return await fetch(u, { signal: ctrl.signal }); } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(`${BASE}/search/${path}?${p.toString()}`); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT — server zelapi lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { /* bukan json */ }
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status}${data?.error || data?.message ? " — " + (data?.error || data?.message) : ""}` };
  if (data?.status === false) return { ok: false, error: String(data?.error || data?.message || "endpoint balik status false").slice(0, 250) };
  return { ok: true, data };
}

const needQ = (q, label) => {
  const s = String(q || "").trim();
  if (!s) return { ok: false, error: `QUERY_EMPTY — kirim ${label}` };
  return null;
};

/** APK mod — results[{name, version, feature, icon, slug, url}] */
export async function zsApkmody(q) {
  const e = needQ(q, "nama aplikasi"); if (e) return e;
  const r = await searchGet("apkmody", { q: String(q).trim() });
  if (!r.ok) return r;
  const list = r.data?.results || [];
  if (!list.length) return { ok: false, error: "APK gak ketemu — coba nama lain" };
  return { ok: true, total: r.data?.total || list.length, list };
}

/** Resep cookpad — results[{id, title, prepTime, servings, url}] */
export async function zsCookpad(q) {
  const e = needQ(q, "nama masakan"); if (e) return e;
  const r = await searchGet("cookpad", { q: String(q).trim() });
  if (!r.ok) return r;
  const list = r.data?.results || [];
  if (!list.length) return { ok: false, error: "Resep gak ketemu — coba kata kunci lain" };
  return { ok: true, list };
}

/** Berita detik — results[{title, url, channel, description}] */
export async function zsDetik(q) {
  const e = needQ(q, "kata kunci berita"); if (e) return e;
  const r = await searchGet("detikcom", { q: String(q).trim() });
  if (!r.ok) return r;
  const list = r.data?.results || [];
  if (!list.length) return { ok: false, error: "Berita gak ketemu" };
  return { ok: true, total: r.data?.total_results || list.length, list };
}

/** Art deviantart — data[{title(messy), url, artist, thumbnail}] */
export async function zsDeviantart(q) {
  const e = needQ(q, "kata kunci art"); if (e) return e;
  const r = await searchGet("deviantart", { q: String(q).trim(), page: "1" });
  if (!r.ok) return r;
  const list = (r.data?.data || []).map((d) => ({
    ...d,
    cleanTitle: String(d.title || "").split(" on DeviantArt")[0].split(/https?:\/\//)[0].trim() || "untitled",
  }));
  if (!list.length) return { ok: false, error: "Art gak ketemu" };
  return { ok: true, total: r.data?.total || list.length, list };
}

/** DNS lookup — records{A,AAAA,MX,TXT,NS,CNAME,SOA,CAA,...} */
export const ZS_DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA"];
export async function zsDns(domain) {
  const d = String(domain || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!d || !/\./.test(d)) return { ok: false, error: "DOMAIN_INVALID — kirim nama domain, contoh: .zdns google.com" };
  const r = await searchGet("dns", { domain: d });
  if (!r.ok) return r;
  const records = r.data?.records || {};
  const any = ZS_DNS_TYPES.some((t) => (records[t] || []).length);
  if (!any) return { ok: false, error: `Records ${d} kosong / domain gak aktif` };
  return { ok: true, domain: r.data?.domain || d, records };
}

/** Cari grup WA — result[{name, link, description}] */
export async function zsGroupwa(q) {
  const e = needQ(q, "topik grup"); if (e) return e;
  const r = await searchGet("groupwa", { q: String(q).trim() });
  if (!r.ok) return r;
  const list = r.data?.result || [];
  if (!list.length) return { ok: false, error: "Grup gak ketemu" };
  return { ok: true, total: r.data?.total || list.length, list };
}

/** Twixtor clips anime — results[{title, views, comments, link, image}] */
export async function zsTwixtor(q) {
  const e = needQ(q, "nama anime"); if (e) return e;
  const r = await searchGet("hiitwixtor", { q: String(q).trim() });
  if (!r.ok) return r;
  const list = r.data?.results || [];
  if (!list.length) return { ok: false, error: "Clip gak ketemu" };
  return { ok: true, list };
}

/** Jadwal TV — jadwal[{time, title}] */
export async function zsJadwalTv(channel) {
  const c = String(channel || "").trim();
  if (!c) return { ok: false, error: "CHANNEL_EMPTY — kirim nama channel: rcti / gtv / mnctv / sctv / indosiar / trans7 / transtv / kompastv / tvone / metrotv" };
  const r = await searchGet("jadwaltv", { channel: c });
  if (!r.ok) return r;
  const jadwal = r.data?.jadwal || [];
  if (!jadwal.length) return { ok: false, error: `Channel "${c}" gak ketemu / jadwal kosong` };
  return { ok: true, channel: r.data?.channel || c.toUpperCase(), jadwal };
}

/** Plugin editor Acode — results[{id, name, version, author, downloads, rating, link}] */
export async function zsAcode(q) {
  const e = needQ(q, "nama plugin"); if (e) return e;
  const r = await searchGet("acode", { q: String(q).trim() });
  if (!r.ok) return r;
  const list = r.data?.result?.results || [];
  if (!list.length) return { ok: false, error: "Plugin gak ketemu" };
  return { ok: true, list };
}
