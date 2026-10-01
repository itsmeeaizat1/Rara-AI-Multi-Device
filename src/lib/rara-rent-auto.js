// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-rent-auto.js — AUTO SEWA & PREMIUM MANAGER (27 Sep 2026, fitur
// automation no.2). Sewa & premium gak lagi "mati diam-diam":
//   1. Reminder H-3 & H-1 sebelum sewa/premium habis → DM penyewa (kartu 🕒)
//   2. Premium kedaluwarsa → otomatis dihapus dari list (jaga list bersih)
//   3. Grup sewa kedaluwarsa → pengumuman ke grup SEKALI → setelah grace
//      period (default 3 hari) bot keluar grup sendiri + record dibersihin
//   4. Semua kejadian dicatat → digest harian ke DM owner (jam atur sendiri)
// Dipakai oleh: plugins/owner/rentauto.js + scheduler "RentAuto" index.js.
// Pola: rara-botdoctor.js (state ensure + seam clock/owner jid + idempotent).

import { getDatabase } from "./rara-database.js";
import { loadPremium, removePremium } from "./rara-premium-db.js";
import { boxLeft } from "./styler.js";
import config from "../../config.js";

const DAY_MS = 24 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;
const TICK_MS = 30 * 60 * 1000; // interval scheduler (fix 30 mnt)
const LOG_CAP = 200;
const GRACE_MIN = 0, GRACE_MAX = 30;

let _nowImpl = null;
export function _setRentAutoNowForTest(fn) { _nowImpl = fn; }
export function _clearRentAutoNowForTest() { _nowImpl = null; }
function nowMs() { return typeof _nowImpl === "function" ? _nowImpl() : Date.now(); }

let _ownerJidImpl = null;
export function _setRentAutoOwnerJidForTest(fn) { _ownerJidImpl = fn; }
export function _clearRentAutoOwnerJidForTest() { _ownerJidImpl = null; }
function ownerJid() {
  if (typeof _ownerJidImpl === "function") return _ownerJidImpl();
  try {
    const raw = Array.isArray(config?.owner) ? config.owner[0] : config?.owner;
    const num = String(raw || "").replace(/\D/g, "");
    return num ? `${num}@s.whatsapp.net` : null;
  } catch { return null; }
}

// ── state ─────────────────────────────────────────────────────────────
export function ensureRentAutoState(db) {
  if (!db.data.rentAuto || typeof db.data.rentAuto !== "object") db.data.rentAuto = {};
  const st = db.data.rentAuto;
  if (typeof st.on !== "boolean") st.on = true; // default AKTIF
  if (!Number.isFinite(st.graceDays)) st.graceDays = 3;
  st.graceDays = Math.min(GRACE_MAX, Math.max(GRACE_MIN, Math.floor(Number(st.graceDays))));
  if (typeof st.digestJam !== "string" || !/^\d{2}:\d{2}$/.test(st.digestJam)) st.digestJam = "21:00";
  if (!Number.isFinite(st.lastDigestTs)) st.lastDigestTs = 0;
  if (typeof st.lastDigestDate !== "string") st.lastDigestDate = "";
  if (!st.marks || typeof st.marks !== "object") st.marks = {};
  if (!Array.isArray(st.log)) st.log = [];
  return st;
}

