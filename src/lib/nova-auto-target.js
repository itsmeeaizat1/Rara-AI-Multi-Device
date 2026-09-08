// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-target.js — Sistem target terpusat untuk SEMUA fitur otomasi
// (request owner 8 Sep 2026: "semua fitur switch biar gampang dikustomisasi,
// tambah opsi set — mau mode dm atau pc, terus ada pilihan target: grup
// tertentu / semua grup / DM nomor tertentu / semua DM user yang mendaftar").
//
// Disimpan di db.setting("autoTarget") = {
//   [featureKey]: {
//     mode: "semua" | "grup" | "dm" | "semua-dm" (grup+DM sekaligus),
//     groups: ["...@g.us"],       // mode grup: grup terpilih
//     dm: "62812..." | "all"      // mode dm: nomor tertentu / semua user terdaftar
//   }
// }
//
// Dikonsumsi scheduler lewat resolveAutoTargets(sock, featureKey):
//   - mode "semua" / belum diset → semua grup yang bot ikuti (perilaku lama)
//   - mode "grup"  → hanya grup terpilih
//   - mode "dm"    → DM nomor tertentu, atau "all" = semua DM user terdaftar

import { getDatabase } from "./nova-database.js";

const SETTING_KEY = "autoTarget";

// ═══════════════ CONFIG CRUD ═══════════════

export function getAutoTargetConfig(featureKey) {
  try {
    const db = getDatabase();
    const all = db.setting(SETTING_KEY) || {};
    return all[featureKey] || null;
  } catch {
    return null;
  }
}

export function setAutoTargetConfig(featureKey, cfg) {
  const db = getDatabase();
  const all = db.setting(SETTING_KEY) || {};
  all[featureKey] = cfg;
  db.setting(SETTING_KEY, all);
  db.save();
  return all[featureKey];
}

export function clearAutoTargetConfig(featureKey) {
  const db = getDatabase();
  const all = db.setting(SETTING_KEY) || {};
  delete all[featureKey];
  db.setting(SETTING_KEY, all);
  db.save();
}

// Deskripsi singkat config (buat menu/status)
export function describeAutoTarget(cfg) {
  if (!cfg || !cfg.mode) return "Semua grup (default)";
  if (cfg.mode === "grup") {
    const n = (cfg.groups || []).length;
    return n ? `${n} grup terpilih` : "Grup terpilih (kosong — fallback semua grup)";
  }
  if (cfg.mode === "dm") {
    if (cfg.dm === "all") return "Semua DM user terdaftar";
    return `DM ${cfg.dm}`;
  }
  if (cfg.mode === "semua-dm") return "Semua grup + semua DM user terdaftar";
  return "Semua grup";
}

// ═══════════════ DAFTAR GRUP & USER ═══════════════

// Daftar semua grup yang bot ikuti — sort by subject biar nomor pilihan stabil
export async function listBotGroups(sock) {
  try {
    const res = await sock.groupFetchAllParticipating();
    return Object.values(res || {})
      .map((g) => ({ jid: g.id, subject: g.subject || g.id }))
      .sort((a, b) => String(a.subject).localeCompare(String(b.subject)));
  } catch {
    return [];
  }
}

// Semua DM user yang sudah mendaftar bot (db users)
export function getAllRegisteredDms() {
  try {
    const db = getDatabase();
    return Object.keys(db.data?.users || {}).filter((j) => String(j).endsWith("@s.whatsapp.net"));
  } catch {
    return [];
  }
}

// ═══════════════ PARSER PILIHAN ═══════════════

// "1,3,5" (nomor sesuai listBotGroups urut) → daftar JID
export function parseGroupPicks(arg, groupList) {
  const picks = String(arg || "")
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= groupList.length);
  const seen = new Set();
  const jids = [];
  for (const n of picks) {
    const g = groupList[n - 1];
    if (g && !seen.has(g.jid)) {
      seen.add(g.jid);
      jids.push(g.jid);
    }
  }
  return jids;
}

