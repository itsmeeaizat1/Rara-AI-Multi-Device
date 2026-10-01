// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-pacific.js — API client Pacific Pedia SMM (api.pacific-pedia.co.id)
// Auto order layanan sosmed (followers/likes/views/dll): profile, layanan,
// pemesanan, status, refill. Auth CUMA api_key (tanpa api_id/signature),
// POST form-urlencoded (JSON ditolak "Permintaan Tidak Sesuai" — teruji live).
// Rate: "1000" = harga per 1000 pesanan · "1" = harga mutlak per paket.
// Kredensial disimpan owner via .autoorder pacific <api_key> (db, bukan repo).
import axios from "axios";

const PAC_PROFILE = process.env.PACIFIC_API_URL || "https://api.pacific-pedia.co.id/profile";
const PAC_MAIN = process.env.PACIFIC_API_MAIN_URL || "https://api.pacific-pedia.co.id/s2";

// ── http seam buat e2e ──
let _http = null;
export function _setPacificHttpForTest(h) { _http = h; }
export function _resetPacificHttpForTest() { _http = null; }
const http = () => _http || axios;

async function pacPost(cfg, url, fields) {
  const key = cfg?.pacific?.apiKey;
  if (!key) return { ok: false, error: "kredensial Pacific belum di-set (.autoorder pacific <api_key>)" };
  const form = new URLSearchParams();
  form.append("api_key", String(key));
  for (const [k, v] of Object.entries(fields || {})) {
    if (v !== undefined && v !== null && v !== "") form.append(k, String(v));
  }
  let resp;
  try {
    resp = await http().post(url, form, { timeout: 25000 });
  } catch (e) {
    return { ok: false, error: `jaringan gagal: ${e?.message || e}` };
  }
  const data = resp?.data;
  if (data?.status === false) return { ok: false, error: String(data?.data?.pesan || data?.pesan || "API menolak permintaan") };
  if (data?.status !== true) return { ok: false, error: "respon API gak dikenal" };
  return { ok: true, data: data.data };
}

// ── profile: nama + saldo sosmed ──
export async function pacProfile(cfg) {
  const r = await pacPost(cfg, PAC_PROFILE, { action: "profile" });
  if (!r.ok) return r;
  return { ok: true, data: r.data || {} };
}

// ── daftar layanan aktif ──
export async function pacServices(cfg) {
  const r = await pacPost(cfg, PAC_MAIN, { action: "layanan" });
  if (!r.ok) return r;
  const list = (Array.isArray(r.data) ? r.data : [])
    .filter((s) => s?.sid)
    .map((s) => ({
      sid: String(s.sid),
      kategori: String(s.kategori || ""),
      layanan: String(s.layanan || ""),
      catatan: String(s.catatan || ""),
      min: Number(s.min) || 0,
      max: Number(s.max) || 0,
      harga: Number(s.harga) || 0,
      tipe: String(s.tipe || ""),
      refill: !!s.refill,
      cancel: !!s.cancel,
      rate: String(s.rate || "1000"),
    }));
  return { ok: true, list };
}

export async function pacFindService(cfg, sid) {
  const r = await pacServices(cfg);
  if (!r.ok) return r;
  const svc = r.list.find((s) => s.sid === String(sid));
  if (!svc) return { ok: false, error: `layanan sid ${sid} gak ketemu/aktif — cek .smmlist` };
  return { ok: true, svc };
}

// ── harga modal: rate "1" = harga mutlak · rate "1000" = per 1000 pesanan ──
export function pacPrice(svc, jumlah) {
  if (!svc || !Number.isFinite(jumlah) || jumlah <= 0) return null;
  if (svc.rate === "1") return svc.harga;
  return Math.ceil((jumlah / 1000) * svc.harga);
}

// ── buat pesanan (balikin id pesanan Pacific) ──
export async function pacOrder(cfg, { sid, target, jumlah, customLink = "", comments = "" }) {
  const r = await pacPost(cfg, PAC_MAIN, {
    action: "pemesanan", layanan: sid, target, jumlah,
    ...(customLink ? { custom_link: customLink } : {}),
    ...(comments ? { comments } : {}),
  });
  if (!r.ok) return r;
  if (!r.data?.id) return { ok: false, error: "respon order gak ada id" };
  return { ok: true, data: r.data };
}

// ── cek status pesanan (Pending/Processing/Success/Partial/Error/…) ──
export async function pacStatus(cfg, id) {
  const r = await pacPost(cfg, PAC_MAIN, { action: "status", id });
  if (!r.ok) return r;
  return { ok: true, data: r.data || {} };
}

// ── ajukan refill (layanan refill: true) ──
export async function pacRefill(cfg, id) {
  const r = await pacPost(cfg, PAC_MAIN, { action: "refill", id });
  if (!r.ok) return r;
  return { ok: true, data: r.data || {} };
}

// id internal buat QRIS/struk (id pesanan Pacific dipisah — bentuk angka)
export function smmOrderId(buyerSeed = "") {
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "SMM-" + Date.now().toString(36).toUpperCase() + "-" + String(buyerSeed).replace(/\W/g, "").slice(0, 6).toUpperCase() + "-" + rnd;
}
