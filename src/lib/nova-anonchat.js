// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-anonchat.js — engine chat anonim antar member bot (DM only).
// Dua user di-pair acak, pesan diteruskan TANPA nunjukin nomor.
// GUARD KEAMANAN (request owner 23 Sep 2026): lawan chat ngirim link /
// materi mencurigakan → sesi DITUTUP OTOMATIS + laporan DM owner
// (pengirim link tetap gak dibocorin ke partner, cuma owner yang tahu).
// Media gak diteruskan (cuma teks). Flood guard + timeout idle 10 mnt.
import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";
import { config } from "../../config.js";

// ── konstanta ──
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;   // sesi idle > 10 mnt → tutup
const QUEUE_TIMEOUT_MS = 30 * 60 * 1000;   // nunggu partner > 30 mnt → batal
const FLOOD_MS = 800;                      // jarak minimal antar pesan per user
const MAX_LEN = 800;                       // cap panjang pesan diteruskan
const TEXT_TYPES = new Set(["conversation", "extendedTextMessage"]);

// GUARD: link / materi mencurigakan → sesi langsung ditutup
// (url apa pun, wa.me, t.me, domain umum, bit.ly dkk)
const LINK_RE = /(\bhttps?:\/\/|www\.|\bwa\.me\/|\bt\.me\/|\bbit\.ly\/|\btinyurl\.com\/|\b[a-z0-9][a-z0-9-]*\.(com|net|org|id|io|me|link|xyz|tv|gg|app|site|shop|info|online|store|web\.id|my\.id|co\.id)\b)/i;

// ── seams buat e2e ──
let _idleMs = IDLE_TIMEOUT_MS, _floodMs = FLOOD_MS;
export function _setAnonTimingsForTest(idleMs, floodMs) { _idleMs = idleMs; _floodMs = floodMs; }
export function _resetAnonTimingsForTest() { _idleMs = IDLE_TIMEOUT_MS; _floodMs = FLOOD_MS; }
let _sweeperInterval = null;
export function _stopAnonSweeperForTest() { if (_sweeperInterval) { clearInterval(_sweeperInterval); _sweeperInterval = null; } }

// ── state (persist db.data.anonchat — tahan restart) ──
export function getAnon(db) {
  const d = db || getDatabase();
  if (!d.data.anonchat || typeof d.data.anonchat !== "object") d.data.anonchat = {};
  const a = d.data.anonchat;
  if (!Array.isArray(a.queue)) a.queue = [];
  if (a.queue.some((q) => !q || !q.jid)) a.queue = a.queue.filter((q) => q && q.jid);
  if (!a.sessions || typeof a.sessions !== "object") a.sessions = {};
  return a;
}

function ownerJid() {
  const n = (config.owner?.number || [])[0] || "";
  const digits = String(n).replace(/\D/g, "");
  return digits ? digits + "@s.whatsapp.net" : "";
}

async function dm(sock, jid, text) {
  if (!sock || !jid) return false;
  try { await sock.sendMessage(jid, { text }); return true; } catch { return false; }
}

// ── tutup sesi dua arah (idempotent) ──
export async function closeSession(sock, db, jid, reasonText, { violator = null, notifyOwner = false } = {}) {
  const a = getAnon(db);
  const me = a.sessions[jid];
  if (!me) return false;
  const partner = me.partner;
  delete a.sessions[jid];
  delete a.sessions[partner];
  db.save();
  // pengirim pelanggaran / pihak yang keluar
  const isViolator = violator === jid;
  const txtMe = violator
    ? (isViolator
        ? `${reasonText}\n\nKamu ngirim link/materi yang gak diizinkan — sesi ditutup otomatis. Cari partner baru: .anonymouschat`
        : `${reasonText}\n\nLawan chatmu ngirim link/materi terlarang — sesi ditutup otomatis demi keamanan. Cari partner baru: .anonymouschat`)
    : `${reasonText}\n\nCari partner baru: .anonymouschat`;
  await dm(sock, jid, claraWrap("Chat Anonim", txtMe));
  // partner
  const isPartnerViolator = violator && violator === partner;
  const txtPartner = violator
    ? (isPartnerViolator
        ? `${reasonText}\n\nKamu ngirim link/materi yang gak diizinkan — sesi ditutup otomatis. Cari partner baru: .anonymouschat`
        : `${reasonText}\n\nLawan chatmu ngirim link/materi terlarang — sesi ditutup otomatis demi keamanan. Cari partner baru: .anonymouschat`)
    : `${reasonText}\n\nLawan chatmu keluar. Cari partner baru: .anonymouschat`;
  await dm(sock, partner, claraWrap("Chat Anonim", txtPartner));
  if (notifyOwner && violator) {
    await dm(sock, ownerJid(), `[CHAT ANONIM] Guard menutup sesi: ${violator.split("@")[0]} ngirim link/materi terlarang. Nomor lawan chatnya TIDAK dibocorin ke pengirim.`);
  }
  return true;
}

