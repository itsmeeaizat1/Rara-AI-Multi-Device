// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-autojoin.js — auto join/leave grup & channel dengan timer (26 Sep 2026,
// fitur owner ".autojoin group|channel <link> <waktu>" & ".autoout group|channel <link> <waktu>").
//
// Alur: owner pasang tugas → tersimpan di DB → timer dipasang → di waktu
// ditentukan bot OTOMATIS join grup / follow channel / leave grup / unfollow
// channel → hasil (sukses/gagal) dikirim DM jujur ke owner.
//
// Persistence + restore: tugas pending dipasang ulang pas boot (schedulerInits
// "AutoJoin" di index.js); yang kelewat pas bot mati langsung dieksekusi
// sekali dengan penanda "terlewat" (pola reminder-engine).
//
// SEAM: _autojoinForTest() — clock & persist bisa di-mock buat e2e.

import moment from "moment-timezone";
import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";

const TZ = "Asia/Jakarta";
const KEY = "autojoinTasks";
const MIN_DELAY_MS = 10 * 1000; // min 10 dtk ke depan
const MAX_FUTURE_MS = 30 * 86400000; // max 30 hari

global.novaAutojoinTasks = global.novaAutojoinTasks || [];

let idCounter = 0;
let _now = () => Date.now();

function safeDb() {
  try { return getDatabase(); } catch { return null; }
}

function persistAutojoin() {
  const db = safeDb();
  if (!db) return;
  try {
    // timerId gak boleh kepersist (object Node.js.Timer)
    db.setting(KEY, global.novaAutojoinTasks.map(({ timerId, ...t }) => t));
  } catch {}
}

/** Parse link grup → kode invite (chat.whatsapp.com/<code>). Null kalau bukan link grup. */
export function extractGroupCode(link) {
  const m = String(link || "").match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

/** Link channel valid? (whatsapp.com/channel/xxx atau wa.me/channel/xxx) */
export function isChannelLink(link) {
  const s = String(link || "");
  return /whatsapp\.com\/channel\//.test(s) || /wa\.me\/channel\//.test(s);
}

/**
 * Parse waktu jadwal: relatif (10m/2h/1d/1w — s/m/h|j/d/w) · jam absolut
 * HH:mm (hari ini, lewat → besok) · "besok HH:mm" · "DD-MM [HH:mm]" (default 08:00).
 * Balikin timestamp ms, atau null kalau gak valid/terlalu dekat/terlalu jauh.
 */
export function parseWaktuAutojoin(str) {
  const s = String(str || "").trim().toLowerCase();
  if (!s) return null;
  const now = _now();
  let at = null;

  const mRel = s.match(/^(\d+)([smhdjw])$/);
  if (mRel) {
    const n = parseInt(mRel[1]);
    const mult = { s: 1000, m: 60000, h: 3600000, j: 3600000, d: 86400000, w: 604800000 };
    at = now + n * mult[mRel[2]];
  }

  if (at === null) {
    const mBesok = s.match(/^(besok\s+)?(\d{1,2})[:.](\d{2})$/);
    if (mBesok) {
      const h = +mBesok[2], mi = +mBesok[3];
      if (h > 23 || mi > 59) return null;
      const mt = moment.tz(TZ).hour(h).minute(mi).second(0).millisecond(0);
      if (mBesok[1]) mt.add(1, "days");
      if (!mBesok[1] && mt.valueOf() <= now) mt.add(1, "days");
      at = mt.valueOf();
    }
  }

  if (at === null) {
    const mDate = s.match(/^(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})[:.](\d{2}))?$/);
    if (mDate) {
      const d = +mDate[1], mo = +mDate[2] - 1;
      const y = moment.tz(TZ).year();
      const h = mDate[3] !== undefined ? +mDate[3] : 8;
      const mi = mDate[4] !== undefined ? +mDate[4] : 0;
      if (mo < 0 || mo > 11 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
      at = moment.tz(TZ).year(y).month(mo).date(d).hour(h).minute(mi).second(0).millisecond(0).valueOf();
    }
  }

  if (at === null) return null;
  if (at - now < MIN_DELAY_MS) return null;
  if (at - now > MAX_FUTURE_MS) return null;
  return at;
}

/** Format tanggal eksekusi WIB. */
export function formatWaktuAutojoin(ts) {
  return moment.tz(Number(ts), TZ).format("ddd, DD MMM YYYY HH:mm") + " WIB";
}

function formatSisa(fireAt) {
  const ms = fireAt - _now();
  if (ms <= 0) return "sekarang";
  const mnt = Math.floor(ms / 60000);
  const sisa = ms % 60000;
  if (mnt >= 1440) return `${Math.floor(mnt / 1440)} hari ${Math.floor((mnt % 1440) / 60)} jam`;
  if (mnt >= 60) return `${Math.floor(mnt / 60)} jam ${mnt % 60} menit`;
  if (mnt >= 1) return `${mnt} menit ${Math.floor(sisa / 1000)} dtk`;
  return `${Math.floor(ms / 1000)} dtk`;
}

function taskId() {
  idCounter += 1;
  return `AJ-${Date.now().toString(36).toUpperCase().slice(-4)}${idCounter}`;
}

async function dmOwner(sock, owner, text) {
  if (!sock?.sendMessage || !owner) return;
  try {
    await sock.sendMessage(owner, { text, mentions: [owner] });
  } catch {}
}

