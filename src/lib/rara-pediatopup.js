// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-pediatopup.js — API client PanelPedia TopUp (panelpediatopup.com)
// Auto order layanan topup game/SMM: profile, service, order, status.
// Auth: api_id + api_key + signature = md5(API ID + API KEY) (dok /api/docs).
// Kredensial DISIMPAN owner via .autoorder pediatopup <api_id> <api_key>
// (db.data.autoorder.pediatopup) — JANGAN hardcode di repo.
import crypto from "node:crypto";
import axios from "axios";

const PEDIA_BASE = process.env.PEDIATOPUP_API_URL || "https://panelpediatopup.com/api";

// ── http seam buat e2e ──
let _http = null;
export function _setPediaHttpForTest(h) { _http = h; }
export function _resetPediaHttpForTest() { _http = null; }
const http = () => _http || axios;

export function pediaSign(apiId, apiKey) {
  return crypto.createHash("md5").update(String(apiId) + String(apiKey)).digest("hex");
}

async function pediaPost(cfg, path, extra = {}) {
  const p = cfg?.pediatopup || {};
  if (!p.apiId || !p.apiKey) return { ok: false, error: "kredensial PanelPedia belum di-set (.autoorder pediatopup <api_id> <api_key>)" };
  const body = { api_id: p.apiId, api_key: p.apiKey, signature: pediaSign(p.apiId, p.apiKey), ...extra };
  let resp;
  try {
    resp = await http().post(`${PEDIA_BASE}/${path}`, body, { timeout: 20000, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return { ok: false, error: `jaringan gagal: ${e?.message || e}` };
  }
  const data = resp?.data;
  if (data?.blocked) return { ok: false, error: String(data.msg || "akun diblokir provider") };
  if (data?.status === false) return { ok: false, error: String(data.msg || "API menolak permintaan"), code: data.code || null };
  return { ok: true, data };
}

// ── profile: saldo + level akun (role → harga) ──
export async function pediaProfile(cfg) {
  const r = await pediaPost(cfg, "profile");
  if (!r.ok) return r;
  const d = r.data?.data;
  if (!d) return { ok: false, error: "respon profile gak dikenal" };
  return { ok: true, data: d };
}

// level akun → key harga layanan (contoh respon role: "Platinum"/"Gold"/"Basic")
export function pediaPriceKey(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("platinum")) return "platinum";
  if (r.includes("gold")) return "gold";
  return "basic";
}

// ── services: daftar layanan aktif (harga per level) ──
export async function pediaServices(cfg) {
  const r = await pediaPost(cfg, "service");
  if (!r.ok) return r;
  const arr = Array.isArray(r.data) ? r.data : [r.data];
  const list = arr
    .filter((x) => x?.status === true && x?.data?.id)
    .map((x) => ({
      id: String(x.data.id),
      game: String(x.data.game || ""),
      name: String(x.data.nama_layanan || ""),
      harga: x.data.harga || {},
      status: String(x.data.status || ""),
    }));
  return { ok: true, list };
}

export async function pediaFindService(cfg, serviceId) {
  const r = await pediaServices(cfg);
  if (!r.ok) return r;
  const svc = r.list.find((s) => s.id === String(serviceId));
  if (!svc) return { ok: false, error: `layanan id ${serviceId} gak ketemu/aktif — cek .topuplist` };
  return { ok: true, svc };
}

// ── order: buat pesanan (order_id unik buatan pemanggil, WAJIB beda tiap order) ──
export async function pediaOrder(cfg, { orderId, serviceId, targetId, targetServer = "" }) {
  const extra = { order_id: String(orderId), service_id: String(serviceId), target_id: String(targetId) };
  if (targetServer) extra.target_server = String(targetServer);
  const r = await pediaPost(cfg, "order", extra);
  if (!r.ok) return r;
  const d = r.data?.data;
  if (!d) return { ok: false, error: "respon order gak dikenal" };
  return { ok: true, data: d };
}

// ── status: cek pesanan (Proses / Sukses / Gagal / Refund) ──
export async function pediaStatus(cfg, orderId) {
  const r = await pediaPost(cfg, "status", { order_id: String(orderId) });
  if (!r.ok) return r;
  const d = r.data?.data;
  if (!d) return { ok: false, error: "respon status gak dikenal" };
  return { ok: true, data: d };
}

// order id unik (API nolak duplikat "order_id sudah tersedia pada sistem kami")
export function pediaOrderId(buyerSeed = "") {
  const rnd = crypto.randomBytes(2).toString("hex").toUpperCase();
  return "TOP-" + Date.now().toString(36).toUpperCase() + "-" + String(buyerSeed).replace(/\W/g, "").slice(0, 6).toUpperCase() + "-" + rnd;
}
