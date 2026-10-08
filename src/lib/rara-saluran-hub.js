// rara-saluran-hub.js — SALURAN HUB (fitur no.1 "bot masa depan", 25 Sep 2026)
// Paket komplit integrasi Saluran (WhatsApp Channel) — tiga modul satu engine:
//   (1) AUTOPOST  — konten harian AI-generated dikirim ke saluran utama tiap
//                   hari pada jam tertentu (dedupe lastDate, claim sebelum kirim)
//   (2) INBOUND   — auto-react emoji + auto-reply keyword atas post di saluran
//                   (cooldown + cap harian biar saluran gak jadi spam diri sendiri)
//   (3) ANALITIK  — snapshot follower tiap 30 mnt (dedupe), growth harian/mingguan/
//                   bulanan, sparkline, milestone tiap 500 follower → notif.
// NYAMBAT KE ENGINE LAMA (JANGAN duplikasi logika): resolveNewsletterJid +
// getSaluranChannel + normalizeNewsletterMeta dari rara-saluran.js, sanitasi
// kirim dari rara-saluran-safe.js (sendSaluranSafe).
// STATE: db.data.channelhub — persist tahan restart; scheduler idempotent.

import { getDatabase } from "./rara-database.js";
import {
  resolveNewsletterJid, getSaluranChannel, normalizeNewsletterMeta,
} from "./rara-saluran.js";
import { sendSaluranSafe, isSaluranJid } from "./rara-saluran-safe.js";
import { callAI } from "./rara-ai-service.js";
import { boxLeft } from "./styler.js";
import { raraBox } from "./rara-menu-style.js";
import { notifBanner } from "./rara-notif-card.js";
import { logger } from "./rara-logger.js";
import config from "../../config.js";

// ═══════════════════════════════════════════════
// KONSTANTA
// ═══════════════════════════════════════════════
const SNAPSHOT_MIN_MS = 30 * 60_000; // max 1 snapshot per 30 mnt
const SNAPSHOTS_CAP = 500;            // ~10 hari data per 30 mnt
const MILESTONE_STEP = 500;           // notif tiap kelipatan 500 follower
const DEFAULT_TOPIC = "tips teknologi, WhatsApp, dan fitur bot yang berguna";

// ═══════════════════════════════════════════════
// SEAMS (buat e2e — jangan sentuh AI/jam live dari test)
// ═══════════════════════════════════════════════
let _nowFn = null;
let _aiFn = null;

/** Override fungsi waktu (ms epoch). e2e: kontrol jam dedupe tanpa nunggu nyata. */
export function _setSaluranHubNowForTest(fn) { _nowFn = fn; }
/** Override fungsi generate konten AI. */
export function _setSaluranHubAIForTest(fn) { _aiFn = fn; }
export function _resetSaluranHubSeamsForTest() { _nowFn = null; _aiFn = null; }

const nowMs = () => (_nowFn ? _nowFn() : Date.now());
// WIB = UTC+7 (jam kartu & dedupe harian pakai WIB, bukan jam server)
function wibDate(ms) { return new Date(ms + 7 * 3600_000); }
function todayStr() { return wibDate(nowMs()).toISOString().slice(0, 10); }
function jamHHMM() { return wibDate(nowMs()).toISOString().slice(11, 16); }

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

/**
 * Pastikan db.data.channelhub + semua sub-blok ada (merge defaults —
 * schema lama yang belum punya field baru gak bikin TypeError).
 */
export function ensureHubState(db) {
  const d = db.data;
  if (!d.channelhub || typeof d.channelhub !== "object") d.channelhub = {};
  const s = d.channelhub;
  if (!s.autopost || typeof s.autopost !== "object") {
    s.autopost = { on: false, jam: "08:00", topic: DEFAULT_TOPIC, lastDate: "", lastSent: 0, lastError: "" };
  }
  if (!s.react || typeof s.react !== "object") {
    s.react = { on: false, emojis: ["❤️", "🔥", "👏", "💡"], cooldownMin: 3, lastReactAt: 0, day: "", count: 0, capDay: 30 };
  }
  if (!s.reply || typeof s.reply !== "object") {
    s.reply = { on: false, rules: [], cooldownMin: 5, lastReplyAt: 0, day: "", count: 0, capDay: 20 };
  }
  if (!s.stats || typeof s.stats !== "object") {
    s.stats = { snapshots: [], lastMilestone: 0 };
  }
  if (!Array.isArray(s.reply.rules)) s.reply.rules = [];
  if (!Array.isArray(s.stats.snapshots)) s.stats.snapshots = [];
  return s;
}