/** Eksekusi SATU tugas (dipanggil timer / restore terlewat). Hasil DM owner jujur. */
export async function fireAutojoinTask(sock, task, missed = false) {
  const label = task.action === "join" ? "JOIN" : "OUT";
  const head = `${task.action === "join" ? "📥" : "📤"} AUTO${label} ${task.target === "group" ? "GRUP" : "CHANNEL"}${missed ? " (terlewat — bot sempat mati)" : ""}`;
  let ok = false;
  let detail = "";
  try {
    if (task.action === "join" && task.target === "group") {
      await sock.groupAcceptInvite(task.code);
      ok = true;
      detail = "Bot berhasil join grup via link invite.";
    } else if (task.action === "join" && task.target === "channel") {
      const meta = await sock.cekIDSaluran(task.link);
      if (!meta?.id) throw new Error("link channel gak bisa diselesaikan (cekIDSaluran)");
      await sock.newsletterFollow(meta.id);
      ok = true;
      detail = `Bot berhasil follow channel${meta.name ? ` "${meta.name}"` : ""}.`;
    } else if (task.action === "out" && task.target === "group") {
      const info = await sock.groupGetInviteInfo(task.code);
      const jid = info?.id;
      if (!jid) throw new Error("link grup gak bisa diselesaikan");
      await sock.groupLeave(jid);
      ok = true;
      detail = "Bot berhasil keluar dari grup.";
    } else if (task.action === "out" && task.target === "channel") {
      const meta = await sock.cekIDSaluran(task.link);
      if (!meta?.id) throw new Error("link channel gak bisa diselesaikan (cekIDSaluran)");
      await sock.newsletterUnfollow(meta.id);
      ok = true;
      detail = `Bot berhasil unfollow channel${meta.name ? ` "${meta.name}"` : ""}.`;
    } else {
      throw new Error("tugas gak dikenal");
    }
  } catch (e) {
    ok = false;
    detail = e?.message || String(e);
  }
  const lines = [
    head,
    "",
    `Link: ${task.link}`,
    `Hasil: ${ok ? "✅ Berhasil" : "❌ Gagal"} — ${detail}`,
    `Dijadwalkan: ${formatWaktuAutojoin(task.at)}`,
  ];
  await dmOwner(sock, task.owner, claraWrap("Autojoin", lines.join("\n")));
  return ok;
}

/** Pasang timer tugas (dipakai plugin pas buat & restore pas boot). */
export function armAutojoinTask(sock, task) {
  if (task.timerId) clearTimeout(task.timerId);
  const delay = Math.max(0, Number(task.at) - _now());
  task.timerId = setTimeout(async () => {
    task.status = "fired";
    try {
      await fireAutojoinTask(sock, task, false);
    } catch {}
    persistAutojoin();
  }, delay);
  if (task.timerId.unref) task.timerId.unref();
}

/** Daftarkan tugas baru. Balikin { ok, task?, reason? } */
export function addAutojoinTask(sock, { action, target, link, at, owner }) {
  if (!["join", "out"].includes(action)) return { ok: false, reason: "aksi gak valid" };
  if (!["group", "channel"].includes(target)) return { ok: false, reason: "target gak valid" };
  const code = target === "group" ? extractGroupCode(link) : null;
  if (target === "group" && !code) return { ok: false, reason: "link grup gak valid (harus chat.whatsapp.com/…)" };
  if (target === "channel" && !isChannelLink(link)) return { ok: false, reason: "link channel gak valid (whatsapp.com/channel/…)" };
  if (!Number.isFinite(Number(at))) return { ok: false, reason: "waktu gak valid" };
  const task = {
    id: taskId(),
    action,
    target,
    link: String(link).trim(),
    code,
    at: Number(at),
    createdAt: _now(),
    owner,
    status: "pending",
  };
  global.novaAutojoinTasks.push(task);
  armAutojoinTask(sock, task);
  persistAutojoin();
  return { ok: true, task };
}

/** Batalkan tugas pending (clearTimeout + persist). */
export function cancelAutojoinTask(id, owner) {
  const t = global.novaAutojoinTasks.find(
    (x) => x && x.id === id && (!owner || x.owner === owner) && x.status === "pending",
  );
  if (!t) return null;
  if (t.timerId) clearTimeout(t.timerId);
  t.status = "cancelled";
  persistAutojoin();
  return t;
}

/** Daftar tugas pending milik owner. */
export function listAutojoinTasks(owner) {
  return global.novaAutojoinTasks.filter(
    (t) => t && t.status === "pending" && (!owner || t.owner === owner),
  );
}

/**
 * Dipanggil schedulerInits pas boot: tugas pending dari DB dipasang ulang
 * timernya; yang kelewat dieksekusi sekali (penanda terlewat).
 */
export function initAutoJoinScheduler(sock) {
  const db = safeDb();
  const saved = db?.setting(KEY) || [];
  const activeIds = new Set(global.novaAutojoinTasks.map((t) => t.id));
  let rearmed = 0, missed = 0;
  for (const t of saved) {
    if (!t || t.status !== "pending" || activeIds.has(t.id)) continue;
    global.novaAutojoinTasks.push(t);
    if (Number(t.at) > _now()) {
      armAutojoinTask(sock, t);
      rearmed++;
    } else {
      t.status = "fired";
      missed++;
      setTimeout(() => {
        fireAutojoinTask(sock, t, true).catch(() => {}).finally(() => persistAutojoin());
      }, 3000);
    }
  }
  if (rearmed || missed) {
    console.log(`「 ✦ AUTOJOIN ✦ 」\n\n│ 🕒 ${rearmed} tugas dipasang ulang · ${missed} terlewat dieksekusi\n`);
  }
  return { rearmed, missed };
}

/** seam e2e */
export function _autojoinForTest() {
  return {
    setNow: (fn) => (_now = fn),
    resetNow: () => (_now = () => Date.now()),
    reset: () => {
      for (const t of global.novaAutojoinTasks) {
        if (t.timerId) clearTimeout(t.timerId);
      }
      global.novaAutojoinTasks.length = 0;
    },
    resetCounter: () => (idCounter = 0),
  };
}
