// NOVA GROUP REGISTRY — auto-catat semua grup yang bot ikuti ke database
// (request owner 13 Sep 2026: "Total Grup di Info Database gak pernah
// keitung / suka 0 — pdhal bot join grup, dan ke-reset tiap restart").
// AKAR: db.data.groups cuma keisi kalau ada yang SET fitur grup manual
// (antilink dkk) — gak ada yang otomatis nyatet grup yang bot ikuti.
import { getDatabase } from "./nova-database.js";

function safeDb(db = null) {
  if (db) return db;
  try { return getDatabase(); } catch { return null; }
}

/**
 * Catat grup ke db.data.groups kalau belum ada. Nyetor name + registeredAt
 * doang — fitur grup (antilink/welcome dkk) gak disentuh.
 * Balikin true kalau baru tercatat, false kalau udah ada / invalid.
 */
export function ensureGroupRegistered(jid, { name = "", db = null } = {}) {
  try {
    if (!jid || !String(jid).endsWith("@g.us")) return false;
    const d = safeDb(db);
    if (!d?.getGroup || !d?.setGroup) return false;
    if (d.getGroup(jid)) return false;
    d.setGroup(jid, { name: name || "Unknown Group", registeredAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync penuh: semua grup yang bot ikuti (groupFetchAllParticipating)
 * dicatat ke db. Dipanggil pas startup — jadi angka Total Grup gak
 * "reset ke 0" walau bot restart. Balikin { added, total }.
 */
export async function syncGroupRegistry(sock, db = null) {
  let added = 0;
  let total = 0;
  try {
    const all = await sock?.groupFetchAllParticipating?.();
    if (all && typeof all === "object") {
      for (const [jid, meta] of Object.entries(all)) {
        total++;
        if (ensureGroupRegistered(jid, { name: meta?.subject || "", db })) added++;
      }
    }
  } catch {}
  try {
    const d = safeDb(db);
    const registered = Object.keys(d?.getAllGroups?.() || {}).length;
    total = Math.max(total, registered);
  } catch {}
  return { added, total };
}

/**
 * Cari grup yang bot ikuti BERDASARKAN NAMA (request owner 21 Sep 2026:
 * "keluar dari grup cari teman sejati" dari DM — agent harus bisa nemuin
 * grupnya dari nama). Live fetch groupFetchAllParticipating duluan,
 * fallback registry db. Balikin {jid, subject} kalau unik,
 * {ambiguous: [nama...]} kalau banyak kandidat, null kalau gak ada.
 */
export async function resolveGroupByName(sock, name, db = null) {
  const n = String(name || "").toLowerCase().trim();
  if (!n) return null;
  let groups = [];
  try {
    const all = await sock?.groupFetchAllParticipating?.();
    for (const [jid, meta] of Object.entries(all || {})) {
      if (meta?.subject) groups.push({ jid, subject: String(meta.subject) });
    }
  } catch {}
  if (!groups.length) {
    try {
      const d = safeDb(db);
      for (const [jid, meta] of Object.entries(d?.getAllGroups?.() || {})) {
        if (meta?.name) groups.push({ jid, subject: String(meta.name) });
      }
    } catch {}
  }
  const exact = groups.filter((g) => g.subject.toLowerCase() === n);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return { ambiguous: exact.map((g) => g.subject) };
  const partial = groups.filter((g) => {
    const s = g.subject.toLowerCase();
    return (s.includes(n) || n.includes(s)) && s !== "";
  });
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) return { ambiguous: partial.map((g) => g.subject) };
  return null;
}

// cache hitung live — groupFetchAllParticipating itu network call ke
// server WA, jangan ditembak tiap buka menu (TTL 5 menit)
const TTL_MS = 5 * 60 * 1000;
const liveCache = (globalThis.__novaGroupLiveCache = globalThis.__novaGroupLiveCache || { ts: 0, count: 0 });

/** seam test: set/reset cache manual */
export function setLiveCacheForTest(ts, count) { liveCache.ts = ts; liveCache.count = count; }

/**
 * Hitung jumlah grup yang bot beneran ikuti SEKARANG:
 * (1) live fetch groupFetchAllParticipating (cache 5 menit) — kebenaran
 *     sebenarnya, gak bisa bohong walau registry db ketinggalan;
 * (2) fallback: jumlah grup tercatat di db (persist, selamat restart).
 */
export async function countGroupsLive(sock, db = null) {
  try {
    if (typeof sock?.groupFetchAllParticipating === "function") {
      if (liveCache.count > 0 && Date.now() - liveCache.ts < TTL_MS) {
        return liveCache.count;
      }
      const all = await sock.groupFetchAllParticipating();
      const n = Object.keys(all || {}).length;
      if (n > 0) {
        liveCache.ts = Date.now();
        liveCache.count = n;
        return n;
      }
    }
  } catch {}
  try {
    const d = safeDb(db);
    return Object.keys(d?.getAllGroups?.() || {}).length;
  } catch {
    return 0;
  }
}
