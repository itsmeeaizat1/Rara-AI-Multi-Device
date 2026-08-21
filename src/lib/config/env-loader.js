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
 * Ambil Pterodactyl config
 */
/**
 * Ambil Tio AI API key dari apikeys.json
 */
export function getTioKey() {
  return apikeysData.tioApiKey || "";
}

export function getPteroConfig() {
  return {
    server1: {
      domain: miscData.ptero_server1_domain || "",
      apikey: miscData.ptero_server1_apikey || "",
      capikey: miscData.ptero_server1_capikey || "",
    },
  };
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
