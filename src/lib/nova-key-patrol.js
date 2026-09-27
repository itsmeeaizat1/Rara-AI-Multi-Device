// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-key-patrol.js — AUTO KEY PATROL (27 Sep 2026, fitur automation no.1).
// Tiap 6 jam tes SEMUA api key yang udah diisi ke endpoint ringan
// masing-masing provider. Key mati/kedaluwarsa gak nunggu fitur error:
//   - HIDUP→MATI  → DM owner SEGERA 🔴 (sekalian link console buat ganti)
//   - MATI→HIDUP  → DM owner 🟢 (key balik idup)
//   - kondisi tetap → gak spam DM (cuma keliatan di .keypatrol status)
//   - Laporan lengkap semua key → mingguan Minggu 08:00 WIB / .keypatrol lapor
// Klasifikasi jujur: HIDUP (2xx/429) · MATI (401/403/invalid dari provider)
// · RUSAK (5xx/jaringan — gak dituduh mati) · KOSONG (belum diisi).
// Key tanpa endpoint tes murah ditampilin jujur "gak didukung tes".
// Dipakai oleh: plugins/owner/keypatrol.js + scheduler "KeyPatrol" index.js.

import { getDatabase } from "./nova-database.js";
import { getApiKey, API_KEYS } from "./nova-api-keys.js";
import { getProviderApiKey } from "./apikey/ai-chain.js";
import { getTioBase } from "./config/env-loader.js";
import { boxLeft } from "./styler.js";
import config from "../../config.js";

const HOUR_MS = 3600 * 1000;
const TICK_MS = 6 * HOUR_MS; // patrol tiap 6 jam
const PROBE_TIMEOUT_MS = 10_000;
const WEEKLY_JAM = "08:00"; // Minggu 08:00 WIB
const LOG_CAP = 200;

let _nowImpl = null;
export function _setKeyPatrolNowForTest(fn) { _nowImpl = fn; }
export function _clearKeyPatrolNowForTest() { _nowImpl = null; }
function nowMs() { return typeof _nowImpl === "function" ? _nowImpl() : Date.now(); }

let _ownerJidImpl = null;
export function _setKeyPatrolOwnerJidForTest(fn) { _ownerJidImpl = fn; }
export function _clearKeyPatrolOwnerJidForTest() { _ownerJidImpl = null; }
function ownerJid() {
  if (typeof _ownerJidImpl === "function") return _ownerJidImpl();
  try {
    const raw = Array.isArray(config?.owner) ? config.owner[0] : config?.owner;
    const num = String(raw || "").replace(/\D/g, "");
    return num ? `${num}@s.whatsapp.net` : null;
  } catch { return null; }
}

// ── http seam (e2e: tanpa panggilan API beneran) ───────────────────────
let _httpImpl = null;
export function _setKeyPatrolHttpForTest(fn) { _httpImpl = fn; }
export function _clearKeyPatrolHttpForTest() { _httpImpl = null; }
async function httpProbe(url, opts = {}) {
  if (typeof _httpImpl === "function") return _httpImpl(url, opts);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    const body = await res.text().catch(() => "");
    return { status: res.status, body };
  } finally { clearTimeout(t); }
}

// ── sumber kredensial auto-order (db.data.autoorder) ──────────────────
function autoOrderCfg() {
  try { return getDatabase().data?.autoorder || {}; } catch { return {}; }
}

