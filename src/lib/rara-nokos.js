// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-nokos.js — API client 5SIM (5sim.net) — auto order nomor kosong (nokos).
// Dari script website PHP buynokos (dulu numpang rumahotp.com — provider itu
// MATI, domain dijual GoDaddy, verifikasi 28 Sep 2026) → diganti ke 5SIM:
// REST modern, Bearer token, harga guest tanpa key, stok real-time, refund
// otomatis ke saldo provider saat nomor di-cancel sebelum OTP datang.
// Alur: guest prices (modal) → QRIS lunas → /user/buy → pantau /user/check
// (OTP) → struk DM · gak OTP → /user/cancel (saldo provider balik, refund WA
// manual via owner). Kredensial owner: .autoorder nokos <api_token> (db, bukan repo).
// Referensi: https://5sim.net/docs — GET /v1/guest/prices?country=X&product=Y,
// GET /v1/user/buy/{country}/{operator}/{product}, /v1/user/check/{id},
// /v1/user/cancel/{id}, /v1/user/finish/{id}, /v1/user/profile.
import axios from "axios";

const FIVESIM_BASE = process.env.FIVESIM_API_URL || "https://5sim.net/v1";

// kurs estimasi USD→IDR (harga guest 5SIM dalam USD) — env biar gampang di-tweak
const USD_RATE = Number(process.env.NOKOS_USD_RATE) > 0 ? Number(process.env.NOKOS_USD_RATE) : 16500;

// ── http seam buat e2e ──
let _http = null;
export function _setNokosHttpForTest(h) { _http = h; }
export function _resetNokosHttpForTest() { _http = null; }
const http = () => _http || axios;

// ── kurasi daftar (slug resmi 5SIM, diverifikasi live 28 Sep 2026) ──
export const NOKOS_PRODUCTS = [
  { slug: "whatsapp", label: "WhatsApp", alias: ["wa", "whts", "wapp"] },
  { slug: "telegram", label: "Telegram", alias: ["tg", "tele", "telegran"] },
  { slug: "facebook", label: "Facebook", alias: ["fb", "fesbuk"] },
  { slug: "instagram", label: "Instagram", alias: ["ig", "insta"] },
  { slug: "google", label: "Google / Gmail", alias: ["gogle", "gmail", "googel"] },
  { slug: "tiktok", label: "TikTok", alias: ["tt", "tik tok"] },
  { slug: "discord", label: "Discord", alias: ["dsc", "diskord"] },
  { slug: "twitter", label: "Twitter / X", alias: ["twt", "x", "titer"] },
  { slug: "line", label: "LINE", alias: ["ln"] },
  { slug: "youtube", label: "YouTube", alias: ["yt", "yutub"] },
  { slug: "shopee", label: "Shopee", alias: ["spp"] },
  { slug: "tokopedia", label: "Tokopedia", alias: ["tkp", "tokped"] },
  { slug: "gojek", label: "Gojek", alias: ["gjk"] },
  { slug: "grab", label: "Grab", alias: ["grb"] },
  { slug: "dana", label: "DANA", alias: ["dna"] },
  { slug: "ovo", label: "OVO", alias: ["ovoaja"] },
];

export const NOKOS_COUNTRIES = [
  { slug: "indonesia", label: "Indonesia", alias: ["indo", "id", "ri"] },
  { slug: "philippines", label: "Filipina", alias: ["pilipin", "pilipina", "ph", "pinoy"] },
  { slug: "malaysia", label: "Malaysia", alias: ["mly", "malay"] },
  { slug: "thailand", label: "Thailand", alias: ["th", "thai"] },
  { slug: "vietnam", label: "Vietnam", alias: ["vn", "vietnamn"] },
  { slug: "singapore", label: "Singapura", alias: ["sg", "singapur"] },
  { slug: "usa", label: "Amerika Serikat", alias: ["us", "amerika", "united states", "unitedstates"] },
  { slug: "england", label: "Inggris", alias: ["uk", "inggris", "britain"] },
  { slug: "germany", label: "Jerman", alias: ["de", "jermn"] },
  { slug: "russia", label: "Rusia", alias: ["ru", "rusi"] },
  { slug: "india", label: "India", alias: ["in", "india"] },
  { slug: "china", label: "China", alias: ["cn", "cina", "tiongkok"] },
  { slug: "japan", label: "Jepang", alias: ["jp", "jepang", "nippon"] },
  { slug: "hongkong", label: "Hong Kong", alias: ["hk"] },
  { slug: "netherlands", label: "Belanda", alias: ["nl", "belanda", "oland"] },
];

// fuzzy cari produk/negara dari input bebas ("wa", "ig", "gogle", "indo", "pilipin")
function fuzzy(list, q) {
  const qq = String(q || "").toLowerCase().trim();
  if (!qq) return null;
  return (
    list.find((x) => x.slug === qq) ||
    list.find((x) => (x.alias || []).includes(qq)) ||
    list.find((x) => x.label.toLowerCase() === qq) ||
    list.find((x) => x.label.toLowerCase().startsWith(qq)) ||
    list.find((x) => x.slug.includes(qq) && qq.length >= 2) ||
    list.find((x) => x.label.toLowerCase().includes(qq)) ||
    null
  );
}
export function findProduct(q) { return fuzzy(NOKOS_PRODUCTS, q); }
export function findCountry(q) { return fuzzy(NOKOS_COUNTRIES, q); }

