// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-cpanel-allow.js — Allowlist create panel (owner 6 Okt 2026):
// "cpanel ada fitur butuh konfirmasi add dr owner — user gak bisa langsung
// create, owner harus menambahkan dulu: .addrole @user / nomor <durasi>"
// (revisi owner 7 Okt): owner juga mutusin TIPE client|admin + durasi pas
// .addaksescpanel — tipe create user ngikutin izinnya.
// Penyimpanan: src/database/panel/cpanel/create_allow.json
// Entry: { number, tipe: client|admin, addedAt, expiresAt (null = selamanya) }
// Seam _setAllowFileForTest buat E2E isolasi.
import fs from "fs";
import path from "path";
import { isLid, lidToJid } from "./rara-lid.js";

const DEFAULT_FILE = path.join(process.cwd(), "src", "database", "panel", "cpanel", "create_allow.json");
let _file = null;
function filePath() {
  if (_file) return _file;
  const dir = path.dirname(DEFAULT_FILE);
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
  return DEFAULT_FILE;
}

export function _setAllowFileForTest(f) {
  _file = f;
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
    console.error("[cpanel-allow] gagal simpan:", e?.message || e);
  }
}

export function cleanNumber(jid) {
  if (!jid) return null;
  if (isLid(jid)) jid = lidToJid(jid);
  const n = String(jid).replace(/@.*$/, "").replace(/[^0-9]/g, "");
  return n || null;
}

// parse durasi: "10m" "12h" "7d" "2w" "30d" | "unli|unlimited|permanen|selamanya" → null
// invalid token → { invalid: true } (jangan tebak)
export function parseDurasi(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return { ms: null }; // kosong = selamanya
  if (/^(unli(mited)?|permanen(t)?|selamanya|∞|0)$/.test(t)) return { ms: null };
  const m = t.match(/^(\d{1,4})(m|h|d|w)$/);
  if (!m) return { invalid: true };
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const mult = { m: 60e3, h: 36e5, d: 864e5, w: 6048e5 }[unit];
  const ms = n * mult;
  if (ms <= 0) return { invalid: true };
  return { ms };
}

// buang entri kedaluwarsa
function prune(list) {
  const now = Date.now();
  return list.filter((e) => !e.expiresAt || e.expiresAt > now);
}

// cek akses create: { allowed, entry }
export function isCreateAllowed(jid) {
  const number = cleanNumber(jid);
  if (!number) return { allowed: false, entry: null };
  const list = prune(load());
  const entry = list.find((e) => e.number === number) || null;
  if (!entry) return { allowed: false, entry: null };
  return { allowed: true, entry };
}

// tambah/perpanjang. ms = null → selamanya. Return entry baru.
// (revisi owner 7 Okt 2026): tipe client|admin ditentukan owner pas .addaksescpanel —
// user berizin cuma bisa create sesuai tipenya (default client utk izin lama).
export function allowCreate(jid, ms, tipe = "client") {
  const number = cleanNumber(jid);
  if (!number) return { ok: false, error: "Nomor tidak valid" };
  if (ms !== null && (!Number.isFinite(ms) || ms <= 0)) return { ok: false, error: "Durasi tidak valid" };
  const t = String(tipe || "client").toLowerCase();
  if (t !== "client" && t !== "admin") return { ok: false, error: "Tipe harus client atau admin" };
  const now = Date.now();
  const expiresAt = ms === null ? null : now + ms;
  const list = prune(load());
  const i = list.findIndex((e) => e.number === number);
  const entry = { number, tipe: t, addedAt: i >= 0 ? list[i].addedAt : now, expiresAt };
  if (i >= 0) list[i] = entry;
  else list.push(entry);
  save(list);
  return { ok: true, entry };
}

// hapus akses. Return true kalau ada yang kehapus.
export function revokeCreate(jid) {
  const number = cleanNumber(jid);
  if (!number) return false;
  const list = prune(load());
  const next = list.filter((e) => e.number !== number);
  if (next.length === list.length) return false;
  save(next);
  return true;
}

// daftar aktif (sudah diprun)
export function listCreateAllow() {
  return prune(load());
}

export function formatSisa(expiresAt) {
  if (!expiresAt) return "Selamanya";
  let s = Math.max(0, expiresAt - Date.now());
  if (s === 0) return "Kedaluwarsa";
  const hari = s / 864e5;
  if (hari >= 1) return `${Math.round(hari)} hari`;
  const jam = s / 36e5;
  if (jam >= 1) return `${Math.round(jam)} jam`;
  return `${Math.max(1, Math.round(s / 60e3))} menit`;
}

export function formatTanggal(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
