// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-berita-notifier.js — Auto Berita Notifier (request owner 12 Sep 2026:
// "buat fitur auto berita notifier misal dr cnn klo update brita baru dikirim
// sbagai plaintext dan thumbnail gambar brita").
//
// Sumber: RSS situs berita ASLI (cnn/tempo/cnbc/kompas — gratis, stabil,
// thumbnail ada di enclosure). Poll tiap intervalMin (default 10).
//
// FORMAT (request owner): PLAINTEXT + thumbnail gambar berita — teks pesan
// biasa (judul + snippet + link) dengan externalAdReply renderLargerThumbnail
// = foto berita kepake jadi banner card (pola anime notifier).
//
// Target: subscriber per-chat (.beritanotify on) TETAP dapat + target
// terpusat (.switch auto autoberitanotify set — mergeAutoTargets NAMBAH
// jangkauan). Dedup GUID (link) cap 200. Max 3 berita per siklus (anti spam).
// Aktivasi pertama → sample 1 berita terbaru langsung nge-flow (ala anime).

import Parser from "rss-parser";
import { getDatabase } from "./nova-database.js";
import { mergeAutoTargets, describeAutoTarget, getAutoTargetConfig } from "./nova-auto-target.js";

const STATE_KEY = "beritaNotifier";
const DEFAULT_INTERVAL = 10; // menit
const MAX_PER_CHECK = 3;
const SEEN_CAP = 200;

// ── Sumber RSS (feed asli, bukan API perantara) ────────────────
// FIX v24.2.3 — sumber `kompas` MATI: www.kompas.com/rss dibalas Cloudflare
// (HTTP 202, body 0 byte) dan semua varian feed-nya (rss.kompas.com, /feed,
// /rss/nasional) gagal parse/404. Akibatnya kalau sumber diset ke kompas,
// berita TIDAK PERNAH masuk. Diganti Antara News (verified live: 50 item +
// thumbnail di enclosure).
export const SOURCES = {
  cnn: { label: "CNN Indonesia", feed: "https://www.cnnindonesia.com/rss" },
  tempo: { label: "Tempo", feed: "https://rss.tempo.co" },
  cnbc: { label: "CNBC Indonesia", feed: "https://www.cnbcindonesia.com/rss" },
  antara: { label: "Antara News", feed: "https://www.antaranews.com/rss/terkini.xml" },
};
// Key lama yang sudah mati → diarahkan ke penggantinya (biar setting lama
// "kompas" gak bikin notifier gagal total).
export const SOURCE_ALIAS = { kompas: "antara" };

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  timeout: 15000,
});

// ── State persist ─────────────────────────────────────────────
export function loadState() {
  try {
    const db = getDatabase();
    const st = db.setting(STATE_KEY) || {};
    return {
      enabled: false,
      intervalMin: DEFAULT_INTERVAL,
      source: "cnn",
      subscribers: [],
      seen: [],
      lastCheck: 0,
      lastSent: 0,
      ...st,
      // FIX v24.2.3 — HARUS di SETELAH ...st (kalau di atas, nilai st menimpa).
      // Sumber lama yang mati/tak dikenal (mis. "kompas") → aman ke pengganti/
      // cnn, biar fetchFeed gak throw tiap siklus.
      source: SOURCE_ALIAS[st.source] || (SOURCES[st.source] ? st.source : "cnn"),
    };
  } catch {
    return { enabled: false, intervalMin: DEFAULT_INTERVAL, source: "cnn", subscribers: [], seen: [], lastCheck: 0, lastSent: 0 };
  }
}

export function saveState(st) {
  getDatabase().setting(STATE_KEY, st);
}

// ── Sock & scheduler ─────────────────────────────────────────
let sock = null;
export function setSock(s) { sock = s; syncMonitor(); }