// Normalisasi nomor HP Indonesia → JID WhatsApp
export function toWaJid(nomor) {
  let n = String(nomor || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("0")) n = "62" + n.slice(1); // 0812... → 62812...
  return n + "@s.whatsapp.net";
}

// ═══════════════ RESOLVER (dipakai scheduler) ═══════════════

// Resolve daftar JID tujuan untuk sebuah fitur.
// Return: { jids: [], mode, desc, isGroup } — isGroup true kalau target grup
// (scheduler bisa skip aksi khusus-grup seperti tutup grup saat mode dm).
export async function resolveAutoTargets(sock, featureKey) {
  const cfg = getAutoTargetConfig(featureKey);

  // Belum dikustomisasi → perilaku lama: semua grup
  if (!cfg || !cfg.mode || cfg.mode === "semua") {
    const groups = await listBotGroups(sock);
    return { jids: groups.map((g) => g.jid), mode: "semua", desc: "Semua grup", isGroup: true, cfg: null };
  }

  // Grup tertentu
  if (cfg.mode === "grup") {
    const groups = (cfg.groups || []).filter(Boolean);
    if (!groups.length) {
      const all = await listBotGroups(sock);
      return { jids: all.map((g) => g.jid), mode: "semua", desc: "Semua grup (fallback — grup terpilih kosong)", isGroup: true, cfg };
    }
    return { jids: groups, mode: "grup", desc: `${groups.length} grup terpilih`, isGroup: true, cfg };
  }

  // DM — nomor tertentu atau semua user terdaftar
  if (cfg.mode === "dm") {
    if (cfg.dm === "all") {
      const dms = getAllRegisteredDms();
      return { jids: dms, mode: "dm", desc: `Semua DM user terdaftar (${dms.length})`, isGroup: false, cfg };
    }
    const jid = toWaJid(cfg.dm);
    return { jids: jid ? [jid] : [], mode: "dm", desc: `DM ${cfg.dm}`, isGroup: false, cfg };
  }

  // Semua grup + semua DM user terdaftar (request owner 8 Sep 2026:
  // "ada pilihan semua dm dan smua grup dikirim")
  if (cfg.mode === "semua-dm") {
    const groups = await listBotGroups(sock);
    const dms = getAllRegisteredDms();
    return { jids: [...groups.map((g) => g.jid), ...dms], mode: "semua-dm", desc: `Semua grup (${groups.length}) + semua DM user (${dms.length})`, isGroup: true, cfg };
  }

  // mode tak dikenal → default semua grup
  const all = await listBotGroups(sock);
  return { jids: all.map((g) => g.jid), mode: "semua", desc: "Semua grup", isGroup: true, cfg: null };
}

// ── Helper wiring fitur otomatis (request owner 8 Sep 2026:
//    "semua fitur yg otomatis ada opsi kirim terpusatnya ini wajib") ──

/**
 * OVERRIDE — fitur dengan default sendiri (owner/subscriber/grup sendiri):
 * autoTarget BELUM diset → defaultJids (perilaku lama).
 * autoTarget diset → target terpusat nggantuin default.
 */
export async function resolveAutoTargetsOr(sock, featureKey, defaultJids = []) {
  const cfg = getAutoTargetConfig(featureKey);
  if (!cfg || !cfg.mode) return defaultJids;
  const r = await resolveAutoTargets(sock, featureKey);
  return (r.jids && r.jids.length) ? r.jids : defaultJids;
}

/**
 * UNION — fitur subscriber/langganan (anime, bencana, winbu):
 * subscriber TETAP dapat notif (opt-in gak dicabut), autoTarget
 * NAMBAH jangkauan (grup/DM pilihan owner ikut dapat, dedup jid).
 */
export async function mergeAutoTargets(sock, featureKey, baseJids = []) {
  const cfg = getAutoTargetConfig(featureKey);
  if (!cfg || !cfg.mode) return baseJids || [];
  const r = await resolveAutoTargets(sock, featureKey);
  const merged = [...new Set([...(baseJids || []), ...(r.jids || [])])];
  return merged;
}