// ── helpers waktu (WIB, pola briefing: geser +7 dari UTC) ──────────────
function wibDate(ts) { return new Date(ts + 7 * HOUR_MS); }
function wibTanggal(ts) {
  const d = wibDate(ts);
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${d.getUTCDate()} ${bulan[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function wibTanggalJam(ts) {
  const d = wibDate(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${wibTanggal(ts)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} WIB`;
}
function wibJamMenit(ts) {
  const d = wibDate(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function wibHariKe(ts) {
  const d = wibDate(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// ── kartu keluaran (Aina: sopan, saya/kamu, maks 3 emoji, 🕒 countdown) ─
function kartuSewaReminder(g, exp, sisaHari) {
  const sisa = sisaHari <= 1 ? "kurang dari 1 hari" : `${sisaHari} hari`;
  return boxLeft("🕒 SEWA HAMPIR HABIS",
    `Halo, saya Aina dari bot Rara.\n\n` +
    `Masa sewa bot untuk grup *${g.name || "grup kamu"}* tersisa ${sisa} lagi.\n` +
    `Berakhir pada: ${wibTanggalJam(exp)}.\n\n` +
    `Supaya fitur di grup kamu tetap berjalan tanpa terputus, mohon perpanjang sebelum tanggal tersebut ya. ` +
    `Kamu bisa cek sisa waktu kapan saja dengan ketik .ceksewa di grup.\n\n` +
    `Terima kasih atas kepercayaannya.`);
}
function kartuPremiumReminder(p, exp) {
  return boxLeft("🕒 PREMIUM HAMPIR HABIS",
    `Halo ${p.name || "Kak"}, saya Aina dari bot Rara.\n\n` +
    `Masa premium kamu tersisa kurang dari 1 hari lagi.\n` +
    `Berakhir pada: ${wibTanggalJam(exp)}.\n\n` +
    `Mohon perpanjang lewat owner supaya akses fitur premium kamu tetap aktif ya.`);
}
function kartuSewaBerakhir(g, graceDays, exp) {
  return boxLeft("🕒 SEWA BERAKHIR",
    `Masa sewa bot untuk grup ini sudah berakhir pada ${wibTanggalJam(exp)}.\n\n` +
    `Bot akan keluar dari grup secara otomatis dalam ${graceDays} hari ke depan.\n` +
    `Kalau ingin lanjut, silakan hubungi owner untuk perpanjang sebelum masa itu habis.\n\n` +
    `Terima kasih atas kepercayaannya selama ini.`);
}
function kartuDigest(entries, now) {
  const lines = entries.map((e) => `• ${e.text}`);
  return boxLeft("🕒 LAPORAN SEWA AUTO",
    `${wibTanggal(now)}\n\n` +
    `${lines.join("\n")}\n\n` +
    `Total ${entries.length} kejadian sejak laporan terakhir.`);
}

function pushLog(st, now, text) {
  st.log.push({ ts: now, text });
  if (st.log.length > LOG_CAP) st.log.splice(0, st.log.length - LOG_CAP);
}

// ── digest harian owner ───────────────────────────────────────────────
async function processDigest(st, now, send) {
  const actions = [];
  const jam = wibJamMenit(now);
  const hari = wibHariKe(now);
  if (st.lastDigestDate === hari) return actions; // dedupe per hari (pola briefing)
  if (jam < st.digestJam) return actions; // belum waktunya
  const entries = st.log.filter((e) => e.ts > (st.lastDigestTs || 0));
  if (entries.length) {
    const ok = await send(ownerJid(), kartuDigest(entries, now));
    if (ok) actions.push(`digest harian terkirim (${entries.length} kejadian)`);
  }
  // kosong → tetap tandai hari ini selesai biar gak dicek tiap tick (jujur: gak ada kejadian, gak spam)
  st.lastDigestTs = now;
  st.lastDigestDate = hari;
  return actions;
}

// ── core tick: return daftar aksi (buat .rentauto tes) ────────────────
export async function processRentAutoTick(sock) {
  const db = getDatabase();
  const st = ensureRentAutoState(db);
  if (!st.on) return [];
  const now = nowMs();
  const actions = [];
  const send = async (jid, text) => {
    if (!sock?.sendMessage || !jid || !text) return false;
    try { await sock.sendMessage(jid, { text }); return true; }
    catch { return false; }
  };

  // 1) PREMIUM: reminder H-1 + bersihin yang kedaluwarsa
  try {
    const prem = loadPremium();
    for (const p of prem) {
      if (!p || typeof p !== "object") continue; // record legacy string gak ada tanggal
      const num = String(p.number || p.jid || "").replace(/\D/g, "");
      const exp = Date.parse(p.expiredAt || "");
      if (!num || !Number.isFinite(exp)) continue;
      if (exp <= now) {
        const r = removePremium(num);
        if (r?.success) {
          delete st.marks["prem:" + num];
          pushLog(st, now, `Premium *${p.name || num}* (${num}) kedaluwarsa — dihapus otomatis`);
          actions.push(`premium habis: ${p.name || num} (${num}) — dihapus otomatis`);
        }
      } else if (exp - now <= DAY_MS) {
        const key = "prem:" + num;
        const mk = st.marks[key] || {};
        if (mk.h1At !== exp) {
          const ok = await send(`${num}@s.whatsapp.net`, kartuPremiumReminder(p, exp));
          if (ok) {
            mk.h1At = exp; st.marks[key] = mk;
            pushLog(st, now, `Reminder H-1 premium dikirim ke ${num}`);
            actions.push(`reminder H-1 premium: ${p.name || num} (${num})`);
          }
        }
      }
    }
  } catch (e) { console.error("[rara-rent-auto.js] premium sweep:", e?.message); }

  // 2) SEWA grup: reminder H-3/H-1 → umum expired → keluar setelah grace
  try {
    const groups = db.data?.sewa?.groups;
    if (groups && typeof groups === "object") {
      for (const gid of Object.keys(groups)) {
        const g = groups[gid];
        if (!g || g.isLifetime || !g.expiredAt) continue; // lifetime gak pernah habis
        const exp = Number(g.expiredAt);
        if (!Number.isFinite(exp)) continue;
        const key = "sewa:" + gid;
        const mk = st.marks[key] || {};
        if (exp > now) {
          const sisa = exp - now;
          if (sisa <= DAY_MS) {
            if (mk.h1At !== exp) {
              const ok = await send(g.addedBy, kartuSewaReminder(g, exp, 1));
              if (ok) {
                mk.h1At = exp; st.marks[key] = mk;
                pushLog(st, now, `Reminder H-1 sewa grup *${g.name}* dikirim ke penyewa`);
                actions.push(`reminder H-1 sewa: ${g.name}`);
              }
            }
          } else if (sisa <= 3 * DAY_MS) {
            if (mk.h3At !== exp) {
              const ok = await send(g.addedBy, kartuSewaReminder(g, exp, Math.ceil(sisa / DAY_MS)));
              if (ok) {
                mk.h3At = exp; st.marks[key] = mk;
                pushLog(st, now, `Reminder H-3 sewa grup *${g.name}* dikirim ke penyewa`);
                actions.push(`reminder H-3 sewa: ${g.name}`);
              }
            }
          }
        } else {
          // sudah kedaluwarsa
          if (mk.expAt !== exp) {
            const ok = await send(gid, kartuSewaBerakhir(g, st.graceDays, exp));
            if (ok) {
              mk.expAt = exp; st.marks[key] = mk;
              pushLog(st, now, `Pengumuman sewa habis dikirim ke grup *${g.name}*`);
              actions.push(`umum sewa habis: ${g.name}`);
            }
          }
          if (now >= exp + st.graceDays * DAY_MS) {
            let left = false;
            try {
              if (sock?.groupLeave) { await sock.groupLeave(gid); left = true; }
            } catch { left = false; }
            if (left) {
              delete groups[gid];
              delete st.marks[key];
              pushLog(st, now, `Bot keluar otomatis dari grup *${g.name}* (grace ${st.graceDays} hari lewat)`);
              actions.push(`keluar grup sewa habis: ${g.name}`);
            }
          }
        }
      }
    }
  } catch (e) { console.error("[rara-rent-auto.js] sewa sweep:", e?.message); }

  // 3) digest harian owner
  try {
    const dig = await processDigest(st, now, send);
    actions.push(...dig);
  } catch (e) { console.error("[rara-rent-auto.js] digest:", e?.message); }

  try { db.db.write(); } catch { }
  return actions;
}

// ── kartu status buat .rentauto status/tes ────────────────────────────
export function buildRentAutoStatus(db) {
  const st = ensureRentAutoState(db);
  const now = nowMs();
  let sewaAktif = 0, sewaSegera = 0, grupKadaluarsa = 0;
  const groups = db.data?.sewa?.groups || {};
  for (const g of Object.values(groups || {})) {
    if (!g) continue;
    if (g.isLifetime || !g.expiredAt) { sewaAktif++; continue; }
    const exp = Number(g.expiredAt);
    if (exp > now) { sewaAktif++; if (exp - now <= 3 * DAY_MS) sewaSegera++; }
    else grupKadaluarsa++;
  }
  let premAktif = 0, premSegera = 0;
  try {
    for (const p of loadPremium()) {
      if (!p || typeof p !== "object") continue;
      const exp = Date.parse(p.expiredAt || "");
      if (!Number.isFinite(exp)) continue;
      if (exp > now) { premAktif++; if (exp - now <= DAY_MS) premSegera++; }
    }
  } catch { }
  const lines = [
    `Status: ${st.on ? "AKTIF ✅" : "MATI"}`,
    `Grace period: ${st.graceDays} hari`,
    `Digest harian: ${st.digestJam} WIB`,
    ``,
    `Grup sewa aktif: ${sewaAktif} (segera habis ≤3 hari: ${sewaSegera})`,
    `Grup kedaluarsa (nunggu grace): ${grupKadaluarsa}`,
    `Premium aktif: ${premAktif} (segera habis ≤1 hari: ${premSegera})`,
    ``,
    `Laporan terakhir: ${st.lastDigestTs ? wibTanggalJam(st.lastDigestTs) : "belum ada"}`,
  ];
  return boxLeft("🕒 SEWA AUTO", lines.join("\n"));
}

// ── scheduler (idempotent, pola botdoctor/briefing) ───────────────────
let _timer = null;
export function initRentAutoScheduler(sock) {
  if (_timer) return _timer;
  _timer = setInterval(async () => {
    try { await processRentAutoTick(sock); } catch { /* tick gagal → tick berikutnya */ }
  }, TICK_MS);
  return _timer;
}
export function stopRentAutoScheduler() { if (_timer) { clearInterval(_timer); _timer = null; } }