let monitor = null;
export function syncMonitor() {
  const st = loadState();
  if (st.enabled && !monitor) {
    const ms = Math.max(5, st.intervalMin) * 60 * 1000;
    monitor = setInterval(() => {
      runCheck().catch((e) => console.error("[berita-notifier]", e.message));
    }, ms);
    console.log(`[berita-notifier] monitor aktif — cek tiap ${st.intervalMin} mnt (sumber: ${st.source})`);
  } else if (!st.enabled && monitor) {
    clearInterval(monitor);
    monitor = null;
    console.log("[berita-notifier] monitor berhenti");
  } else if (st.enabled && monitor) {
    // interval berubah → rebuild
    const ms = Math.max(5, st.intervalMin) * 60 * 1000;
    clearInterval(monitor);
    monitor = setInterval(() => {
      runCheck().catch((e) => console.error("[berita-notifier]", e.message));
    }, ms);
  }
}

export function initBeritaNotifier(s) { setSock(s); }

export function isBeritaNotifierOn() { return !!loadState().enabled; }

export function setBeritaNotifierOn(on) {
  const st = loadState();
  st.enabled = on === true;
  saveState(st);
  syncMonitor();
  return st.enabled;
}

// ── Subscriber CRUD ──────────────────────────────────────────
export function addSubscriber(jid) {
  const st = loadState();
  if (!st.subscribers.includes(jid)) st.subscribers.push(jid);
  saveState(st);
  return true;
}
export function removeSubscriber(jid) {
  const st = loadState();
  st.subscribers = st.subscribers.filter((s) => s !== jid);
  saveState(st);
  return true;
}
export function isSubscriber(jid) { return loadState().subscribers.includes(jid); }

// ── Config ───────────────────────────────────────────────────
export function setSource(name) {
  let key = String(name || "").toLowerCase();
  if (SOURCE_ALIAS[key]) key = SOURCE_ALIAS[key]; // kompas → antara (feed lama mati)
  if (!SOURCES[key]) return null;
  const st = loadState();
  st.source = key;
  // sumber ganti → reset dedup biar berita sumber baru gak keanggap dobel
  st.seen = [];
  saveState(st);
  syncMonitor();
  return key;
}
export function setIntervalMin(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 5 || v > 120) return null;
  const st = loadState();
  st.intervalMin = v;
  saveState(st);
  syncMonitor();
  return v;
}

// ── HTTP seam (e2e) ───────────────────────────────────────────
let rssHttp = null; // fn(feedUrl) → xml string
let imgHttp = null; // fn(url) → Buffer | null
export function setRssHttp(fn) { rssHttp = fn; }
export function setImgHttp(fn) { imgHttp = fn; }
export function resetBeritaDeps() { rssHttp = null; imgHttp = null; }