// ── masuk queue / langsung pairing ──
export async function startChat(m, sock, db) {
  const a = getAnon(db);
  const jid = m.sender;
  if (a.sessions[jid]) {
    return m.reply(claraWrap("Chat Anonim", `Kamu lagi di sesi chat. Keluar dulu pakai .stopanon atau ganti partner pakai .skipanon ya.`));
  }
  const inQueue = a.queue.findIndex((q) => q.jid === jid);
  if (inQueue >= 0) {
    return m.reply(claraWrap("Chat Anonim", `Kamu sudah masuk daftar tunggu. Sabar ya, kamu bakal di-cocokin begitu ada partner (${a.queue.length} di antrean).`));
  }
  // FIFO: cocokin sama yang paling lama nunggu
  let waited = null;
  while (a.queue.length) {
    const cand = a.queue.shift();
    if (Date.now() - (cand.at || 0) > QUEUE_TIMEOUT_MS) continue; // kedaluwarsa, buang
    waited = cand;
    break;
  }
  if (waited && waited.jid && waited.jid !== jid) {
    const now = Date.now();
    a.sessions[jid] = { partner: waited.jid, startedAt: now, lastActive: now, lastRelayAt: 0 };
    a.sessions[waited.jid] = { partner: jid, startedAt: now, lastActive: now, lastRelayAt: 0 };
    db.save();
    await m.reply(claraWrap("Chat Anonim", [
      `Kamu terhubung sama stranger! 💬`,
      "",
      "Chat biasa aja — pesanmu diteruskan tanpa nunjukin nomor kamu.",
      "Ganti partner: .skipanon · Keluar: .stopanon",
      "",
      "Catatan: ngirim link = sesi otomatis ditutup (guard keamanan).",
    ]));
    await dm(sock, waited.jid, claraWrap("Chat Anonim", [
      `Ada stranger yang terhubung sama kamu! 💬`,
      "",
      "Chat biasa aja — pesanmu diteruskan tanpa nunjukin nomor kamu.",
      "Ganti partner: .skipanon · Keluar: .stopanon",
      "",
      "Catatan: ngirim link = sesi otomatis ditutup (guard keamanan).",
    ]));
    try { await m.react("⚡"); } catch {}
    return;
  }
  a.queue.push({ jid, at: Date.now() });
  db.save();
  try { await m.react("🔍"); } catch {}
  return m.reply(claraWrap("Chat Anonim", [
    "Kamu masuk daftar tunggu chat anonim.",
    "Begitu ada user lain yang mulai chat juga, kamu otomatis di-cocokin — pantau DM kamu ya.",
    "",
    `Yang nunggu sekarang: ${a.queue.length} (termasuk kamu).`,
    "Batal cari: .stopanon",
  ]));
}

// ── skip: putus sesi + langsung cari partner baru ──
export async function skipChat(m, sock, db) {
  const a = getAnon(db);
  const jid = m.sender;
  if (!a.sessions[jid]) {
    return m.reply(claraWrap("Chat Anonim", "Kamu lagi gak di sesi chat. Mulai dulu: .anonymouschat"));
  }
  await closeSession(sock, db, jid, "Sesi diputuskan (skip).");
  return startChat(m, sock, db);
}

