// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-cpanel-protect.js — Proteksi cpanel (owner 7 Okt 2026):
// ".cpanelprotect on aktif, .cpanelprotect settings buat cek mau apa aja
// fitur protect yg diaktifin" — master switch + toggle per aksi.
// Owner bot SELALU bypass semua proteksi (dicek di lapisan plugin).
// Penyimpanan: src/database/panel/cpanel/protect.json
// Seam _setProtectFileForTest buat E2E isolasi.
import fs from "fs";
import path from "path";

const DEFAULT_FILE = path.join(process.cwd(), "src", "database", "panel", "cpanel", "protect.json");
let _file = null;
function filePath() {
  if (_file) return _file;
  try {
    const dir = path.dirname(DEFAULT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
  return DEFAULT_FILE;
}

export function _setProtectFileForTest(f) {
  _file = f;
}

// aksi yang bisa diproteksi — default semua ON saat master nyala
export const PROTECT_FEATURES = ["create", "delete", "stop", "restart", "kill", "upload"];
export const FEATURE_LABEL = {
  create: "Create — blokir bikin akun/server panel",
  delete: "Delete — blokir hapus server (delserver) & panel (delpanel)",
  stop: "Stop — blokir matikan server",
  restart: "Restart — blokir restart server",
  kill: "Kill — blokir hentikan paksa server",
  upload: "Upload — blokir upload file ke server",
};

function defaults() {
  return { master: false, features: Object.fromEntries(PROTECT_FEATURES.map((f) => [f, true])) };
}

function load() {
  try {
    const raw = fs.readFileSync(filePath(), "utf-8");
    const data = JSON.parse(raw);
    const def = defaults();
    if (!data || typeof data !== "object") return def;
    return {
      master: data.master === true,
      features: Object.fromEntries(
        PROTECT_FEATURES.map((f) => [f, data?.features?.[f] !== false])
      ),
    };
  } catch {
    return defaults();
  }
}

function save(state) {
  try {
    fs.writeFileSync(filePath(), JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("[cpanel-protect] gagal simpan:", e?.message || e);
  }
}

export function isFeatureName(name) {
  return PROTECT_FEATURES.includes(String(name || "").toLowerCase());
}

// master on/off — return state terbaru
export function setMaster(on) {
  const state = load();
  state.master = on === true;
  save(state);
  return state;
}

// per-fitur on/off — fitur valid saja; return state (null kalau fitur ngawur)
export function setFeature(name, on) {
  name = String(name || "").toLowerCase();
  if (!isFeatureName(name)) return null;
  const state = load();
  state.features[name] = on === true;
  save(state);
  return state;
}

// semua fitur sekaligus
export function setAllFeatures(on) {
  const state = load();
  for (const f of PROTECT_FEATURES) state.features[f] = on === true;
  save(state);
  return state;
}

// inti: apakah aksi ini diproteksi? (master nyala + fitur nyala)
export function isProtected(action) {
  const state = load();
  if (!state.master) return false;
  action = String(action || "").toLowerCase();
  if (!isFeatureName(action)) return false;
  return state.features[action] === true;
}

// buat kartu settings
export function protectStatus() {
  const state = load();
  return {
    master: state.master,
    features: { ...state.features },
    activeFeatures: PROTECT_FEATURES.filter((f) => state.master && state.features[f]),
  };
}