/** validasi jam format HH:MM (buat .channelhub autopost on 08:00) */
export function parseJamSaluran(v) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(v || "").trim());
  if (!m) return null;
  return String(m[1]).padStart(2, "0") + ":" + m[2];
}

// ═══════════════════════════════════════════════
// (3) ANALITIK — snapshot, growth, milestone, kartu stat
// ═══════════════════════════════════════════════

/**
 * Ambil follower count saluran utama → snapshot baru (dedupe 30 mnt).
 * @returns {Promise<{skipped?:boolean, count?:number, error?:string, milestone?:object|null}>}
 */
export async function snapshotFollowers(sock, opts = {}) {
  const db = getDatabase();
  const s = ensureHubState(db);
  const snaps = s.stats.snapshots;
  const now = nowMs();
  if (!opts.force && snaps.length && now - snaps[snaps.length - 1].ts < SNAPSHOT_MIN_MS) {
    return { skipped: true, count: snaps[snaps.length - 1].count };
  }
  // baca followers via satu pintu getSaluranChannel (metadata mentah/flat dua-duanya ke-normalize)
  const ch = await getSaluranChannel(sock);
  let count = ch.meta?.followers ?? null;
  if (count == null) {
    try {
      const meta = await sock.newsletterMetadata("jid", ch.jid);
      count = normalizeNewsletterMeta(meta)?.followers ?? null;
    } catch { /* metadata kedua gagal → count tetap null */ }
  }
  if (count == null || !Number.isFinite(Number(count))) {
    return { error: "metadata followers gak kebaca" }; // jujur: jangan bikin snapshot 0
  }
  count = Number(count);
  snaps.push({ ts: now, count });
  if (snaps.length > SNAPSHOTS_CAP) s.stats.snapshots = snaps.slice(-SNAPSHOTS_CAP);
  db.save?.();
  const milestone = checkMilestone(s, count);
  if (milestone) db.save?.();
  return { count, milestone };
}

/** cek kelipatan 500 follower baru (lastMilestone = langkah terakhir yang udah dinotif) */
export function checkMilestone(s, count) {
  const step = Math.floor(count / MILESTONE_STEP);
  if (!step || (s.stats.lastMilestone || 0) >= step) return null;
  s.stats.lastMilestone = step;
  return { followers: step * MILESTONE_STEP };
}

/** nilai snapshot TERAKHIR pada/sebelum timestamp t (untuk delta) */
function countAt(snaps, t) {
  let v = null;
  for (const x of snaps) if (x.ts <= t) v = x.count;
  return v;
}

const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
export function sparkline(nums) {
  const a = (nums || []).filter((n) => Number.isFinite(n));
  if (!a.length) return "—";
  const min = Math.min(...a);
  const max = Math.max(...a);
  const span = max - min;
  return a.map((n) => SPARK[span ? Math.round(((n - min) / span) * (SPARK.length - 1)) : 0]).join("");
}

/**
 * Kartu stat saluran (standar: boxLeft + emoji 🕒 buat live/stat ticker).
 * @returns {string}
 */
export function buildStatCard(s, name) {
  const snaps = s.stats?.snapshots || [];
  const now = nowMs();
  const cur = snaps.length ? snaps[snaps.length - 1].count : null;
  const at = (ms) => countAt(snaps, now - ms);
  const delta = (ms) => {
    const b = at(ms);
    return cur == null || b == null ? null : cur - b;
  };
  const fmt = (d) => (d == null ? "—" : (d >= 0 ? "+" : "") + d);
  const graph = sparkline(snaps.slice(-14).map((x) => x.count));
  const ms = s.stats?.lastMilestone
    ? (s.stats.lastMilestone * MILESTONE_STEP).toLocaleString("id-ID") + " ✓"
    : "belum ada";
  return boxLeft("Saluran Stat 🕒", [
    (name ? name + " · " : "") + "follower: " + (cur == null ? "belum ada data" : cur.toLocaleString("id-ID")),
    "harian: " + fmt(delta(24 * 3600_000)) + " · mingguan: " + fmt(delta(7 * 24 * 3600_000)) + " · bulanan: " + fmt(delta(30 * 24 * 3600_000)),
    "grafik: " + graph,
    "milestone terakhir: " + ms,
    "_update otomatis tiap 30 menit · atur: .channelhub_",
  ].join("\n"));
}

