// rara-saluran.js — SATU PINTU resolusi & kirim ke saluran (WhatsApp Channel/Newsletter)
// AKAR BUG 19 Sep 2026 (owner: "bot dimatiikan/diaktifkan notifnya gak sampai ke saluran
// rara official"): broadcastStatusChange bot.js cuma baca config.saluran.id yang
// placeholder "@newsletter" → saluran DI-SKIP SENYAP. ID numerik harus di-resolve
// dari LINK INVITE via sock.newsletterMetadata("invite", kode) — sekarang satu pintu di sini.
import config from "../../config.js";
import { logger } from "./rara-logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ═══════════════════════════════════════════════
// RESOLVE ID NEWSLETTER
// ═══════════════════════════════════════════════

// config.saluran.id sering placeholder (@newsletter) — owner cukup kasih LINK channel,
// ID numerik (120363xxx@newsletter) di-resolve sekali lalu di-cache.
const NEWSLETTER_JID_RE = /^\d+@newsletter$/;
const CHANNEL_LINK_RE = /^https:\/\/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/;

let _cachedNewsletterJid = null;

/**
 * Resolve JID newsletter dari config (id numerik langsung, kalau placeholder
 * maka resolve dari config.saluran.link via newsletterMetadata invite).
 * @returns {Promise<string>} JID numerik "120363xxx@newsletter" atau FALLBACK JID
 *          beneran kalau resolve gagal (jangan pernah balikin placeholder "@newsletter").
 */
export async function resolveNewsletterJid(sock) {
  const saluranId = config.saluran?.id || "";
  if (NEWSLETTER_JID_RE.test(saluranId)) return saluranId;
  if (_cachedNewsletterJid) return _cachedNewsletterJid;
  try {
    const link = config.saluran?.link || "";
    const m = CHANNEL_LINK_RE.exec(link);
    if (m && typeof sock?.newsletterMetadata === "function") {
      const meta = await sock.newsletterMetadata("invite", m[1]);
      if (meta?.id && NEWSLETTER_JID_RE.test(meta.id)) {
        _cachedNewsletterJid = meta.id;
        logger.info?.("[rara-saluran] Saluran auto-resolve:", meta.id);
        return meta.id;
      }
    }
  } catch (e) {
    logger.error?.("[rara-saluran] Auto-resolve saluran gagal: " + (e?.message || e));
  }
  // FIX 6 Okt 2026: newsletterMetadata ('jid'|'invite') di baileys2 fork ini sering
  // balikin {} (GraphQL kosong) → resolve link GAGAL SENYAP. Fallback #2: tanya daftar
  // channel yang diikuti/dimiliki akun via newsletterFetchAllSubscribe() — ambil
  // channel pertama (channel official bot). Fallback lama (120363404849776664) udah
  // MATI — sendMessage "sukses" tapi post gak pernah muncul.
  try {
    if (typeof sock?.newsletterFetchAllSubscribe === "function") {
      const all = await sock.newsletterFetchAllSubscribe();
      const arr = Array.isArray(all) ? all : (all?.edges || all?.data || []);
      for (const x of arr) {
        const n = x?.node || x || {};
        const id = n?.id || n?.newsletterMetadata?.id || "";
        if (NEWSLETTER_JID_RE.test(id)) {
          _cachedNewsletterJid = id;
          logger.info?.("[rara-saluran] Saluran via fetchAllSubscribe:", id);
          return id;
        }
      }
    }
  } catch (e2) {
    logger.error?.("[rara-saluran] fetchAllSubscribe gagal: " + (e2?.message || e2));
  }
  // fallback terakhir sama dengan .ptvch (saluran Rara official default)
  return "120363404849776664@newsletter";
}

/**
 * NORMALIZE metadata saluran — dua bentuk harus di-support:
 * (1) FORK "rara" (itsmeeaizat-bailey, dipakai bot ini): newsletterMetadata()
 *     balikin hasil MENTAH WMex — { id, state:{type}, thread_metadata:{ name:{text},
 *     subscribers_count, verification, invite }, viewer_metadata:{ role, mute } }.
 *     BUG 19 Sep (owner: ".bot off notif gak nyampe saluran padahal config bener"):
 *     cek lama baca meta.viewer_role → UNDEFINED di bentuk mentah → bot admin
 *     sekalipun dianggap "bukan-admin" → saluran di-skip senyap.
 * (2) Baileys klasik: bentuk flat { id, name, subscribers, verification, viewer_role }.
 * @returns {{ id, name, description, followers, verification, state, role, invite }|null}
 */
