// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 rara-outfit-session.js — session sementara per-user buat .omnioutfitchanger
// 🔹 WhatsApp gak bisa attach banyak foto dalam 1 pesan (tiap foto = pesan
// 🔹 terpisah walau dikirim "sekaligus" dari galeri) — jadi kita kumpulin
// 🔹 foto-foto item (topi/baju/celana/sepatu) via state in-memory, TTL 5 menit.
// ═════════════════════════════════════════════

export const MAX_ITEMS = 4;
export const TTL_MS = 5 * 60 * 1000;

// key: sender jid → { personBuf: Buffer, items: Buffer[], createdAt: number }
const sessions = new Map();

function isExpired(sess) {
  return !sess || (Date.now() - sess.createdAt) > TTL_MS;
}

/** Ambil session aktif buat jid, null kalau gak ada / udah expired (auto-hapus). */
export function getSession(jid) {
  const sess = sessions.get(jid);
  if (isExpired(sess)) {
    if (sess) sessions.delete(jid);
    return null;
  }
  return sess;
}

/** Mulai session baru (nimpa session lama kalau ada). */
export function startSession(jid, personBuf) {
  const sess = { personBuf, items: [], createdAt: Date.now() };
  sessions.set(jid, sess);
  return sess;
}

/** Tambah 1 foto item ke session aktif. Return null kalau session gak ada/expired/penuh. */
export function addItem(jid, buf) {
  const sess = getSession(jid);
  if (!sess) return null;
  if (sess.items.length >= MAX_ITEMS) return { full: true, sess };
  sess.items.push(buf);
  return { full: sess.items.length >= MAX_ITEMS, sess };
}

/** Hapus session (dipanggil setelah proses selesai / dibatalkan). */
export function clearSession(jid) {
  sessions.delete(jid);
}

/** Buat testing: reset semua session. */
export function _resetAllSessionsForTest() {
  sessions.clear();
}
