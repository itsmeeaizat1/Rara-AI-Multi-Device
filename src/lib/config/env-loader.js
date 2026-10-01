// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// API key loader — baca dari src/lib/apikey/*.json
// File ini aman di-push ke GitHub (tidak berisi key, cuma loader)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path ke folder apikey
const apikeyDir = path.resolve(__dirname, "../apikey");

/**
 * Baca JSON file dari folder apikey
 */
function loadJson(filename) {
  const filepath = path.join(apikeyDir, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch (e) {
    // File opsional (andaraz/sanka/misc lama) boleh gak ada — senyap.
    // apikeys.json (PUSAT SEMUA KEY) gak boleh rusak — tetap kerasah.
    if (e.code !== "ENOENT") console.error(`[env-loader] Gagal baca ${filename}:`, e.message);
    return {};
  }
}

// Cache — baca sekali saat startup
const apikeysRaw = loadJson("apikeys.json");

// ═══ STRUKTUR BARU apikeys.json (satu file, 3 section AI) ═══
//   aiSatuan      → key fitur AI satuan & wrapper (haidar, ikyyxd, cuki, dll)
//   aiMultiprovider → config multi-provider (chain + providers.*.apikey)
//   raraai        → key engine RaraAI (tioApiKey, google, groqkey, deepseekkey)
// Key non-AI tetap di root. apikeysData = tampilan FLAT gabungan semuanya
// supaya semua getter lama (getHaidarKey, keys.ikyyxd, dll) tetap jalan.
function flattenApikeys(raw) {
  const flat = {};
  // key flat legacy / non-AI di root (string langsung)
  for (const [k, v] of Object.entries(raw || {})) {
    if (typeof v === "string") flat[k] = v;
  }
  // semua section → dibuang _note, disebar flat (key string saja;
  // object seperti andaraz/sanka dibaca getter khusus, bukan flat)
  for (const sec of ["aiSatuan", "raraai", "scraper", "fitur"]) {
    for (const [k, v] of Object.entries(raw?.[sec] || {})) {
      if (k.startsWith("_")) continue;
      if (typeof v === "string") flat[k] = v;
    }
  }
  // provider key → flat[k] = providers[k].apikey
  // BUGFIX 17 Sep 2026: provider TANPA field apikey (mis. min1ai yang
  // key-nya disimpan di aiSatuan) DULU nimpa flat jadi "" — key asli
  // kehapus → getApiKeys().min1ai kosong. Sekarang: provider tanpa apikey
  // TIDAK nge-overwrite nilai section yang udah ada.
  const provs = raw?.aiMultiprovider?.providers || {};
  for (const [k, v] of Object.entries(provs)) {
    const provKey = v?.apikey ?? "";
    if (!provKey && flat[k]) continue;
    flat[k] = provKey;
  }
  return flat;
}
const apikeysData = flattenApikeys(apikeysRaw);
const andarazData = loadJson("andaraz.json");
const sankaData = loadJson("sanka.json");
const miscData = loadJson("misc.json");

/**
 * Ambil semua API key (kompatibel dengan config.APIkey lama)
 */
export function getApiKeys() {
  const keys = { ...apikeysData };
  delete keys._note;
  return keys;
}

/**
 * ── SECTION GETTER (struktur baru apikeys.json) ──
 * Config AI satuan, multi-provider, dan RaraAI dipisah rapi di satu file.
 */
export function getAiSatuanKeys() {
  const raw = loadJson("apikeys.json");
  const keys = { ...(raw.aiSatuan || {}) };
  delete keys._note;
  return keys;
}

export function getAiMultiprovider() {
  const raw = loadJson("apikeys.json");
  if (raw.aiMultiprovider) return raw.aiMultiprovider;
  // backward compat: file lama ai-providers.json (sudah deprecated)
  return loadJson("ai-providers.json");
}

export function getNovaAiKeys() {
  const raw = loadJson("apikeys.json");
  const keys = { ...(raw.raraai || {}) };
  delete keys._note;
  return keys;
}

/**
 * Ambil config Andaraz
 */
export function getAndarazConfig() {
  // PUSAT BARU: apikeys.json → section "scraper" (request owner 17 Sep 2026)
  const fromCenter = apikeysRaw.scraper?.andaraz;
  if (fromCenter) {
    const { _note, ...cfg } = fromCenter;
    return cfg;
  }
  // fallback file lama andaraz.json (kalau masih ada di VPS)
  const { _note, ...cfg } = andarazData;
  return cfg;
}

/**
 * Ambil config Sankavollerei
 */
export function getSankaConfig() {
  // PUSAT BARU: apikeys.json → section "scraper" (request owner 17 Sep 2026)
  const fromCenter = apikeysRaw.scraper?.sanka;
  if (fromCenter) {
    const { _note, ...cfg } = fromCenter;
    return cfg;
  }
  // fallback file lama sanka.json (kalau masih ada di VPS)
  const { _note, ...cfg } = sankaData;
  return cfg;
}

/**
 * Ambil DeepAI API key
 */
export function getDeepAiKey() {
  // PUSAT BARU: apikeys.json → section "fitur" (deepai kosong = key expired,
  // hd.js pakai sharp local)
  return apikeysData.deepai || miscData.deepai || "";
}

/**
 * Ambil SaveNow API key (4kdownload.to)
 */
/**
 * API key HaidarApis (api.haidarxd.my.id — 336 endpoint all-in-one)
 * Daftar gratis: https://api.haidarxd.my.id/register → dashboard/api-keys
 * Dipakai: rara-haidar.js (fallback downloader alldl + textpro)
 */
export function getHaidarKey() {
  return apikeysData.haidar || "";
}

/**
 * API key fazzcode.eu.cc — chatbot-role (.airoleplaychat)
 */
export function getFazzcodeKey() {
  return apikeysData.fazzcode || "";
}

/**
 * API key zelapi.eu.cc — suite .z AI (86+ endpoint .zchatgpt .zdeepseek dll)
 */
export function getZelKey() {
  return apikeysData.zelapi || apikeysData.zelApiKey || "";
}

/**
 * API key searchapi.io — Google AI Mode (.googleaimode)
 * engine=google_ai_mode. daftar di searchapi.io, free trial ±100 req/bulan.
 */
export function getSearchApiKey() {
  return apikeysData.searchapi || apikeysData.searchApiKey || "";
}

export function getSaveNowKey() {
  // PUSAT BARU: apikeys.json → section "fitur" key "savenow" (fitur .alldl)
  return apikeysData.savenow || miscData.savenow_apikey || "";
}

/**
 * Ambil Pterodactyl config
 */
/**
 * Ambil Tio AI API key dari apikeys.json
 */
export function getTioKey() {
  return apikeysData.tioApiKey || "";
}

/**
 * Endpoint Tio AI — web lama (ai.tioo.eu.org, kktoken.cc, gorouter.app) SEMUA udah mati.
 * 19 Sep 2026 (owner): diganti gateway 9ROUTER V2 — 9router.cloudku.us.kg
 * (OpenAI-compatible, key sama dengan providers.router9v2).
 * Bisa di-override via env TIO_API_URL tanpa edit kode.
 */
const ROUTER9_DEFAULT_ENDPOINT = "https://9router.cloudku.us.kg/v1/chat/completions";

// REVISI 21 Sep 2026 (owner): 9router bisa di-install SENDIRI di Linux
// (`npm install -g 9router` — situs resmi https://9router.com, open-source
// github.com/decolua/9router). Endpoint OpenAI-compatible-nya:
//   http://localhost:20128/v1/chat/completions
// Key dibuat/kelola LOkal via dashboard http://localhost:20128/dashboard.
// Gateway cloudku = deployment hosted proyek yang sama — tetap jadi default
// biar gak ada perilaku berubah, tapi sekarang SEMUA pemakaian 9router di bot
// (aigrup, aitio, ai9v2, smartreply, fun-ai, rara-ai-service, boot doctor,
// health check) nyedot endpoint dari SATU PINTU ini — ganti di satu tempet,
// seluruh rantai ikut. Urutan prioritas:
//   1. env TIO_API_URL (lama)
//   2. env ROUTER_API_URL
//   3. apikeys.json "_router9v2Endpoint" (di-set via .ai9v2 endpoint <url>, persist)
//   4. default cloudku (hosted)
export function getTioEndpoint() {
  const fromFile = typeof apikeysRaw._router9v2Endpoint === "string"
    ? apikeysRaw._router9v2Endpoint.trim()
    : "";
  return process.env.TIO_API_URL || process.env.ROUTER_API_URL || fromFile || ROUTER9_DEFAULT_ENDPOINT;
}

/** Base URL untuk health-check (/v1/models dll) — diambil dari endpoint chat. */
export function getTioBase() {
  return getTioEndpoint().replace(/\/v1\/chat\/completions$/, "");
}

// seam persist buat e2e (default: tulis beneran ke apikeys.json)
const __env = { persist: null };
export function _setEndpointWriterForTest(fn) { __env.persist = fn; }

/**
 * Ganti endpoint 9router + PERSIST ke apikeys.json (field root
 * "_router9v2Endpoint" — prefix "_" otomatis di-skip flattenApikeys,
 * jadi gak pernah dibaca sebagai key). Dipakai .ai9v2 endpoint <url>.
 * @returns {{ok: boolean, error?: string, endpoint: string}}
 */
export function setTioEndpoint(url) {
  const clean = String(url || "").trim();
  if (!/^https?:\/\/[^\s]+/i.test(clean)) {
    return { ok: false, error: "URL harus http:// atau https://" };
  }
  const prev = apikeysRaw._router9v2Endpoint;
  apikeysRaw._router9v2Endpoint = clean; // update cache in-memory langsung
  try {
    const write = __env.persist || ((filepath, data) => fs.writeFileSync(filepath, data, "utf8"));
    write(path.join(apikeyDir, "apikeys.json"), JSON.stringify(apikeysRaw, null, 2) + "\n");
    return { ok: true, endpoint: getTioEndpoint() };
  } catch (e) {
    apikeysRaw._router9v2Endpoint = prev; // rollback biar memori konsisten
    return { ok: false, error: e?.message || "gagal tulis apikeys.json" };
  }
}

/**
 * Hapus override endpoint → balik ke default cloudku (atau env kalau ada).
 * Dipakai .ai9v2 endpoint default.
 */
export function resetTioEndpoint() {
  delete apikeysRaw._router9v2Endpoint;
  try {
    const write = __env.persist || ((filepath, data) => fs.writeFileSync(filepath, data, "utf8"));
    write(path.join(apikeyDir, "apikeys.json"), JSON.stringify(apikeysRaw, null, 2) + "\n");
    return { ok: true, endpoint: getTioEndpoint() };
  } catch (e) {
    return { ok: false, error: e?.message || "gagal tulis apikeys.json" };
  }
}

/**
 * Ambil DeepSeek API key dari apikeys.json
 * 🔹 AI AGENT: dipakai oleh aiagent.js sebagai provider utama
 * Isi di src/lib/apikey/apikeys.json: "deepseekkey": "sk-..."
 * Dapatkan di: https://platform.deepseek.com
 */
export function getDeepSeekKey() {
  return apikeysData.deepseekkey || "";
}

/**
 * Ambil Groq API key dari apikeys.json
 * 🔹 AI AGENT: dipakai oleh aiagent.js sebagai fallback ketiga (opsional)
 * Isi di src/lib/apikey/apikeys.json: "groqkey": "gsk_..."
 * Dapatkan di: https://console.groq.com
 */
export function getGroqKey() {
  return apikeysData.groqkey || "";
}

export function getXaiKey() { return apikeysData.xai || ""; }
export function getQwenKey() { return apikeysData.qwen || ""; }
export function getCohereKey() { return apikeysData.cohere || ""; }
export function getPerplexityKey() { return apikeysData.perplexity || ""; }
export function getFireworksKey() { return apikeysData.fireworks || ""; }
export function getAi21Key() { return apikeysData.ai21 || ""; }
export function getRekaKey() { return apikeysData.reka || ""; }
export function getCerebrasKey() { return apikeysData.cerebras || ""; }
export function getOpenRouterKey() { return apikeysData.openrouter || ""; }
export function getHuggingFaceKey() { return apikeysData.huggingface || ""; }
export function getVoyageKey() { return apikeysData.voyage || ""; }
export function getCloudflareKey() { return apikeysData.cloudflare || ""; }
export function getStabilityKey() { return apikeysData.stability || ""; }
export function getJinaKey() { return apikeysData.jina || ""; }

export function getPteroConfig() {
  // PUSAT BARU: apikeys.json → section "fitur" ptero_serverN_* (fitur .createpanel)
  // fallback file lama misc.json kalau section fitur gak ada.
  const slots = {};
  for (let i = 1; i <= 100; i++) {
    slots[`server${i}`] = {
      domain: apikeysData[`ptero_server${i}_domain`] || miscData[`ptero_server${i}_domain`] || "",
      apikey: apikeysData[`ptero_server${i}_apikey`] || miscData[`ptero_server${i}_apikey`] || "",
      capikey: apikeysData[`ptero_server${i}_capikey`] || miscData[`ptero_server${i}_capikey`] || "",
    };
  }
  return slots;
}

/**
 * Reload semua key (dipakai setelah .setkey update JSON)
 */
export function reloadKeys() {
  const newApikeys = loadJson("apikeys.json");
  const newAndaraz = loadJson("andaraz.json");
  const newSanka = loadJson("sanka.json");
  const newMisc = loadJson("misc.json");
  // rebuild tampilan flat dari 3 section (biar key baru langsung kedeteksi)
  const flat = flattenApikeys(newApikeys);
  for (const k of Object.keys(apikeysData)) delete apikeysData[k];
  Object.assign(apikeysData, flat);
  apikeysRaw && Object.keys(apikeysRaw).forEach(k => delete apikeysRaw[k]);
  Object.assign(apikeysRaw, newApikeys);
  Object.assign(andarazData, newAndaraz);
  Object.assign(sankaData, newSanka);
  Object.assign(miscData, newMisc);
}
