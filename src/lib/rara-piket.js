// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-piket.js — Auto-Piket: rotasi tugas piket grup otomatis.
// Owner req 10 Okt 2026 (feat/auto-piket). 100% lokal, gak ada API eksternal.
//
// State machine per grup (persist via db.setting("piket")):
//   today       : "YYYY-MM-DD" hari tugas sekarang
//   todayStatus : "pending" | "done" | "izin"
//   pointer     : index anggota yang lagi piket
//   pausedUntil : epoch | null (pause rotasi, resume lanjut orang yang sama)
//   lastAnnounceAt / lastNagAt : anti nag dobel
// Rotasi: maju tiap pagi; .izin → orangnya pindah paling belakang & diganti hari itu juga.

import { CronJob } from "cron";
import moment from "moment-timezone";
import { getDatabase } from "./rara-database.js";
import { logger } from "./rara-logger.js";
import { raraWrap } from "./rara-menu-style.js";

const TZ = "Asia/Jakarta";
const NAG_DELAY_MS = 5 * 3600 * 1000;      // nag pertama 5 jam setelah announce
const NAG_INTERVAL_MS = 2 * 3600 * 1000;   // nag ulang maksimal tiap 2 jam
const HISTORY_LIMIT = 50;

let sockInstance = null;
let activeCronJob = null;
let nowOverride = null;

function _now() {
  return nowOverride !== null ? nowOverride : Date.now();
}
function _setNowForTest(ms) {
  nowOverride = typeof ms === "number" ? ms : null;
}

function dateStr(now) {
  return moment.tz(now, TZ).format("YYYY-MM-DD");
}
function cfgTimeToday(hour, minute, now) {
  return moment.tz(now, TZ).hour(hour).minute(minute).second(0).millisecond(0).valueOf();
}

// === persistence ============================================================
function getAll() {
  const db = getDatabase();
  return db.setting("piket") || {};
}
function saveAll(all) {
  const db = getDatabase();
  db.setting("piket", all);
  db.save();
}
export function __getPiketStoreForTest() {
  return getAll();
}
function getState(gid) {
  return getAll()[gid] || null;
}
function setState(gid, st) {
  const all = getAll();
  all[gid] = st;
  saveAll(all);
}

function normJid(j) {
  const s = String(j || "").trim();
  if (s.includes("@")) return s;
  if (/^\d{5,}$/.test(s)) return `${s}@s.whatsapp.net`;
  return null;
}
function displayName(member) {
  if (member?.name) return member.name;
  const jid = member?.jid || "";
  return (jid.split("@")[0] || "kawan").slice(-6);
}
function pushHistory(st, entry) {
  st.history = st.history || [];
  st.history.push(entry);
  if (st.history.length > HISTORY_LIMIT) st.history = st.history.slice(-HISTORY_LIMIT);
}

// === aksi via plugin ========================================================
export function registerPiket(gid, jids, { hour = 7, minute = 0 } = {}) {
  const members = jids.map((j) => ({ jid: normJid(j), name: null })).filter((m) => m.jid);
  if (members.length < 1) return { ok: false, error: "empty" };
  const st = {
    active: true,
    hour, minute,
    members,
    pointer: 0,
    today: null,
    todayStatus: "pending",
    pausedUntil: null,
    lastAnnounceAt: null,
    lastNagAt: null,
    streak: {},
    history: [],
    createdAt: _now(),
  };
  setState(gid, st);
  return { ok: true, state: st };
}

export function markDone(gid, senderJid) {
  const st = getState(gid);
  if (!st) return { ok: false, error: "belum-daftar" };
  const duty = st.members[st.pointer];
  if (!duty) return { ok: false, error: "belum-daftar" };
  if (duty.jid !== normJid(senderJid)) return { ok: false, error: "bukan-giliran", duty };
  st.todayStatus = "done";
  st.streak[duty.jid] = (st.streak[duty.jid] || 0) + 1;
  pushHistory(st, { date: st.today || dateStr(_now()), jid: duty.jid, name: displayName(duty), status: "done" });
  setState(gid, st);
  return { ok: true, state: st };
}

export function markIzin(gid, senderJid) {
  const st = getState(gid);
  if (!st) return { ok: false, error: "belum-daftar" };
  const idx = st.pointer;
  const duty = st.members[idx];
  if (!duty) return { ok: false, error: "belum-daftar" };
  if (duty.jid !== normJid(senderJid)) return { ok: false, error: "bukan-giliran", duty };
  // lepas tugas hari ini, pindah ke paling belakang, ganti orang berikutnya HARI INI juga
  st.members.splice(idx, 1);
  st.members.push(duty);
  st.pointer = st.pointer % st.members.length;
  st.todayStatus = "pending";
  st.streak[duty.jid] = 0;
  st.lastAnnounceAt = _now();
  st.lastNagAt = null;
  pushHistory(st, { date: st.today || dateStr(_now()), jid: duty.jid, name: displayName(duty), status: "izin" });
  setState(gid, st);
  return { ok: true, state: st, replaced: true };
}

