// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-chatib-lobby.js — engine LOBBY ANONIM MULTI-USER (inspirasi chatib.chat).
// Beda dari vibychat (1-on-1 random): chatib = ruang lobby — semua member
// saling nyapa pakai NICKNAME (nomor WA gak pernah dibocorin).
// ATURAN (revisi owner 24 Sep 2026): ngirim link BOLEH (di-broadcast
// normal). Member di-keluarkan otomatis kalau GAK ADA AKTIVITAS
// selama 1 JAM. Media ditolak (cuma teks), flood guard,
// pesan TIDAK disimpan — cuma daftar member di db.data.chatiblobby.
import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";

// ── konstanta ──
const IDLE_KICK_MS = 60 * 60 * 1000;  // gak ada aktivitas > 1 jam → auto-leave
const FLOOD_MS = 800;                 // jarak minimal antar pesan per member
const MAX_LEN = 600;                  // cap panjang pesan broadcast
const MAX_NICK_LEN = 16;
const MAX_MEMBERS = 20;               // lobby penuh di atas ini
const TEXT_TYPES = new Set(["conversation", "extendedTextMessage"]);


// ── seams buat e2e ──
let _idleMs = IDLE_KICK_MS, _floodMs = FLOOD_MS, _maxMembers = MAX_MEMBERS;
export function _setChatibTimingsForTest(idleMs, floodMs, maxMembers) {
  _idleMs = idleMs; _floodMs = floodMs;
  if (maxMembers) _maxMembers = maxMembers;
}
export function _resetChatibTimingsForTest() { _idleMs = IDLE_KICK_MS; _floodMs = FLOOD_MS; _maxMembers = MAX_MEMBERS; }
let _sweeperInterval = null;
export function _stopChatibSweeperForTest() { if (_sweeperInterval) { clearInterval(_sweeperInterval); _sweeperInterval = null; } }

// ── state (persist db.data.chatiblobby — tahan restart) ──
export function getLobby(db) {
  const d = db || getDatabase();
  if (!d.data.chatiblobby || typeof d.data.chatiblobby !== "object") d.data.chatiblobby = {};
  const l = d.data.chatiblobby;
  if (!l.members || typeof l.members !== "object") l.members = {};
  for (const [jid, m] of Object.entries(l.members)) {
    if (!m || !m.nick) delete l.members[jid]; // data korup → buang
  }
  return l;
}

async function dm(sock, jid, text) {
  if (!sock || !jid) return false;
  try { await sock.sendMessage(jid, { text }); return true; } catch { return false; }
}

// ── nickname: auto-generate kalau gak dikasih ──
const NICK_ADJ = ["Bebek", "Kucing", "Naga", "Rubah", "Panda", "Hiu", "Kupu", "Sapi", "Gagak", "Kodok", "Elang", "Ular"];
const NICK_NOUN = ["Biru", "Galak", "Santuy", "Ceriakan", "Petir", "Malam", "Kilat", "Tidur", "Sultan", "Pemberani", "Misterius", "Ceria"];
function genNick() {
  const a = NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)];
  const b = NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)];
  return a + b + Math.floor(10 + Math.random() * 89);
}
function cleanNick(raw) {
  const n = String(raw || "").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, MAX_NICK_LEN);
  return n;
}
function normNick(n) { return String(n || "").replace(/\s+/g, "").toLowerCase(); }
function uniqueNick(lobby, base) {
  let nick = base, i = 1;
  const taken = new Set(Object.values(lobby.members).map((m) => normNick(m.nick)));
  while (taken.has(normNick(nick))) {
    nick = base + ++i;
    if (nick.length > MAX_NICK_LEN) { nick = base.slice(0, MAX_NICK_LEN - 2) + ++i; }
  }
  return nick;
}

function rulesText(count) {
  return [
    `Kamu di Chatib Lobby — ruang obrol anonim (${count} online).`,
    "",
    "Semua member lihat pesanmu, tapi nomor kamu TIDAK pernah dibocorin — kamu cuma dikenal lewat nickname.",
    "Ganti nama: .chatibnick <nama> · Daftar member: .chatiblist · Keluar: .chatibleave",
    "",
    "Catatan: kamu di-keluarkan otomatis kalau gak ada aktivitas selama 1 jam.",
  ].join("\n");
}

// ── masuk lobby ──
export async function joinLobby(m, sock, db) {
  const l = getLobby(db);
  const jid = m.sender;
  const count = Object.keys(l.members).length;
  if (l.members[jid]) {
    return m.reply(claraWrap("Chatib Lobby", `Kamu udah di lobby sebagai "${l.members[jid].nick}". Keluar dulu pakai .chatibleave kalau mau, atau langsung chat aja.`));
  }
  if (count >= _maxMembers) {
    return m.reply(claraWrap("Chatib Lobby", `Lobby lagi penuh (${count}/${_maxMembers} member). Coba lagi nanti ya.`));
  }
  const wanted = cleanNick((m.args || []).join(" "));
  const nick = uniqueNick(l, wanted || genNick());
  const now = Date.now();
  l.members[jid] = { nick, joinedAt: now, lastActive: now, lastRelayAt: 0 };
  db.save();
  await m.reply(claraWrap("Chatib Lobby", rulesText(count + 1) + `\n\nNickname kamu: ${nick}${wanted && wanted !== nick ? ` (nama "${wanted}" udah dipake, kamu dikasih "${nick}")` : ""}`));
  // broadcast ke member lain
  for (const [otherJid, om] of Object.entries(l.members)) {
    if (otherJid === jid) continue;
    await dm(sock, otherJid, claraWrap("Chatib Lobby", `${nick} masuk lobby 👋 (${count + 1} online)`));
  }
  try { await m.react("⚡"); } catch {}
  return true;
}