export function usdToRupiah(usd) {
  const v = Number(usd);
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * USD_RATE);
}
export { USD_RATE as NOKOS_USD_RATE };

// ── guest: harga produk di negara (TANPA key — buat nampilin modal/stok) ──
// respon: { <country>: { <product>: { <operator>: {cost, count, rate*} } } }
export async function nokosPrices(country, product) {
  let resp;
  try {
    resp = await http().get(`${FIVESIM_BASE}/guest/prices`, {
      params: { country, product },
      timeout: 20000,
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    return { ok: false, error: `jaringan gagal: ${e?.message || e}` };
  }
  const d = resp?.data?.[country]?.[product];
  if (!d || typeof d !== "object") return { ok: false, error: "harga produk/negara itu gak ketemu di 5SIM" };
  const list = Object.entries(d)
    .map(([operator, v]) => ({
      operator,
      cost: Number(v?.cost) || 0,
      count: Number(v?.count) || 0,
    }))
    .filter((x) => x.cost > 0)
    .sort((a, b) => a.cost - b.cost);
  if (!list.length) return { ok: false, error: "harga gak tersedia buat kombinasi itu" };
  return { ok: true, list };
}

// operator termurah yang PUNYA STOK (null kalau semua kosong)
export function cheapestInStock(prices) {
  if (!Array.isArray(prices)) return null;
  return prices.find((p) => p.count > 0) || null;
}

// ── helper auth GET ──
async function authGet(cfg, path) {
  const key = cfg?.nokos?.apiKey;
  if (!key) return { ok: false, error: "kredensial 5SIM belum di-set (.autoorder nokos <api_token>)" };
  let resp;
  try {
    resp = await http().get(`${FIVESIM_BASE}${path}`, {
      timeout: 25000,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
  } catch (e) {
    const st = e?.response?.status;
    if (st === 401) return { ok: false, error: "API token 5SIM ditolak (401) — cek ulang token di 5sim.net (menu Profile)" };
    if (st === 404) return { ok: false, error: "endpoint gak ketemu (404) — id salah atau order udah lewat" };
    const msg = e?.response?.data?.message || e?.message || e;
    return { ok: false, error: `jaringan gagal: ${msg}` };
  }
  return { ok: true, data: resp?.data };
}

// ── profile: saldo + mata uang akun ──
export async function nokosProfile(cfg) {
  const r = await authGet(cfg, "/user/profile");
  if (!r.ok) return r;
  return { ok: true, data: r.data || {} };
}

// ── beli nomor: GET /user/buy/{country}/{operator}/{product} ──
// respon: { id, phone, price, country, product, expires, status: PENDING }
export async function nokosBuy(cfg, { country, operator, product }) {
  const r = await authGet(cfg, `/user/buy/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`);
  if (!r.ok) return r;
  const d = r.data || {};
  if (!d.id || !(d.phone || d.telephone)) return { ok: false, error: "respon 5SIM gak ada id/nomor" };
  return { ok: true, data: {
    id: String(d.id),
    phone: String(d.phone || d.telephone),
    price: Number(d.price) || 0,
    expires: d.expires || "",
    status: String(d.status || "PENDING"),
  } };
}

// ── cek OTP: GET /user/check/{id} ──
// PENDING = belum ada SMS · RECEIVED = OTP datang (sms[0].code)
export async function nokosCheck(cfg, id) {
  const r = await authGet(cfg, `/user/check/${encodeURIComponent(id)}`);
  if (!r.ok) return r;
  const d = r.data || {};
  const sms = Array.isArray(d.sms) ? d.sms : [];
  return { ok: true, data: { status: String(d.status || "PENDING"), sms } };
}

// ── cancel (refund otomatis ke saldo 5SIM kalau OTP belum datang) ──
export async function nokosCancel(cfg, id) {
  const r = await authGet(cfg, `/user/cancel/${encodeURIComponent(id)}`);
  if (!r.ok) return r;
  return { ok: true, data: { status: String(r.data?.status || "CANCELED") } };
}

// ── finish: konfirmasi OTP diterima (selesai, bukan cancel) ──
export async function nokosFinish(cfg, id) {
  const r = await authGet(cfg, `/user/finish/${encodeURIComponent(id)}`);
  if (!r.ok) return r;
  return { ok: true, data: { status: String(r.data?.status || "FINISHED") } };
}

// id internal buat QRIS/struk (id order 5SIM dipisah — bentuk angka)
export function nokosOrderId(buyerSeed = "") {
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "NOK-" + Date.now().toString(36).toUpperCase() + "-" + String(buyerSeed).replace(/\W/g, "").slice(0, 6).toUpperCase() + "-" + rnd;
}