export function normalizeNewsletterMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  if (!meta.id) return null; // tanpa id gak bisa identifikasi saluran sama sekali
  const tm = meta.thread_metadata || {};
  const role =
    meta.viewer_role || // bentuk flat
    meta.viewer_metadata?.role || // bentuk mentah fork "rara"
    (typeof meta.role === "string" ? meta.role : null);
  return {
    id: meta.id || null,
    name: meta.name || tm.name?.text || tm.name || null,
    description: meta.description || tm.description?.text || tm.description || null,
    followers: meta.subscribers != null
      ? Number(meta.subscribers)
      : (tm.subscribers_count != null ? Number(tm.subscribers_count) : null),
    verification: meta.verification || tm.verification || null,
    state: meta.state?.type || meta.state || null,
    role,
    invite: meta.invite || tm.invite || null,
  };
}

/** reset cache (buat test / ganti saluran) */
export function _resetSaluranCacheForTest() {
  _cachedNewsletterJid = null;
}

/**
 * Cek channel utama + apakah bot boleh posting (admin/owner di saluran).
 * @returns {Promise<{ok:boolean, jid:string, reason:string, meta:object|null}>}
 *   reason: "ok" | "bukan-admin"
 */
export async function getSaluranChannel(sock) {
  const jid = await resolveNewsletterJid(sock);
  let meta = null;
  try {
    if (typeof sock?.newsletterMetadata === "function") {
      meta = await sock.newsletterMetadata("jid", jid).catch(() => null);
    }
  } catch {}
  const n = normalizeNewsletterMeta(meta);
  // metadata gak kebaca → tetap coba kirim (beberapa versi fork gak isi role)
  if (!n) return { ok: true, jid, reason: "ok", meta: null };
  if (n.role === "ADMIN" || n.role === "OWNER" || n.role == null) {
    // role null (beberapa versi fork gak ngisi viewer_metadata) → TETAP coba
    // kirim — jangan over-block (pelajaran bug viewer_role undefined)
    return { ok: true, jid, reason: "ok", meta: n };
  }
  // reason SPESIFIK biar owner langsung tau kenapa (dulu senyap):
  // GUEST = bot belum follow saluran, SUBSCRIBER = follow tapi bukan admin
  const reason = n.role === "GUEST"
    ? "bot-belum-follow-saluran"
    : "bot-bukan-admin";
  return { ok: false, jid, reason, meta: n };
}

// ═══════════════════════════════════════════════
// PERSIST KE FILE CONFIG (bot-identity.js — BUKAN config.js!)
// ═══════════════════════════════════════════════

let _configPathForTest = null;

/**
 * Persist saluran config (id/link/name) ke src/lib/config/bot-identity.js
 * + update runtime config.saluran.
 * AKAR BUG LAMA: setsaluran.js dulunya nulis ke config.js — padahal objek saluran
 * ada di bot-identity.js (config.js cuma import reference) → regex gak pernah
 * match → writeFileSync "sukses" tapi file gak berubah → ID hilang pas restart.
 */
export function persistSaluranConfig({ id, link, name } = {}) {
  const file = _configPathForTest ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), "config", "bot-identity.js");
  let content = fs.readFileSync(file, "utf8");

  // blok saluran di bot-identity.js — bukan file config.js!
  // hati-hati "name:" ada di banyak objek → operasi di-dalem blok saluran doang
  const saluranBlockRe = /(\n\s*saluran:\s*\{[\s\S]*?\n\s*\},?)/;
  const blockMatch = saluranBlockRe.exec(content);
  if (!blockMatch) throw new Error("blok saluran gak ketemu di " + file);

  let block = blockMatch[1];
  if (id) block = block.replace(/(id:\s*["'])[^"']*?(["'])/, (mm, a, b) => a + id + b);
  if (link) block = block.replace(/(link:\s*["'])[^"']*?(["'])/, (mm, a, b) => a + link + b);
  if (name) block = block.replace(/(name:\s*["'])[^"']*?(["'])/, (mm, a, b) => a + name + b);

  content = content.replace(blockMatch[1], block);
  fs.writeFileSync(file, content);

  // update runtime juga — biar gak perlu restart
  config.saluran = config.saluran || {};
  if (id) config.saluran.id = id;
  if (link) config.saluran.link = link;
  if (name) config.saluran.name = name;
  _cachedNewsletterJid = null; // flush cache biar resolve baru kepake
  return true;
}

/** seam path persist (test aja) */
export function _setSaluranConfigPathForTest(p) {
  _configPathForTest = p;
}
