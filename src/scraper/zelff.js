// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zelff.js — scraper ZelAPI kategori /freefire (4 endpoint, live verified 15 Sep 2026):
//   /freefire/search?q=  → cari pemain (nickname → list uid/region/level/liked)
//   /freefire/profile?uid= → profil lengkap (basicinfo/clan/profileinfo)
//   /freefire/stats?uid=&mode=br|cs&type=0 → solostats/duostats/quadstats | csstats
//   /freefire/like?uid=&region= → kirim like (hanya region BERKREDENSIAL di server zelapi —
//     live test 15 Sep: cuma SG; ID/US/BR/TW/VN/TH/MY/PK/BD/IN/EU/NA/SAC/ME/CA/LATAM/CIS/MENA
//     semua "No credentials" → error asli ditampilkan strict)
// 🔹 NOTE: upstream FF zelapi FLAKY — profile/stats kadang balikin data kosong
//   (basicinfo {} / accountid "0"). Scraper DETEKSI kosong → error jelas, bukan kartu hantu.
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 90000;

let _http = null;
export function _setZelffHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelffKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

export const ZEL_FF_MODES = ["br", "cs"];
export const ZEL_FF_REGIONS = ["ID", "SG", "TW", "VN", "TH", "MY", "PK", "BD", "IN", "EU", "NA", "SA", "SAC", "RU", "BR", "ME", "CA", "LATAM", "CIS", "MENA"];

async function ffGet(path, params = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const p = new URLSearchParams({ ...params, apikey: key });
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try { return await fetch(u, { signal: ctrl.signal }); } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(`${BASE}/freefire/${path}?${p.toString()}`); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (90 dtk) — server FF lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { /* bukan json */ }
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status}) — key zelapi kosong/expired` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status}${data?.error ? " — " + data.error : ""}` };
  if (data?.status === false) return { ok: false, error: String(data?.error || data?.message || "endpoint FF balik status false").slice(0, 250) };
  return { ok: true, data };
}

/** Cari pemain FF — hasil array {accountid, nickname, region, level, exp, liked, lastloginat} */
export async function ffSearch(q) {
  if (!String(q || "").trim()) return { ok: false, error: "QUERY_EMPTY — kirim nickname-nya" };
  const r = await ffGet("search", { q: String(q).trim() });
  if (!r.ok) return r;
  const results = r.data?.results || [];
  if (!results.length) return { ok: false, error: "Pemain gak ketemu — coba nickname lain" };
  return { ok: true, results };
}

/** Profil pemain — hasil { basicinfo, profileinfo, clanbasicinfo, socialinfo?, rankingleaderboardpos } */
export async function ffProfile(uid) {
  if (!/^[0-9]{5,20}$/.test(String(uid || "").trim())) return { ok: false, error: "UID_INVALID — kirim angka UID free fire (contoh: 12817761)" };
  const r = await ffGet("profile", { uid: String(uid).trim() });
  if (!r.ok) return r;
  const d = r.data?.data || {};
  const basic = d?.basicinfo || {};
  if (!basic?.accountid || !basic?.nickname) {
    return { ok: false, error: "Profil gak keambil (upstream zelapi flaky) — coba lagi bentar" };
  }
  return { ok: true, profile: d };
}

/** Stats pemain. mode = br (solo/duo/quad) | cs (clash squad) */
export async function ffStats(uid, mode) {
  if (!/^[0-9]{5,20}$/.test(String(uid || "").trim())) return { ok: false, error: "UID_INVALID — kirim angka UID free fire" };
  const m = String(mode || "br").toLowerCase();
  if (!ZEL_FF_MODES.includes(m)) return { ok: false, error: "MODE_INVALID — pilihan: br / cs" };
  const blocks = m === "cs" ? ["csstats"] : ["solostats", "duostats", "quadstats"];
  const pick = (d) => {
    const has = blocks.some((b) => d?.[b] && String(d[b]?.accountid) !== "0");
    return has ? d : null;
  };
  // upstream zelapi FLAKY INTERMITTEN (data kadang kosong padahal valid) → retry 2x
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await ffGet("stats", { uid: String(uid).trim(), mode: m, type: "0" });
    if (r.ok) {
      const d = pick(r.data?.data);
      if (d) return { ok: true, mode: m, stats: d };
      last = "Stats gak keambil / kosong (upstream zelapi flaky) — coba lagi bentar";
    } else if (/flaky/i.test(r.error) === false && /HTTP|TIMEOUT|API_KEY|RATE/i.test(r.error)) {
      return r; // error asli (bukan kosong) — strict
    } else {
      last = r.error;
    }
    if (attempt < 3) await new Promise((res) => setTimeout(res, 1500));
  }
  return { ok: false, error: last || "Stats gak keambil — coba lagi bentar" };
}

/** Kirim like ke profil pemain — region WAJIB, zelapi cuma punya kredensial region tertentu (SG live test). */
export async function ffLike(uid, region) {
  if (!/^[0-9]{5,20}$/.test(String(uid || "").trim())) return { ok: false, error: "UID_INVALID — kirim angka UID free fire" };
  const reg = String(region || "SG").toUpperCase();
  if (!ZEL_FF_REGIONS.includes(reg)) return { ok: false, error: "REGION_INVALID — contoh region: ID, SG, BR, US gak semua tersedia di zelapi" };
  const r = await ffGet("like", { uid: String(uid).trim(), region: reg });
  if (!r.ok) return r;
  if (r.data?.result?.success !== true) return { ok: false, error: "Like gak terkirim — server zelapi nolak, coba lagi" };
  return { ok: true, region: reg, uid: String(uid).trim() };
}