/** kirim notif milestone → post ke saluran + DM owner (jujur kalau gagal) */
export async function notifyMilestone(sock, followers) {
  const ch = await getSaluranChannel(sock).catch(() => null);
  let saluranOk = false;
  if (ch?.ok) {
    try {
      await sendSaluranSafe(sock, ch.jid, {
        text: "🎉 " + followers.toLocaleString("id-ID") + " followers!\nTerima kasih sudah ikut saluran ini ♡",
      });
      saluranOk = true;
    } catch (e) {
      logger.error?.("[channelhub] notif milestone ke saluran gagal: " + (e?.message || e));
    }
  }
  let dmOk = false;
  const nums = config.owner?.number || [];
  for (const n of nums) {
    try {
      await sock.sendMessage(n + "@s.whatsapp.net", {
        text: "🕒 Milestone saluran: " + followers.toLocaleString("id-ID") + " followers tercapai" + (saluranOk ? "" : " (gagal post ke saluran)"),
      });
      dmOk = true;
    } catch (e) {
      logger.error?.("[channelhub] DM milestone gagal: " + (e?.message || e));
    }
  }
  return { saluranOk, dmOk };
}

// ═══════════════════════════════════════════════
// (1) AUTOPOST — konten harian AI-generated
// ═══════════════════════════════════════════════

// ── kartu postingan autopost desain modern 3 Okt (ala menu) ──
// REDESIGN 5 Okt 2026 (owner: tampilan konten auto broadcast ke saluran
// biar bagus & modern seperti desain sekarang) — konten AI dibungkus
// header 「 ✦ RARA AI OFFICIAL ✦ 」 + footer credit watermark, persis
// jenis kartu menu/reply bot. Konten AI utuh di dalam (gak dipotong).
const POST_CREDIT = "Powered by Rara AI - Multi Device";
export function buildChannelPostCard(content) {
  const body = String(content || "").trim();
  if (!body) return body;
  const boxed = raraBox("RARA AI OFFICIAL", [body]);
  const parts = boxed.split("\n");
  parts[0] = `「 ✦ RARA AI OFFICIAL ✦ 」`; // desain saluran FINAL — header lama
  return parts.join("\n") + "\n\n" + POST_CREDIT;
}

/**
 * Generate konten postingan harian via AI. THROW kalau AI jawab kosong —
 * jawaban kosong ≠ sukses (pelajaran ConciseAI: HTTP 200 body []).
 */
export async function buildDailyContent(topic) {
  const t = String(topic || DEFAULT_TOPIC).slice(0, 200);
  const prompt =
    "Kamu admin saluran (channel) WhatsApp resmi bot Rara AI. " +
    "Buat SATU postingan singkat untuk follower saluran hari ini, Bahasa Indonesia santai tapi sopan. " +
    "Niche saluran: " + t + ". " +
    "Format: baris pertama judul menarik tanpa markdown, lalu 2-4 baris isi bermakna " +
    "(satu tips konkret atau info singkat), ditutup satu baris ajakan ramah. " +
    "Maksimal 60 kata. Jangan pakai bold/asterisk/tanda # lebih dari 2.";
  const aiFn = _aiFn || callAI;
  const out = await aiFn(prompt);
  const text = String(
    typeof out === "string" ? out : out?.text || out?.result || out?.answer || ""
  ).trim();
  if (!text || text.length < 20) throw new Error("AI balikin konten kosong/terlalu pendek");
  return text.replace(/\*\*/g, "").slice(0, 900);
}

/**
 * Tick autopost harian. URUTAN AMAN (skill 5.2): build konten DULU (AI gagal →
 * gak claim, tick berikutnya masih nyoba hari yang sama), baru claim lastDate
 * (anti dobel post), baru kirim (gagal kirim → lastError jujur, hari itu lewat).
 */
