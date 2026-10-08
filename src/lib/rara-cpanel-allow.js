// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-cpanel-allow.js — Allowlist create panel (owner 6 Okt 2026):
// "cpanel ada fitur butuh konfirmasi add dr owner — user gak bisa langsung
// create, owner harus menambahkan dulu: .addrole @user / nomor <durasi>"
// (revisi owner 7 Okt): owner juga mutusin TIPE client|admin + durasi pas
// .addaksescpanel — tipe create user ngikutin izinnya.
// (revisi owner 8 Okt): SISTEM ROLE HIERARKI —
//   basic    → bisa create panel, GAK bisa nambahin orang lain
//   reseller → bisa create panel + nambahin user lain sebagai basic
//              (gak bisa kasih role reseller ke atas — itu owner)
//   Target bisa nomor WA atau ID Telegram (tg:<id> / jid bridge tg_<id>).
//   Durasi: 30m|12h|7d|2w|unli | jam "16:00" (hari ini, lewat → besok) |
//   tanggal "17/05/2026" (sampai akhir hari itu) | "17/05/2026 16:00".
// Penyimpanan: src/database/panel/cpanel/create_allow.json
// Entry: { id: "wa:628..|tg:4436252", number, platform, role, tipe,
//          addedAt, addedBy, expiresAt (null = selamanya) }
// Entri lama (tanpa id/role) otomatis dimigrasi: wa + basic + addedBy owner.
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
    return (Array.isArray(arr) ? arr : []).map(migrate);
  } catch {
    return [];
  }
}

// entri lama → skema v2 (tanpa nulis ulang id lama yang udah bener)
function migrate(e) {
  if (!e || typeof e !== "object") return null;
  const platform = e.platform || (String(e.id || "").startsWith("tg:") ? "tg" : "wa");
  const number = e.number || String(e.id || "").replace(/^(wa|tg):/, "");
  const id = e.id || (platform === "tg" ? `tg:${number}` : `wa:${number}`);
  return {
    ...e,
    id,
    number,
    platform,
    role: ROLE_RANK[e.role] ? e.role : "basic",
    tipe: String(e.tipe || "client").toLowerCase() === "admin" ? "admin" : "client",
    addedBy: e.addedBy || "owner",
  };
}

function save(list) {
  try {
    fs.writeFileSync(filePath(), JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[cpanel-allow] gagal simpan:", e?.message || e);
  }
}

const ROLE_RANK = { basic: 1, reseller: 2 };

export function cleanNumber(jid) {
  if (!jid) return null;
  if (isLid(jid)) jid = lidToJid(jid);
  const n = String(jid).replace(/@.*$/, "").replace(/[^0-9]/g, "");
  return n || null;
}

// Normalisasi target apapun bentuknya (jid WA, lid, nomor mentah,
// "tg:4436252", "tg_4436252@s.whatsapp.net") → { id, platform, display }.
// return null kalau gak bisa dibaca.
export function normalizeTarget(raw) {
  let t = String(raw || "").trim();
  if (!t) return null;
  // prefix tg:/telegram:/tg_ → user Telegram
  const pref = t.match(/^(?:tg|telegram)[:_]/i);
  let local = pref ? t.slice(pref[0].length) : t;
  local = local.split("@")[0];
  const isTg = !!pref || /^tg[_:]/i.test(String(raw)) || /@tg/i.test(t);
  if (isTg) {
    const id = local.replace(/[^0-9-]/g, "");
    if (!/^-?\d{3,15}$/.test(id)) return null;
    return { id: `tg:${id}`, platform: "tg", display: id };
  }
  if (isLid(t)) t = lidToJid(t);
  const n = cleanNumber(t);
  if (!n || n.length < 5) return null;
  return { id: `wa:${n}`, platform: "wa", display: n };
}

// parse durasi v2. Return:
//   { ms }        → relatif: "10m" "12h" "7d" "2w" "30d"
//   { ms: null }  → selamanya: "unli" / kosong
//   { expiresAt } → absolut: "16:00" (hari ini, lewat → besok jam sama) |
//                   "17/05/2026" (23:59:59 hari itu) | "17/05/2026 16:00"
//   { invalid: true } → token gak dikenal (jangan tebak)
// now param buat E2E deterministik.
export function parseDurasi(text, now = new Date()) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return { ms: null }; // kosong = selamanya
  if (/^(unli(mited)?|permanen(t)?|selamanya|∞|0)$/.test(t)) return { ms: null };
  const m = t.match(/^(\d{1,4})(m|h|d|w)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const mult = { m: 60e3, h: 36e5, d: 864e5, w: 6048e5 }[m[2]];
    const ms = n * mult;
    if (ms <= 0) return { invalid: true };
    return { ms };
  }
  // dd/mm/yyyy[ hh:mm] | hh:mm
  const dm = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (dm) {
    const [_, dd, mm, yyyy, hh, mi] = dm;
    const H = hh !== undefined ? parseInt(hh, 10) : 23;
    const M = hh !== undefined ? parseInt(mi, 10) : 59;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), H, hh !== undefined ? M : 59, hh !== undefined ? 0 : 59);
    if (d.getDate() !== Number(dd) || d.getMonth() !== Number(mm) - 1) return { invalid: true };
    if (d.getTime() <= now.getTime()) return { invalid: true, lewat: true };
    return { expiresAt: d.getTime() };
  }
  const hm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const H = parseInt(hm[1], 10), M = parseInt(hm[2], 10);
    if (H > 23 || M > 59) return { invalid: true };
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), H, M, 0);
    if (d.getTime() <= now.getTime()) d = new Date(d.getTime() + 864e5); // lewat → besok jam sama
    return { expiresAt: d.getTime() };
  }
  return { invalid: true };
}

