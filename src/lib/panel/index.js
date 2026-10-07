// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/lib/panel/ — PUSAT KONFIGURASI PANEL PTERODACTYL (v1-v100)
// Semua set/get PTLA (application key) & PTLC (client key) + domain ada di sini.
//
// Sumber nilai (urutan prioritas):
//   1. Override store: src/data/ptero-panels.json (di-set via .setpanel, menang)
//   2. File config: src/lib/panel/config.js (PANELS — daftar domain v1-v100, edit di situ)
//   3. Legacy: misc.json via apikey.js (ptero_serverN_domain/apikey/capikey)
//
// config.js memanggil applyPteroOverrides() saat startup → config.pterodactyl
// sudah termasuk override, jadi plugin lama tetap jalan tanpa perubahan.

import fs from "fs";
import path from "path";

export const MAX_PANELS = 100;
let STORE_PATH = path.join(process.cwd(), "src/database/panel/ptero-panels.json");
// seam test-only: redirect file store biar suite gak nyentuh store asli
export function _setPanelStoreForTest(p) { STORE_PATH = p; }
const VALID_FIELDS = ["domain", "apikey", "capikey", "egg", "nestid", "location"];

// ── store JSON ──
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

// ── validasi ──
export function isValidPanelNum(n) {
  const num = parseInt(n, 10);
  return Number.isInteger(num) && num >= 1 && num <= MAX_PANELS;
}

// ── setter (dipakai .setpanel) ──
export function setPanelField(panelNum, field, value) {
  if (!isValidPanelNum(panelNum)) return { success: false, error: "Slot panel harus v1 sampai v100" };
  if (!VALID_FIELDS.includes(field)) return { success: false, error: "Field tidak valid: " + field };
  // (guard 8 Okt) domain yang isinya API key ditolak — domain harus URL panel.
  // Insiden: `.setpanel v1 <ptla_...>` tanpa kata apikey → domain rusak → ENOTFOUND ptla_.
  if (field === "domain" && /ptl[ac]_/i.test(String(value))) {
    return { success: false, error: "Itu API key (ptla_/ptlc_), bukan domain. Gunakan: .setpanel v1 apikey <ptla_...> atau capikey <ptlc_...>" };
  }
  const store = loadStore();
  const key = "server" + parseInt(panelNum, 10);
  if (!store[key] || typeof store[key] !== "object") store[key] = {};
  store[key][field] = String(value);
  saveStore(store);
  return { success: true };
}

export function clearPanelField(panelNum, field) {
  if (!isValidPanelNum(panelNum)) return { success: false, error: "Slot panel harus v1 sampai v100" };
  const store = loadStore();
  const key = "server" + parseInt(panelNum, 10);
  if (store[key]) delete store[key][field];
  saveStore(store);
  return { success: true };
}

// ── sugar: PTLA (application) & PTLC (client) ──
export function setPtla(panelNum, key) { return setPanelField(panelNum, "apikey", key); }
export function setPtlc(panelNum, key) { return setPanelField(panelNum, "capikey", key); }

// ── getter: resolve slot lengkap (override + default) ──
export function getPanel(panelNum) {
  if (!isValidPanelNum(panelNum)) return null;
  const num = parseInt(panelNum, 10);
  const key = "server" + num;
  const override = loadStore()[key] || {};
  // default dari config.pterodactyl (import dinamis → hindari circular saat config.js init)
  // config.pterodactyl sudah di-merge override saat startup, jadi cukup baca config.
  // eslint-disable-next-line no-undef
  let def = {};
  try {
    // resolve via globalThis untuk aman dari circular import (config di-set oleh loader)
    def = (globalThis.__NOVA_PTERO_CONFIG__ || {})[key] || {};
  } catch {
    def = {};
  }
  return {
    num,
    domain: override.domain || def.domain || null,
    apikey: override.apikey || def.apikey || null,   // PTLA
    capikey: override.capikey || def.capikey || null, // PTLC
    egg: override.egg || def.egg || null,
    nestid: override.nestid || def.nestid || null,
    location: override.location || def.location || null,
  };
}

export function getPtla(panelNum) { return getPanel(panelNum)?.apikey || null; }
export function getPtlc(panelNum) { return getPanel(panelNum)?.capikey || null; }

// daftar slot terkonfigurasi: ["v1", "v50", ...]
export function listPanels() {
  const out = [];
  const overrides = loadStore();
  // register config global (di-set config.js saat startup)
  const defaults = globalThis.__NOVA_PTERO_CONFIG__ || {};
  for (let i = 1; i <= MAX_PANELS; i++) {
    const key = "server" + i;
    const cfg = { ...(defaults[key] || {}), ...(overrides[key] || {}) };
    if (cfg?.domain && cfg?.apikey) out.push("v" + i);
  }
  return out;
}

// ── merge override ke object pterodactyl (dipanggil config.js saat assemble) ──
export function applyPteroOverrides(pteroConfig) {
  if (!pteroConfig || typeof pteroConfig !== "object") return pteroConfig;
  // register ke global untuk getPanel()/listPanels()
  globalThis.__NOVA_PTERO_CONFIG__ = pteroConfig;
  const store = loadStore();
  for (const [key, fields] of Object.entries(store)) {
    if (!pteroConfig[key] || typeof pteroConfig[key] !== "object") continue;
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value === "string") pteroConfig[key][field] = value;
    }
  }
  return pteroConfig;
}