// ── stop: keluar sesi ATAU daftar tunggu ──
export async function stopChat(m, sock, db) {
  const a = getAnon(db);
  const jid = m.sender;
  const qi = a.queue.findIndex((q) => q.jid === jid);
  if (qi >= 0) {
    a.queue.splice(qi, 1);
    db.save();
    return m.reply(claraWrap("Chat Anonim", "Kamu keluar dari daftar tunggu. Kapan pun mau nyoba lagi: .anonymouschat"));
  }
  if (a.sessions[jid]) {
    await closeSession(sock, db, jid, "Lawan chatmu keluar dari sesi (stop).");
    return;
  }
  return m.reply(claraWrap("Chat Anonim", "Kamu lagi gak di sesi/daftar tunggu chat anonim."));
}

// ── relay pesan (hook non-command di handler.js) ──
export async function relayMessage(m, sock, db) {
  const a = getAnon(db);
  const me = a.sessions[m.sender];
  if (!me) return false;
  // relay CUMA buat DM bot (bukan saat user ngetik di grup)
  if (m.chat !== m.sender) return false;
  const now = Date.now();
  // media / pesan bukan teks → tolak (gak diteruskan)
  if (m.mtype && !TEXT_TYPES.has(m.mtype)) {
    const lastNotice = me._mediaNoticeAt || 0;
    if (now - lastNotice > 5000) {
      me._mediaNoticeAt = now;
      db.save();
      await m.reply(claraWrap("Chat Anonim", "Media (foto/video/stiker/dll) gak bisa diteruskan di chat anonim — cuma teks ya."));
    }
    return true;
  }
  const text = String(m.text || "").trim();
  if (!text) return true;
  // command (diawali prefix) → biarin dispatch command normal
  if (text.startsWith(".")) return false;
  // GUARD: link → sesi ditutup otomatis + owner dilapori
  if (LINK_RE.test(text)) {
    await closeSession(sock, db, m.sender, "GUARD: link/materi mencurigakan terdeteksi.", { violator: m.sender, notifyOwner: true });
    return true;
  }
  // flood guard
  if (now - (me.lastRelayAt || 0) < _floodMs) {
    const lastNotice = me._floodNoticeAt || 0;
    if (now - lastNotice > 3000) {
      me._floodNoticeAt = now;
      db.save();
      await m.reply(claraWrap("Chat Anonim", "Pelan-pelan ya, jangan spam."));
    }
    return true;
  }
  // relay
  me.lastRelayAt = now;
  me.lastActive = now;
  const partnerRec = a.sessions[me.partner];
  if (partnerRec) partnerRec.lastActive = now;
  db.save();
  const sent = await dm(sock, me.partner, claraWrap("Stranger 💬", text.slice(0, MAX_LEN)));
  if (!sent) {
    await closeSession(sock, db, m.sender, "Lawan chatmu gak bisa dihubungi — sesi ditutup.");
  }
  return true;
}

// ── sweeper: sesi idle & queue kedaluwarsa (dipanggil index.js schedulerInits) ──
export async function initAnonChatSweeper(sock, intervalMs = 60 * 1000) {
  if (_sweeperInterval) clearInterval(_sweeperInterval);
  const sweep = async () => {
    try {
      const db = getDatabase();
      const a = getAnon(db);
      const now = Date.now();
      // sesi idle dua arah (proses pasangan sekali)
      const seen = new Set();
      for (const [jid, rec] of Object.entries(a.sessions)) {
        if (seen.has(jid)) continue;
        seen.add(jid);
        seen.add(rec.partner);
        if (now - (rec.lastActive || rec.startedAt || 0) > _idleMs) {
          await closeSession(sock, db, jid, "Sesi ditutup otomatis: gak ada aktivitas lebih dari 10 menit.");
        }
      }
      // queue kedaluwarsa
      const before = a.queue.length;
      a.queue = a.queue.filter((q) => now - (q.at || 0) <= QUEUE_TIMEOUT_MS);
      if (a.queue.length !== before) db.save();
    } catch { /* sabar */ }
  };
  _sweeperInterval = setInterval(sweep, intervalMs);
  return true;
}