// ── ganti nickname ──
export async function setNick(m, sock, db) {
  const l = getLobby(db);
  const me = l.members[m.sender];
  if (!me) {
    return m.reply(claraWrap("Chatib Lobby", "Kamu belum masuk lobby. Masuk dulu: .chatiblobby [nama]"));
  }
  const wanted = cleanNick((m.args || []).join(" "));
  if (!wanted) {
    return m.reply(claraWrap("Chatib Lobby", `Nama kamu sekarang: ${me.nick}. Ganti: .chatibnick <nama baru>`));
  }
  const nick = uniqueNick(l, wanted);
  const old = me.nick;
  me.nick = nick;
  db.save();
  await m.reply(claraWrap("Chatib Lobby", `Nickname kamu jadi "${nick}".`));
  for (const [otherJid] of Object.entries(l.members)) {
    if (otherJid === m.sender) continue;
    await dm(sock, otherJid, claraWrap("Chatib Lobby", `${old} ganti nama jadi "${nick}".`));
  }
  return true;
}

// ── daftar member (nick doang — nomor gak pernah muncul) ──
export async function listMembers(m, db) {
  const l = getLobby(db);
  const nicks = Object.values(l.members).map((x) => x.nick);
  if (!nicks.length) {
    return m.reply(claraWrap("Chatib Lobby", "Lobby lagi kosong. Kamu yang pertama? Masuk: .chatiblobby [nama]"));
  }
  return m.reply(claraWrap("Chatib Lobby", `Online sekarang (${nicks.length}):\n` + nicks.map((n) => `• ${n}`).join("\n")));
}

// ── keluar lobby (idempotent) ──
export async function leaveLobby(m, sock, db, { reason = null } = {}) {
  const l = getLobby(db);
  const jid = m.sender;
  const me = l.members[jid];
  if (!me) {
    return m.reply(claraWrap("Chatib Lobby", "Kamu memang gak ada di lobby. Masuk: .chatiblobby [nama]"));
  }
  delete l.members[jid];
  db.save();
  const left = Object.keys(l.members).length;
  await dm(sock, jid, claraWrap("Chatib Lobby", reason || `Kamu keluar dari lobby. Kapan pun balik lagi: .chatiblobby`));
  for (const [otherJid] of Object.entries(l.members)) {
    await dm(sock, otherJid, claraWrap("Chatib Lobby", `${me.nick} keluar dari lobby. (${left} online)`));
  }
  return true;
}

// ── relay pesan lobby (hook non-command di handler.js) ──
export async function relayLobbyMessage(m, sock, db) {
  const l = getLobby(db);
  const me = l.members[m.sender];
  if (!me) return false;
  // relay CUMA buat DM bot (pesan di grup gak pernah di-broadcast)
  if (m.chat !== m.sender) return false;
  const now = Date.now();
  // media / bukan teks → tolak
  if (m.mtype && !TEXT_TYPES.has(m.mtype)) {
    const lastNotice = me._mediaNoticeAt || 0;
    if (now - lastNotice > 5000) {
      me._mediaNoticeAt = now;
      db.save();
      await m.reply(claraWrap("Chatib Lobby", "Media (foto/video/stiker/dll) gak bisa dikirim di lobby — cuma teks ya."));
    }
    return true;
  }
  const text = String(m.text || "").trim();
  if (!text) return true;
  // command (awalan prefix) → biarin dispatch command normal
  if (text.startsWith(".")) return false;
  // (aturan baru: link BOLEH — di-broadcast normal ke semua member)
  // flood guard
  if (now - (me.lastRelayAt || 0) < _floodMs) {
    const lastNotice = me._floodNoticeAt || 0;
    if (now - lastNotice > 3000) {
      me._floodNoticeAt = now;
      db.save();
      await m.reply(claraWrap("Chatib Lobby", "Pelan-pelan ya, jangan spam."));
    }
    return true;
  }
  // broadcast ke member lain (nomor TIDAK pernah ikut — cuma nick)
  me.lastRelayAt = now;
  me.lastActive = now;
  db.save();
  const body = claraWrap("Chatib Lobby", `${me.nick} 💬\n${text.slice(0, MAX_LEN)}`);
  let delivered = 0;
  for (const [otherJid] of Object.entries(l.members)) {
    if (otherJid === m.sender) continue;
    if (await dm(sock, otherJid, body)) delivered++;
  }
  return true;
}

// ── sweeper: idle auto-leave (dipanggil index.js schedulerInits) ──
export async function initChatibLobbySweeper(sock, intervalMs = 60 * 1000) {
  if (_sweeperInterval) clearInterval(_sweeperInterval);
  const sweep = async () => {
    try {
      const db = getDatabase();
      const l = getLobby(db);
      const now = Date.now();
      for (const [jid, rec] of Object.entries(l.members)) {
        if (now - (rec.lastActive || rec.joinedAt || 0) > _idleMs) {
          const fakeM = { sender: jid, reply: async () => {} };
          await leaveLobby(fakeM, sock, db, { reason: "Kamu di-keluarkan otomatis: gak ada aktivitas selama 1 jam." });
        }
      }
    } catch { /* sabar */ }
  };
  _sweeperInterval = setInterval(sweep, intervalMs);
  return true;
}