// buang entri kedaluwarsa
function prune(list) {
  const now = Date.now();
  return list.filter((e) => !e.expiresAt || e.expiresAt > now);
}

// cek akses create: { allowed, entry }
export function isCreateAllowed(jid) {
  const t = normalizeTarget(jid);
  if (!t) return { allowed: false, entry: null };
  const list = prune(load());
  const entry = list.find((e) => e.id === t.id) || null;
  if (!entry) return { allowed: false, entry: null };
  return { allowed: true, entry };
}

// tambah/perpanjang. Signature lama: allowCreate(jid, ms, tipe).
// opts (v2): { role, addedBy, expiresAt (absolut, menang atas ms) }
// Return { ok, entry } | { ok: false, error }.
export function allowCreate(jid, ms, tipe = "client", opts = {}) {
  const t = normalizeTarget(jid);
  if (!t) return { ok: false, error: "Target tidak valid (nomor WA atau tg:<id_tele>)" };
  if (ms !== null && ms !== undefined && (!Number.isFinite(ms) || ms <= 0)) return { ok: false, error: "Durasi tidak valid" };
  const tp = String(tipe || "client").toLowerCase();
  if (tp !== "client" && tp !== "admin") return { ok: false, error: "Tipe harus client atau admin" };
  const role = String(opts.role || "basic").toLowerCase();
  if (!ROLE_RANK[role]) return { ok: false, error: "Role harus basic atau reseller" };
  if (opts.expiresAt !== undefined && opts.expiresAt !== null && !Number.isFinite(opts.expiresAt)) return { ok: false, error: "Durasi tidak valid" };
  const now = Date.now();
  const expiresAt = opts.expiresAt != null ? opts.expiresAt : ms === null || ms === undefined ? null : now + ms;
  const list = prune(load());
  const i = list.findIndex((e) => e.id === t.id);
  const entry = {
    id: t.id, number: t.display, platform: t.platform, role, tipe: tp,
    addedAt: i >= 0 ? list[i].addedAt : now,
    addedBy: i >= 0 ? (opts.addedBy || list[i].addedBy) : (opts.addedBy || "owner"),
    expiresAt,
  };
  if (i >= 0) list[i] = entry;
  else list.push(entry);
  save(list);
  return { ok: true, entry };
}

// hapus akses. by = id pemanggil ("owner" | "wa:628.." | "tg:..") — opsional.
// Kalau by diisi & bukan "owner" → cuma boleh hapus entri basic yang dia sendiri
// yang nambahin (addedBy === by). Return true kalau ada yang kehapus.
export function revokeCreate(jid, by = "owner") {
  const t = normalizeTarget(jid);
  if (!t) return false;
  const list = prune(load());
  const i = list.findIndex((e) => e.id === t.id);
  if (i < 0) return false;
  if (by !== "owner" && list[i].addedBy !== by) return false;
  if (by !== "owner" && list[i].role !== "basic") return false;
  list.splice(i, 1);
  save(list);
  return true;
}

// daftar aktif (sudah diprun). by = "owner" → semua;
// selain itu → cuma entri yang ditambahin pemanggil itu.
export function listCreateAllow(by = "owner") {
  const list = prune(load());
  if (by === "owner") return list;
  return list.filter((e) => e.addedBy === by);
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

export { ROLE_RANK };
