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
    console.error(`[env-loader] Gagal baca ${filename}:`, e.message);
    return {};
  }
}

// Cache — baca sekali saat startup
const apikeysData = loadJson("apikeys.json");
const andarazData = loadJson("andaraz.json");
const sankaData = loadJson("sanka.json");
const miscData = loadJson("misc.json");

/**
 * Ambil semua API key (kompatibel dengan config.APIkey lama)
 */
export function getApiKeys() {
  const { _note, ...keys } = apikeysData;
  return keys;
}

/**
 * Ambil config Andaraz
 */
export function getAndarazConfig() {
  const { _note, ...cfg } = andarazData;
  return cfg;
}

/**
 * Ambil config Sankavollerei
 */
export function getSankaConfig() {
  const { _note, ...cfg } = sankaData;
  return cfg;
}

/**
 * Ambil DeepAI API key
 */
export function getDeepAiKey() {
  return miscData.deepai || "";
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

export function getSaveNowKey() {
  return miscData.savenow_apikey || "";
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
  const slots = {};
  for (let i = 1; i <= 100; i++) {
    slots[`server${i}`] = {
      domain: miscData[`ptero_server${i}_domain`] || "",
      apikey: miscData[`ptero_server${i}_apikey`] || "",
      capikey: miscData[`ptero_server${i}_capikey`] || "",
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
  Object.assign(apikeysData, newApikeys);
  Object.assign(andarazData, newAndaraz);
  Object.assign(sankaData, newSanka);
  Object.assign(miscData, newMisc);
}