// ── Fetch + parse feed ───────────────────────────────────────
function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}
function stripHtml(s) {
  return decodeEntities(String(s || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractImage(it) {
  // 1. enclosure (pola CNN/detik network)
  if (it.enclosure?.url) return decodeEntities(it.enclosure.url);
  // 2. media:content
  const media = it["media:content"] || it.mediaContent;
  if (Array.isArray(media) && media[0]?.$?.url) return decodeEntities(media[0].$.url);
  if (typeof media === "object" && media?.$?.url) return decodeEntities(media.$.url);
  if (typeof media === "string") return decodeEntities(media);
  // 3. <img> di description/content
  const raw = String(it.content || it["content:encoded"] || it.contentEncoded || it.description || it.summary || "");
  const m = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]) : null;
}

export async function fetchFeed(sourceKey, limit = 10) {
  const src = SOURCES[sourceKey] || SOURCES.cnn;
  let xml;
  if (rssHttp) {
    xml = await rssHttp(src.feed);
  } else {
    const res = await fetch(src.feed, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    xml = await res.text();
  }
  const parsed = await parser.parseString(xml);
  const items = (parsed.items || [])
    .map((it) => ({
      guid: String(it.guid || it.link || it.id || "").trim() || String(it.link || "").trim(),
      title: stripHtml(it.title).slice(0, 180),
      link: String(it.link || it.url || "").trim(),
      pubTs: Date.parse(it.isoDate || it.pubDate || "") || 0,
      snippet: stripHtml(it.contentSnippet || it.description || it.content || it["content:encoded"] || "").slice(0, 220),
      image: extractImage(it),
    }))
    .filter((it) => it.title && it.link);
  if (!items.length) throw new Error("RSS kosong");
  // terbaru duluan
  items.sort((a, b) => (b.pubTs || 0) - (a.pubTs || 0));
  return items.slice(0, limit);
}

// ── Download thumbnail ──────────────────────────────────────
async function downloadImage(url) {
  if (!url) return null;
  try {
    if (imgHttp) return await imgHttp(url);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) Mobile Safari/537.36" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf && buf.length > 2000 ? buf : null;
  } catch { return null; }
}

// ── Format pesan (PLAINTEXT + thumbnail — request owner) ─────
export function formatNewsMessage(item, sourceLabel) {
  let msg = `📰 *BERITA BARU — ${sourceLabel}*\n\n`;
  msg += `${item.title}\n\n`;
  if (item.snippet) msg += `${item.snippet}${item.snippet.length >= 220 ? "…" : ""}\n\n`;
  msg += `🔗 ${item.link}`;
  if (item.pubTs) {
    msg += `\n🕐 ${new Date(item.pubTs).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB`;
  }
  return msg;
}

async function sendNewsCard(chatId, item, sourceLabel) {
  if (!sock) return false;
  const thumb = await downloadImage(item.image);
  const msg = { text: formatNewsMessage(item, sourceLabel) };
  msg.contextInfo = {
    externalAdReply: {
      title: item.title.slice(0, 60),
      body: `berita terbaru • ${sourceLabel}`,
      sourceUrl: item.link,
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: false,
      ...(thumb ? { thumbnail: thumb } : {}),
    },
  };
  await sock.sendMessage(chatId, msg);
  return true;
}

// ── Run check ────────────────────────────────────────────────
/**
 * Cek feed sumber aktif → kirim berita BARU (dedup GUID) ke subscriber
 * + target terpusat. force=true kirim N terbaru tanpa peduli dedup
 * (dipake .beritanotify now / sample aktivasi).
 */
export async function runCheck({ force = false, max = MAX_PER_CHECK, only = null } = {}) {
  const st = loadState();
  if (!sock) return { sent: 0, recipients: 0, error: "sock belum siap" };
  if (!st.enabled && !force) return { sent: 0, recipients: 0, skipped: "off" };

  let items;
  try {
    items = await fetchFeed(st.source, 10);
  } catch (e) {
    return { sent: 0, recipients: 0, error: e.message };
  }

  const seen = new Set(st.seen || []);
  let fresh;
  if (force) {
    fresh = items.slice(0, Math.max(1, Math.min(max, MAX_PER_CHECK)));
  } else {
    fresh = items.filter((it) => !seen.has(it.guid)).slice(0, MAX_PER_CHECK);
  }

  // tandain semua item aktif ke-seen (cap)
  for (const it of items) seen.add(it.guid);
  const seenArr = [...seen].slice(-SEEN_CAP);
  st.seen = seenArr;
  st.lastCheck = Date.now();
  saveState(st);

  if (!fresh.length) return { sent: 0, recipients: 0, berita: 0 };

  // recipients: subscriber TETAP dapat + target terpusat nambah jangkauan
  // only=<jid> → sample aktivasi ke chat itu doang (jangan spam subscriber lain)
  let recipients = only ? [only] : [...(st.subscribers || [])];
  try {
    recipients = only ? recipients : await mergeAutoTargets(sock, "autoberitanotify", recipients);
  } catch {}
  recipients = [...new Set(recipients)].filter(Boolean);
  if (!recipients.length) return { sent: 0, recipients: 0, berita: fresh.length, note: "gak ada subscriber/target" };

  const label = SOURCES[st.source]?.label || st.source;
  let sent = 0;
  for (const item of fresh) {
    for (const rc of recipients) {
      try {
        await sendNewsCard(rc, item, label);
        sent++;
      } catch (e) {
        console.error("[berita-notifier] kirim gagal:", e.message);
      }
    }
    await new Promise((r) => setTimeout(r, 1000)); // jeda anti spam WA
  }
  const st2 = loadState();
  st2.lastSent = Date.now();
  saveState(st2);
  return { sent, recipients: recipients.length, berita: fresh.length };
}

// Info status buat plugin
export function statusInfo() {
  const st = loadState();
  const cfg = getAutoTargetConfig("autoberitanotify");
  return {
    ...st,
    sourceLabel: SOURCES[st.source]?.label || st.source,
    targetDesc: describeAutoTarget(cfg),
  };
}
