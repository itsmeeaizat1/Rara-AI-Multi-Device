// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ptero-store.js — Persistence config panel Pterodactyl (server1 - server100)
// Override domain/apikey/capikey/egg/nestid/location disimpan di src/data/ptero-panels.json
// (menggantikan .setpanel lama yang ngedit config.js via regex — udah rusak sejak config pindah ke external.js)

import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "src/data/ptero-panels.json");
export const MAX_PANELS = 100;

function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, "{}", "utf8");
}

function loadStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}

function saveStore(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Validasi nomor slot panel (1-100)
 */
export function isValidPanelNum(n) {
  const num = parseInt(n, 10);
  return Number.isInteger(num) && num >= 1 && num <= MAX_PANELS;
}

/**
 * Set satu field panel. field: domain | apikey | capikey | egg | nestid | location
 */
export function setPanelField(panelNum, field, value) {
  if (!isValidPanelNum(panelNum)) return { success: false, error: "Slot panel harus v1 sampai v100" };
  const validFields = ["domain", "apikey", "capikey", "egg", "nestid", "location"];
  if (!validFields.includes(field)) return { success: false, error: "Field tidak valid: " + field };
  const store = loadStore();
  const key = "server" + parseInt(panelNum, 10);
  if (!store[key] || typeof store[key] !== "object") store[key] = {};
  store[key][field] = String(value);
  saveStore(store);
  return { success: true };
}

/**
 * Hapus satu field panel (reset ke default)
 */
export function clearPanelField(panelNum, field) {
  if (!isValidPanelNum(panelNum)) return { success: false, error: "Slot panel harus v1 sampai v100" };
  const store = loadStore();
  const key = "server" + parseInt(panelNum, 10);
  if (store[key]) delete store[key][field];
  saveStore(store);
  return { success: true };
}

/**
 * Terapkan override JSON ke object pterodactyl (dipanggil di config.js saat assemble).
 * config.pterodactyl.serverN di-merge dengan nilai dari store (store menang).
 */
export function applyPteroOverrides(pteroConfig) {
  if (!pteroConfig || typeof pteroConfig !== "object") return pteroConfig;
  const store = loadStore();
  for (const [key, fields] of Object.entries(store)) {
    if (!pteroConfig[key] || typeof pteroConfig[key] !== "object") continue;
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value === "string") pteroConfig[key][field] = value;
    }
  }
  return pteroConfig;
}