export async function processAutopostTick(sock, opts = {}) {
  const db = getDatabase();
  const s = ensureHubState(db);
  const a = s.autopost;
  if (!a.on) return { sent: 0, off: true };
  const hari = todayStr();
  if (a.lastDate === hari) return { sent: 0, done: true };
  if (jamHHMM() < String(a.jam || "08:00")) return { sent: 0, wait: true };
  let content;
  try {
    content = await buildDailyContent(a.topic);
  } catch (e) {
    a.lastError = String(e?.message || e).slice(0, 120);
    db.save?.();
    return { sent: 0, error: a.lastError }; // TIDAK claim — dicoba lagi tick berikut
  }
  a.lastDate = hari; // CLAIM sebelum kirim
  if (opts.dryRun) { db.save?.(); return { sent: 1, dry: true }; }
  try {
    const ch = await getSaluranChannel(sock);
    if (!ch.ok) throw new Error(ch.reason);
    // desain modern: kartu + banner preview branding (gagal banner → kartu tetap kirim)
    const payload = { text: buildChannelPostCard(content) };
    try { payload.contextInfo = await notifBanner({ title: "Rara AI Official", thumbName: "autopost" }); } catch {}
    await sendSaluranSafe(sock, ch.jid, payload);
    a.lastSent = nowMs();
    a.lastError = "";
    db.save?.();
    return { sent: 1 };
  } catch (e) {
    a.lastError = String(e?.message || e).slice(0, 120);
    db.save?.();
    return { sent: 0, error: a.lastError };
  }
}

// ═══════════════════════════════════════════════
// (2) INBOUND — auto-react + auto-reply keyword
// ═══════════════════════════════════════════════

/**
 * Hook inbound buat pesan yang dateng dari SALURAN (m.isNewsletter).
 * Hanya saluran utama (config/resolve) — bukan saluran lain yang bot follow.
 * - auto-react: react post terbaru (bukan post fromMe bot sendiri — anti self-loop)
 * - auto-reply: keyword match di body → kirim balasan via sendSaluranSafe
 * Flood guard: cooldown per fitur + cap harian + reset counter pergantian hari.
 * @returns {Promise<{handled:boolean, react?:string, reply?:string, skip?:string}>}
 */
export async function inboundHandler(sock, m) {
  const db = getDatabase();
  const s = ensureHubState(db);
  const chat = m?.chat || m?.key?.remoteJid || "";
  if (!isSaluranJid(chat)) return { handled: false, skip: "bukan-saluran" };
  const mainJid = await resolveNewsletterJid(sock).catch(() => null);
  if (!mainJid || chat !== mainJid) return { handled: false, skip: "saluran-lain" };
  if (m.fromMe) return { handled: false, skip: "post-bot-sendiri" };

  const now = nowMs();
  const body = String(m.body || m.text || "").trim();
  const out = { handled: false };

  // ── AUTO-REACT ──
  const r = s.react;
  if (r.on) {
    const day = todayStr();
    if (r.day !== day) { r.day = day; r.count = 0; }
    const cooldownMs = Math.max(1, Number(r.cooldownMin) || 3) * 60_000;
    if (now - (r.lastReactAt || 0) >= cooldownMs && r.count < (r.capDay || 30)) {
      const emojis = (Array.isArray(r.emojis) && r.emojis.length ? r.emojis : ["❤️"]);
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      try {
        await sock.sendMessage(chat, { react: { key: m.key, text: emoji } });
        r.lastReactAt = now;
        r.count++;
        out.handled = true;
        out.react = emoji;
      } catch (e) {
        logger.error?.("[channelhub] react gagal: " + (e?.message || e));
      }
    }
  }

  // ── AUTO-REPLY KEYWORD ──
  const rp = s.reply;
  if (rp.on && body) {
    const day = todayStr();
    if (rp.day !== day) { rp.day = day; rp.count = 0; }
    const lower = body.toLowerCase();
    const rule = (rp.rules || []).find(
      (x) => x && typeof x.key === "string" && x.key && lower.includes(x.key.toLowerCase())
    );
    if (rule) {
      const cooldownMs = Math.max(1, Number(rp.cooldownMin) || 5) * 60_000;
      if (now - (rp.lastReplyAt || 0) >= cooldownMs && rp.count < (rp.capDay || 20)) {
        try {
          const ch = await getSaluranChannel(sock);
          if (!ch.ok) throw new Error(ch.reason);
          await sendSaluranSafe(sock, ch.jid, { text: rule.text });
          rp.lastReplyAt = now;
          rp.count++;
          rule.hits = (rule.hits || 0) + 1;
          out.handled = true;
          out.reply = rule.key;
        } catch (e) {
          logger.error?.("[channelhub] reply gagal: " + (e?.message || e));
        }
      }
    }
  }

  if (out.handled) db.save?.();
  return out;
}