export function setPiketJam(gid, hhmm) {
  const st = getState(gid);
  if (!st) return { ok: false, error: "belum-daftar" };
  const m = /^(\d{1,2})[:.](\d{1,2})$/.exec(String(hhmm || "").trim());
  const h = m ? parseInt(m[1], 10) : NaN;
  const min = m ? parseInt(m[2], 10) : NaN;
  if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isFinite(min) || min < 0 || min > 59) {
    return { ok: false, error: "jam-invalid" };
  }
  st.hour = h; st.minute = min;
  setState(gid, st);
  return { ok: true, state: st };
}

export function pausePiket(gid, ms) {
  const st = getState(gid);
  if (!st) return { ok: false, error: "belum-daftar" };
  st.pausedUntil = _now() + ms;
  setState(gid, st);
  return { ok: true, state: st };
}
export function resumePiket(gid) {
  const st = getState(gid);
  if (!st) return { ok: false, error: "belum-daftar" };
  st.pausedUntil = null;
  setState(gid, st);
  return { ok: true, state: st };
}
export function removePiket(gid) {
  const all = getAll();
  if (!all[gid]) return { ok: false, error: "belum-daftar" };
  delete all[gid];
  saveAll(all);
  return { ok: true };
}
export function getPiketState(gid) {
  return getState(gid);
}

// === announce / nag =========================================================
function dutyCard(prefix, st, extra) {
  const duty = st.members[st.pointer];
  const lines = [
    `${prefix} *PIKET HARI INI*`,
    "",
    `🧹 Giliran: @${duty.jid.split("@")[0]}`,
    `✅ Sudah beres? Ack dengan \`${prefix}piket done\``,
    `🙏 Gak bisa? \`${prefix}piket izin\` — otomatis diganti & pindah ke belakang`,
  ];
  if (extra) { lines.push(""); lines.push(extra); }
  return { text: raraWrap("Piket", lines), mentions: [duty.jid] };
}

async function announcePiket(sock, gid, st, prefix = ".") {
  const card = dutyCard(prefix, st);
  await sock.sendMessage(gid, { text: card.text, mentions: card.mentions });
}

async function nagPiket(sock, gid, st, prefix = ".") {
  const duty = st.members[st.pointer];
  const lines = [
    "⏰ *BELUM ACK PIKET!*",
    "",
    `🧹 @${duty.jid.split("@")[0]} — jangan lupa beresin ya, lalu \`${prefix}piket done\``,
  ];
  await sock.sendMessage(gid, { text: raraWrap("Piket", lines), mentions: [duty.jid] });
}

// === cek utama (cron tiap jam) ============================================
export async function runPiketCheck(sock) {
  const s = sock || sockInstance;
  if (!s) return;
  const now = _now();
  const today = dateStr(now);
  const all = getAll();

  for (const gid of Object.keys(all)) {
    try {
      const st = all[gid];
      if (!st || !Array.isArray(st.members) || st.members.length === 0) continue; // grup rusak → skip, gak crash
      if (st.pausedUntil && now < st.pausedUntil) continue;

      const cfgMs = cfgTimeToday(st.hour ?? 7, st.minute ?? 0, now);

      if (st.today !== today) {
        if (now < cfgMs) continue; // belum jam announce
        // tutup buku hari sebelumnya yang gak pernah di-ack
        if (st.today) {
          const prev = st.members[st.pointer];
          if (st.todayStatus === "pending" && prev) {
            st.streak[prev.jid] = 0;
            pushHistory(st, { date: st.today, jid: prev.jid, name: displayName(prev), status: "missed" });
          }
          st.pointer = (st.pointer + 1) % st.members.length;
        }
        st.today = today;
        st.todayStatus = "pending";
        st.lastAnnounceAt = now;
        st.lastNagAt = null;
        setState(gid, st);
        await announcePiket(s, gid, st);
        logger.info("Piket", `Announce ${gid} → ${st.members[st.pointer]?.jid}`);
      } else if (st.todayStatus === "pending") {
        const annAt = st.lastAnnounceAt || now;
        if (st.lastNagAt) {
          if (now - st.lastNagAt < NAG_INTERVAL_MS) continue;
        } else if (now - annAt < NAG_DELAY_MS) {
          continue;
        }
        st.lastNagAt = now;
        setState(gid, st);
        await nagPiket(s, gid, st);
        logger.info("Piket", `Nag ${gid} → ${st.members[st.pointer]?.jid}`);
      }
    } catch (e) {
      logger.error("Piket", `Check ${gid} gagal: ${e.message}`); // error boundary: grup lain lanjut
    }
  }
}

// === cron ==================================================================
export function startPiketScheduler(sock) {
  sockInstance = sock;
  stopPiketScheduler();
  // tiap jam tepat — announce/nag dihitung per grup (jam per grup bisa beda)
  activeCronJob = new CronJob("0 * * * *", () => {
    runPiketCheck(sockInstance).catch(() => {});
  }, null, true, TZ);
  logger.info("Piket", "Scheduler mulai (tiap jam)");
}
export function stopPiketScheduler() {
  if (activeCronJob) { activeCronJob.stop(); activeCronJob = null; }
}
export function initPiket(sock) {
  sockInstance = sock;
  startPiketScheduler(sock);
}

// === test seam ==============================================================
export function __advanceDayForTest(gid) {
  const st = getState(gid);
  if (!st) return;
  st.today = dateStr(_now() - 24 * 3600 * 1000);
  setState(gid, st);
}
export { _setNowForTest as __setNowForTest };
