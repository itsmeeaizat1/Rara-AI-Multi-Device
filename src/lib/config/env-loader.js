// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
//   novaai        → key engine NovaAI (tioApiKey, google, groqkey, deepseekkey)
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
  for (const sec of ["aiSatuan", "novaai", "scraper", "fitur"]) {
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
 * Config AI satuan, multi-provider, dan NovaAI dipisah rapi di satu file.
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
  const keys = { ...(raw.novaai || {}) };
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
 * Dipakai: nova-haidar.js (fallback downloader alldl + textpro)
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
 * Endpoint Tio AI — sekarang gateway gorouter.app (token owner VALID di sini; alternatif kktoken.cc — ai.tioo.eu.org sudah mati/404).
 * Bisa di-override via env TIO_API_URL tanpa edit kode.
 */
export function getTioEndpoint() {
  return process.env.TIO_API_URL || "https://gorouter.app/v1/chat/completions";
}

/** Base URL untuk health-check (/v1/models dll) — diambil dari endpoint chat. */
export function getTioBase() {
  return getTioEndpoint().replace(/\/v1\/chat\/completions$/, "");
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