// ═══════════════════════════════════════════════
// HEALTH CHECK — seksi SALURAN WA buat boot doctor (finalisasi 25 Sep)
// Satu pintu cek SEMUA modul saluran: resolve channel, autopost, react,
// reply, autobroadcast event. Format satu-info-per-baris (aturan boot
// doctor 20 Sep). THROW kalau gak bisa dicek — caller nanggepin jujur.
// ═══════════════════════════════════════════════
export async function buildSaluranHealthLines(sock) {
  const db = getDatabase();
  const s = ensureHubState(db);
  const lines = [];

  // resolve saluran utama (nama + follower) — gak nyuruh db, nyuruh WA
  const ch = await getSaluranChannel(sock);
  if (ch.ok) {
    const f = ch.meta?.followers;
    lines.push("Saluran: " + (ch.meta?.name || config.saluran?.name || ch.jid) + " ✓" +
      (Number.isFinite(Number(f)) ? " (" + Number(f).toLocaleString("id-ID") + " follower)" : ""));
  } else {
    lines.push("Saluran: ⚠ " + (ch.reason || "gak bisa resolve") + " — cek .channelid cek");
  }

  const a = s.autopost, r = s.react, rp = s.reply;
  lines.push("Autopost: " + (a.on ? "ON " + (a.jam || "08:00") + " WIB" : "off") +
    " · topic: " + (a.topic || "default"));
  if (a.lastError) lines.push("Autopost error terakhir: " + a.lastError);
  lines.push("Auto-react: " + (r.on ? "ON · " + (r.emojis || []).join("") : "off") +
    " · cooldown " + (r.cooldownMin || 3) + " mnt");
  lines.push("Auto-reply: " + (rp.on ? "ON · " + (rp.rules || []).length + " rules" : "off"));

  // autobroadcast event (rara-saluran-broadcast.js — state db.setting saluranNotify_*)
  let onCount = 0, total = 0;
  try {
    const { NOTIFY_EVENTS } = await import("./rara-saluran-broadcast.js");
    total = Object.keys(NOTIFY_EVENTS).length;
    for (const k of Object.keys(NOTIFY_EVENTS)) {
      if (db.setting("saluranNotify_" + k) === true) onCount++;
    }
  } catch { /* broadcast lib gak kebaca → tampil jujur tanpa angka event */ }
  lines.push("Autobroadcast: " + onCount + "/" + total + " event ON");

  const snaps = s.stats?.snapshots || [];
  if (snaps.length) {
    lines.push("Analitik: " + snaps.length + " snapshot · follower terakhir " + snaps[snaps.length - 1].count.toLocaleString("id-ID"));
  }
  return lines;
}

// ═══════════════════════════════════════════════
// SCHEDULER (idempotent — skill 5.4)
// ═══════════════════════════════════════════════
let _timer = null;

/** satu tick penuh: autopost harian + snapshot follower (+ milestone notif) */
export async function processSaluranHubTick(sock, opts = {}) {
  const autopost = await processAutopostTick(sock, opts);
  let snapshot;
  try {
    snapshot = await snapshotFollowers(sock, opts);
  } catch (e) {
    snapshot = { error: String(e?.message || e) };
  }
  if (snapshot?.milestone) {
    await notifyMilestone(sock, snapshot.milestone.followers).catch(() => {});
  }
  return { autopost, snapshot };
}

export function initSaluranHubScheduler(sock) {
  if (_timer) return _timer;
  _timer = setInterval(async () => {
    try { await processSaluranHubTick(sock); } catch { /* tick gagal → tick berikutnya */ }
  }, 60_000);
  return _timer;
}

export function stopSaluranHubScheduler() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