// ── tabel probe: key yang BISA dites murah ───────────────────────────
// req(key) → permintaan ringan; isDead(status, body) → key ditolak?
export const KEY_PROBES = {
  gemini: {
    label: "Gemini",
    getKey: () => getApiKey("gemini"),
    link: () => "https://aistudio.google.com/apikey",
    req: (k) => ({ url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`, method: "GET" }),
    isDead: (s, b) => s === 400 || s === 403 || /api key not valid/i.test(b || ""),
  },
  openai: {
    label: "OpenAI",
    getKey: () => getApiKey("openai"),
    link: () => "https://platform.openai.com/api-keys",
    req: (k) => ({ url: "https://api.openai.com/v1/models", method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  anthropic: {
    label: "Anthropic",
    getKey: () => getApiKey("anthropic"),
    link: () => "https://console.anthropic.com/settings/keys",
    req: (k) => ({ url: "https://api.anthropic.com/v1/models", method: "GET", headers: { "x-api-key": k, "anthropic-version": "2023-06-01" } }),
    isDead: (s) => s === 401 || s === 403,
  },
  groq: {
    label: "Groq",
    getKey: () => getApiKey("groq"),
    link: () => "https://console.groq.com/keys",
    req: (k) => ({ url: "https://api.groq.com/openai/v1/models", method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  xai: {
    label: "xAI Grok",
    getKey: () => getApiKey("xai") || getApiKey("grok"),
    link: () => "https://console.x.ai",
    req: (k) => ({ url: "https://api.x.ai/v1/models", method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  router9v2: {
    label: "9Router V2",
    getKey: () => getApiKey("router9v2"),
    link: () => String(getTioBase() || "https://9router.cloudku.us.kg"),
    req: (k) => ({ url: `${String(getTioBase() || "https://9router.cloudku.us.kg").replace(/\/$/, "")}/v1/models`, method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  deepseek: {
    label: "DeepSeek",
    getKey: () => getProviderApiKey("deepseek"),
    link: () => "https://platform.deepseek.com/api_keys",
    req: (k) => ({ url: "https://api.deepseek.com/models", method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  zhipu: {
    label: "Zhipu GLM",
    getKey: () => getProviderApiKey("zhipu"),
    link: () => "https://open.bigmodel.cn",
    req: (k) => ({ url: "https://open.bigmodel.cn/api/paas/v4/models", method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  kimi: {
    label: "Kimi Moonshot",
    getKey: () => getProviderApiKey("kimi"),
    link: () => "https://platform.moonshot.cn/console/api-keys",
    req: (k) => ({ url: "https://api.moonshot.cn/v1/models", method: "GET", headers: { Authorization: `Bearer ${k}` } }),
    isDead: (s) => s === 401 || s === 403,
  },
  pacific: {
    label: "Pacific SMM",
    getKey: () => autoOrderCfg()?.pacific?.apiKey || "",
    link: () => "https://api.pacific-pedia.co.id",
    req: (k) => ({
      url: process.env.PACIFIC_API_URL || "https://api.pacific-pedia.co.id/profile",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `api_key=${encodeURIComponent(k)}&action=profile`,
    }),
    isDead: (s, b) => s === 401 || s === 403 || /api key.*(salah|invalid)|unauthorized/i.test(b || ""),
  },
  pediatopup: {
    label: "PanelPedia Topup",
    getKey: () => autoOrderCfg()?.pediatopup?.apiKey || "",
    link: () => "https://panelpediatopup.com",
    req: (k) => ({
      url: `${(process.env.PEDIATOPUP_API_URL || "https://panelpediatopup.com/api").replace(/\/$/, "")}/profile`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id: autoOrderCfg()?.pediatopup?.apiId || "", api_key: k, signature: md5Hex(String(autoOrderCfg()?.pediatopup?.apiId || "") + String(k)) }),
    }),
    isDead: (s, b) => s === 401 || s === 403 || /invalid.*(key|signature)|signature.*(salah|invalid)|unauthorized/i.test(b || ""),
  },
  premku: {
    label: "Premku",
    getKey: () => autoOrderCfg()?.premku?.apiKey || "",
    link: () => "https://premku.com",
    req: (k) => ({
      url: `${(process.env.PREMKU_API_URL || "https://premku.com/api").replace(/\/$/, "")}/profile`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: k }),
    }),
    isDead: (s, b) => s === 401 || s === 403 || /api key.*(invalid|salah|tidak)|unauthorized/i.test(b || ""),
  },
};

import crypto from "node:crypto";
function md5Hex(s) { return crypto.createHash("md5").update(s).digest("hex"); }

// key yang PUNYA probe (sisanya di luar set ini gak didukung tes)
const PROBED = new Set(Object.keys(KEY_PROBES));

// ── state ─────────────────────────────────────────────────────────────
export function ensureKeyPatrolState(db) {
  if (!db.data.keyPatrol || typeof db.data.keyPatrol !== "object") db.data.keyPatrol = {};
  const st = db.data.keyPatrol;
  if (typeof st.on !== "boolean") st.on = true; // default AKTIF
  if (!st.states || typeof st.states !== "object") st.states = {};
  if (!st.lastResults || typeof st.lastResults !== "object") st.lastResults = {};
  if (!Number.isFinite(st.lastRun)) st.lastRun = 0;
  if (typeof st.lastWeekly !== "string") st.lastWeekly = "";
  return st;
}

// ── helpers waktu WIB (pola rent-auto) ───────────────────────────────
function wibDate(ts) { return new Date(ts + 7 * HOUR_MS); }
function wibTanggalJam(ts) {
  const d = wibDate(ts);
  const p = (n) => String(n).padStart(2, "0");
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${d.getUTCDate()} ${bulan[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} WIB`;
}
function wibJamMenit(ts) {
  const d = wibDate(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function wibWeekKey(ts) {
  const d = wibDate(ts);
  const senin = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
  return `${senin.getUTCFullYear()}-${senin.getUTCMonth() + 1}-${senin.getUTCDate()}`;
}

// ── klasifikasi hasil ─────────────────────────────────────────────────
function classify(probe, status, body) {
  if (!status) return { status: "rusak", code: "jaringan" };
  if (probe.isDead(status, body)) return { status: "mati", code: String(status) };
  if ((status >= 200 && status < 300) || status === 429) return { status: "hidup", code: String(status) };
  if (status === 401 || status === 403) return { status: "mati", code: String(status) };
  return { status: "rusak", code: String(status) };
}

// ── kartu keluaran ────────────────────────────────────────────────────
function labelFor(name) {
  return KEY_PROBES[name]?.label || API_KEYS[name]?.label || name;
}
const STATUS_TXT = { hidup: "HIDUP", mati: "MATI", rusak: "RUSAK", kosong: "Kosong" };

function dmKeyMati(name, res) {
  const p = KEY_PROBES[name];
  return `🔴 *KEY PATROL — KEY MATI*\n\n` +
    `Key *${labelFor(name)}* saya tes barusan dan ditolak provider (kode ${res.code}).\n` +
    (p?.link ? `Ganti key di: ${p.link()}\n` : "") +
    `Fitur yang kegantung key ini bakal error sampai key-nya diganti. Mohon dicek ya.`;
}
function dmKeyHidupLagi(name) {
  return `🟢 *KEY PATROL — KEY BALIK HIDUP*\n\n` +
    `Kabar baik: key *${labelFor(name)}* yang sempat mati, barusan saya tes dan berfungsi normal lagi.`;
}
export function buildReportCard(results, now, header = "🤖 LAPORAN KEY") {
  const counts = { hidup: 0, mati: 0, rusak: 0, kosong: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const lines = [
    `${wibTanggalJam(now)}`,
    `Hidup: ${counts.hidup} · Mati: ${counts.mati} · Rusak: ${counts.rusak} · Kosong: ${counts.kosong}`,
    ``,
  ];
  for (const r of results) {
    const p = KEY_PROBES[r.name];
    lines.push(`${STATUS_TXT[r.status] || r.status} — ${r.label}${r.code ? ` (kode ${r.code})` : ""}`);
    if (r.status === "mati" && p?.link) lines.push(`   Ganti di: ${p.link()}`);
  }
  // key terisi tapi gak didukung tes — jujur disebut
  const unsupported = [];
  for (const [name, def] of Object.entries(API_KEYS)) {
    if (PROBED.has(name)) continue;
    let filled = false;
    try { filled = getApiKey(name)?.length > 0; } catch { }
    if (filled) unsupported.push(def.label || name);
  }
  if (unsupported.length) {
    lines.push(``, `Gak didukung tes (${unsupported.length}): ${unsupported.join(", ")}`);
  }
  return boxLeft(header, lines.join("\n"));
}
function buildStatusCard(st, now) {
  const res = Object.values(st.lastResults || {});
  const counts = { hidup: 0, mati: 0, rusak: 0, kosong: 0 };
  for (const r of res) counts[r.status] = (counts[r.status] || 0) + 1;
  const lines = [
    `Status: ${st.on ? "AKTIF" : "MATI"}`,
    `Patrol terakhir: ${st.lastRun ? wibTanggalJam(st.lastRun) : "belum pernah"}`,
    `Interval: tiap 6 jam · Laporan mingguan: Minggu ${WEEKLY_JAM} WIB`,
    ``,
    `Hidup: ${counts.hidup} · Mati: ${counts.mati} · Rusak: ${counts.rusak} · Kosong: ${counts.kosong}`,
  ];
  for (const r of res) {
    if (r.status === "mati") lines.push(`MATI: ${r.label} (kode ${r.code})`);
    if (r.status === "rusak") lines.push(`RUSAK: ${r.label} (kode ${r.code})`);
  }
  return boxLeft("🤖 KEY PATROL", lines.join("\n"));
}
export { buildStatusCard };

// ── core patrol ───────────────────────────────────────────────────────
export async function runKeyPatrol(sock) {
  const db = getDatabase();
  const st = ensureKeyPatrolState(db);
  if (!st.on) return { skipped: true, results: [] };
  const now = nowMs();
  const results = [];
  const dms = [];

  const send = async (text) => {
    if (!sock?.sendMessage) return false;
    try { await sock.sendMessage(ownerJid(), { text }); return true; }
    catch { return false; }
  };

  // probe paralel semua key terisi
  await Promise.all(Object.entries(KEY_PROBES).map(async ([name, probe]) => {
    let key = "";
    try { key = probe.getKey(); } catch { }
    if (!key) { results.push({ name, label: probe.label, status: "kosong", code: "" }); return; }
    try {
      const { url, method, headers, body } = probe.req(key);
      const r = await httpProbe(url, { method, headers, body });
      const c = classify(probe, r.status, r.body);
      results.push({ name, label: probe.label, status: c.status, code: c.code, masked: maskKey(key) });
    } catch {
      results.push({ name, label: probe.label, status: "rusak", code: "jaringan", masked: maskKey(key) });
    }
  }));

  // urut stabil biar kartu gak loncat-loncat
  results.sort((a, b) => Object.keys(KEY_PROBES).indexOf(a.name) - Object.keys(KEY_PROBES).indexOf(b.name));

  // DM cuma pas PERUBAHAN status (anti spam tiap 6 jam)
  for (const r of results) {
    const prev = st.states[r.name];
    st.states[r.name] = r.status;
    if (r.status === "mati" && prev === "hidup") { if (await send(dmKeyMati(r.name, r))) dms.push(`key mati: ${r.label}`); }
    if (r.status === "hidup" && prev === "mati") { if (await send(dmKeyHidupLagi(r.name))) dms.push(`key hidup lagi: ${r.label}`); }
  }

  // laporan mingguan: Minggu >= 08:00 WIB, sekali per minggu
  const wib = wibDate(now);
  const weekKey = wibWeekKey(now);
  if (wib.getUTCDay() === 0 && wibJamMenit(now) >= WEEKLY_JAM && st.lastWeekly !== weekKey) {
    const ok = await send(buildReportCard(results, now));
    if (ok) { st.lastWeekly = weekKey; dms.push("laporan mingguan terkirim"); }
  }

  st.lastRun = now;
  st.lastResults = {};
  for (const r of results) st.lastResults[r.name] = r;
  try { db.db.write(); } catch { }
  return { skipped: false, results, dms };
}

function maskKey(k) {
  const s = String(k || "");
  if (s.length <= 8) return s ? s[0] + "•••" : "";
  return s.slice(0, 4) + "…" + s.slice(-3);
}

// ── scheduler (idempotent, pola botdoctor) ────────────────────────────
let _timer = null;
export function initKeyPatrolScheduler(sock) {
  if (_timer) return _timer;
  _timer = setInterval(async () => {
    try { await runKeyPatrol(sock); } catch { /* patrol gagal → patrol berikutnya */ }
  }, TICK_MS);
  return _timer;
}
export function stopKeyPatrolScheduler() { if (_timer) { clearInterval(_timer); _timer = null; } }
