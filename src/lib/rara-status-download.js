// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Auto Download Status — status/story kontak otomatis diteruskan ke DM owner
// (fitur langka bot MD luar sana yang belum ada di RARA).
// Dipanggil dari jalur status@broadcast connection.js — non-blocking.
// Toggle: .swsave on/off (owner). Dedupe per id status biar gak dobel.
import { getDatabase } from "./rara-database.js";

const MAX_SEEN = 1000;
let _seenIds = new Set();
let _httpForward = undefined; // seam e2e: undefined = asli, null = DISABLED, fn = mock

export function _setStatusForwardForTest(fn) {
  _httpForward = fn;
}

function loadSeen() {
  try {
    const db = getDatabase();
    const arr = db.setting("statusDownloadSeen") || [];
    if (Array.isArray(arr)) _seenIds = new Set(arr.slice(-MAX_SEEN));
  } catch {}
}

function saveSeen() {
  try {
    const db = getDatabase();
    const arr = [..._seenIds].slice(-MAX_SEEN);
    db.setting("statusDownloadSeen", arr);
  } catch {}
}

function isMediaStatus(msg) {
  const c = msg?.message || {};
  return !!(c.imageMessage || c.videoMessage || c.audioMessage || c.stickerMessage);
}

/**
 * Teruskan status ke DM owner kalau fitur aktif.
 * @returns {boolean} true kalau diteruskan
 */
export async function maybeForwardStatus(sock, msg, ownerJid) {
  if (!sock?.sendMessage || !msg?.key?.id) return false;
  const doSend = _httpForward === null ? null : _httpForward || ((s, jid, payload) => s.sendMessage(jid, payload));
  if (!doSend) return false;
  let cfgEnabled = false;
  try {
    const db = getDatabase();
    const s = db.setting("autoStatusDownload") || {};
    cfgEnabled = !!s.enabled;
  } catch {
    return false;
  }
  if (!cfgEnabled || !ownerJid) return false;

  loadSeen();
  const statusKey = `${msg.key.participant || ""}:${msg.key.id}`;
  if (_seenIds.has(statusKey)) return false;
  _seenIds.add(statusKey);
  saveSeen();

  const sender = (msg.key.participant || "").split("@")[0] || "unknown";
  const jenis = isMediaStatus(msg)
    ? "📥 Status media"
    : "💬 Status teks";
  try {
    await doSend(sock, ownerJid, {
      forward: msg,
    });
    await doSend(sock, ownerJid, {
      text: `${jenis} dari @${sender}`,
      mentions: [msg.key.participant].filter(Boolean),
    });
    return true;
  } catch {
    return false;
  }
}
