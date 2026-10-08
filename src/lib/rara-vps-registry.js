// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-vps-registry.js — Registry kepemilikan VPS (7 Okt 2026):
// owner minta fitur self-service: customer bisa ganti password VPS-nya
// sendiri. Registry mencatat VPS mana milik nomor siapa (DO / Linode /
// manual) supaya akses .gantipwvps bisa dicek kepemilikannya.
// Penyimpanan: src/database/panel/vps/registry.json
// Entry: { id, ip, password, owner, provider: do|linode|manual, label,
//          createdAt }
// Seam _setRegistryFileForTest buat E2E isolasi.
import fs from "fs";
import path from "path";

const DEFAULT_FILE = path.join(process.cwd(), "src", "database", "panel", "vps", "registry.json");
let _file = null;
function filePath() {
  if (_file) return _file;
  const dir = path.dirname(DEFAULT_FILE);
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
  return DEFAULT_FILE;
}

export function _setRegistryFileForTest(f) {
  _file = f;
}

export function cleanNumberVps(jid) {
  if (!jid) return null;
  const n = String(jid).replace(/@.*$/, "").replace(/[^0-9]/g, "");
  return n || null;
}

function load() {
  try {
    const raw = fs.readFileSync(filePath(), "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    fs.writeFileSync(filePath(), JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[vps-registry] gagal simpan:", e?.message || e);
  }
}

// ID unik: timestamp + counter file biar stabil
function nextId(list) {
  const max = list.reduce((acc, e) => Math.max(acc, parseInt(e?.id, 10) || 0), 0);
  return String(max + 1);
}

// daftarkan VPS baru milik seseorang → entry lengkap
export function registerVps({ ip, password, owner, provider, label }) {
  const cleanIp = String(ip || "").trim();
  const num = cleanNumberVps(owner);
  if (!cleanIp || !num) return null;
  const list = load();
  // satu IP cuma boleh sekali — kalau ada, update ownership-nya
  const existing = list.find((e) => e.ip === cleanIp);
  if (existing) {
    existing.password = String(password || existing.password || "");
    existing.owner = num;
    existing.provider = String(provider || existing.provider || "manual");
    existing.label = String(label || existing.label || "");
    existing.updatedAt = Date.now();
    save(list);
    return existing;
  }
  const entry = {
    id: nextId(list),
    ip: cleanIp,
    password: String(password || ""),
    owner: num,
    provider: String(provider || "manual"),
    label: String(label || ""),
    createdAt: Date.now(),
  };
  list.push(entry);
  save(list);
  return entry;
}

// cari di list yang udah diload
function findIn(list, idOrIp) {
  const key = String(idOrIp || "").trim().toLowerCase();
  if (!key) return null;
  return (
    list.find((e) => String(e.id) === key) ||
    list.find((e) => String(e.ip).toLowerCase() === key) ||
    null
  );
}

// cari VPS berdasarkan id ATAU ip → entry | null
export function findVps(idOrIp) {
  return findIn(load(), idOrIp);
}

// daftar VPS milik seseorang
export function listByOwner(owner) {
  const num = cleanNumberVps(owner);
  if (!num) return [];
  return load().filter((e) => e.owner === num);
}

// daftar semua VPS (owner bot aja yang harusnya manggil ini)
export function listAll() {
  return load();
}

// kepemilikan: nomor ini pemilik entry VPS ini?
export function isOwnerOf(jid, entry) {
  const num = cleanNumberVps(jid);
  if (!num || !entry) return false;
  return String(entry.owner) === num;
}

// update password entry (id ATAU ip) setelah ganti password sukses
export function updateVpsPassword(idOrIp, newPassword) {
  const list = load();
  const entry = findIn(list, idOrIp);
  if (!entry) return null;
  entry.password = String(newPassword || "");
  entry.updatedAt = Date.now();
  save(list);
  return entry;
}

// hapus entry (id ATAU ip) → true kalau kehapus
export function removeVps(idOrIp) {
  const list = load();
  const entry = findIn(list, idOrIp);
  if (!entry) return false;
  save(list.filter((e) => e !== entry));
  return true;
}
