// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zelinfo.js — scraper ZelAPI kategori /info (live verified 15 Sep 2026):
//   /info/tokengratis — direktori 24 provider AI gratis (tokengratis.id)
//   /info/gold — harga emas Treasury (price/%/movement + riwayat beli-jual)
//   /info/mountain — 10 gunung api aktif (magma.esdm.go.id)
//   /info/crypto?coin= — teknikal crypto IDR (btc/eth/bnb/sol/xrp/ada/doge): price/MA5/MA10/RSI/signal
//   /info/gfinance?q= — quote saham Google Finance (WAJIB format TICKER:EXCHANGE, contoh BBRI:IDX)
//   /info/ongkir?asal=&tujuan=&berat= — kalkulator ongkir multi-kurir
// 🔹 MATI server-side (gak dipasang): bloxfruit (403), ml (timeout), xl (ENOTFOUND),
//   tagihanpln (butuh nopel asli — gak bisa diverifikasi), cekgempa/cuaca/sholat/currency/
//   donghua/webtoon (bot udah punya fitur masing-masing).
// 🔹 STRICT SATUAN: error asli, no fallback.
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 60000;

let _http = null;
export function _setZelInfoHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelInfoKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

export const ZEL_CRYPTO_COINS = ["btc", "eth", "bnb", "sol", "xrp", "ada", "doge"];

async function infoGet(path, params = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const p = new URLSearchParams({ ...params, apikey: key });
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try { return await fetch(u, { signal: ctrl.signal }); } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(`${BASE}/info/${path}?${p.toString()}`); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT — server zelapi lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { /* bukan json */ }
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status}${data?.error ? " — " + data.error : ""}` };
  if (data?.status === false) return { ok: false, error: String(data?.error || data?.message || "endpoint balik status false").slice(0, 250) };
  return { ok: true, data };
}

/** Direktori provider AI gratis — array {name, slug, modelCount, maxContext, freeLimit, modalities, models[]} */
export async function infoTokengratis() {
  const r = await infoGet("tokengratis");
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Direktori kosong" };
  return { ok: true, total: r.data?.total || list.length, list };
}

/** Harga emas Treasury — {price, percentage, movement, prices[]} */
export async function infoGold() {
  const r = await infoGet("gold");
  if (!r.ok) return r;
  const attr = r.data?.result?.data?.attributes;
  if (!attr || !attr.price) return { ok: false, error: "Data emas kosong" };
  return { ok: true, gold: attr };
}

/** Gunung api aktif — array {name, level, author, description, detailUrl} */
export async function infoMountain() {
  const r = await infoGet("mountain");
  if (!r.ok) return r;
  const list = r.data?.data || [];
  if (!list.length) return { ok: false, error: "Laporan gunung kosong" };
  return { ok: true, list };
}

/** Teknikal crypto — {coin, update, price, ma5, ma10, rsi, signal} (harga IDR) */
export async function infoCrypto(coin) {
  const c = String(coin || "").toLowerCase().trim();
  if (!ZEL_CRYPTO_COINS.includes(c)) return { ok: false, error: `COIN_INVALID — pilihan: ${ZEL_CRYPTO_COINS.join(", ")}` };
  const r = await infoGet("crypto", { coin: c });
  if (!r.ok) return r;
  const res = r.data?.result;
  if (!res?.price) return { ok: false, error: "Data crypto kosong" };
  return { ok: true, crypto: res };
}

/** Quote saham Google Finance — q WAJIB format TICKER:EXCHANGE (auto-append :IDX kalau gak ada) */
export async function infoGfinance(q) {
  let t = String(q || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return { ok: false, error: "TICKER_EMPTY — kirim kode saham, contoh: BBRI:IDX atau .zsaham list" };
  if (!t.includes(":")) t = t + ":IDX";
  const r = await infoGet("gfinance", { q: t });
  if (!r.ok) return r;
  const quote = r.data?.quote;
  if (!quote?.price) return { ok: false, error: `Ticker ${t} gak ketemu — cek format TICKER:EXCHANGE (contoh BBRI:IDX, AAPL:NASDAQ)` };
  return { ok: true, quote };
}

/** Kalkulator ongkir — {route, couriers[{name, services[{code, description, price, estimate}]}]} */
export async function infoOngkir(asal, tujuan, berat) {
  const a = String(asal || "").trim();
  const t = String(tujuan || "").trim();
  const b = String(berat || "1").replace(/[^0-9.]/g, "") || "1";
  if (!a) return { ok: false, error: "ASAL_EMPTY — kirim kota asal" };
  if (!t) return { ok: false, error: "TUJUAN_EMPTY — kirim kota tujuan" };
  const r = await infoGet("ongkir", { asal: a, tujuan: t, berat: b });
  if (!r.ok) return r;
  const couriers = r.data?.couriers || [];
  if (!couriers.length) return { ok: false, error: "Ongkir gak kehitung — cek nama kota/kabupaten" };
  return { ok: true, route: r.data?.route || {}, couriers, weight: b };
}
