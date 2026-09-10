// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-websearch.js — web search + page preview (request owner 2026-09-10:
// ".googleserach buat nyari web — list 1..N, ketik nomor buka halaman,
// bot kirim preview thumbnail + plain text isi halaman + readmore").
// MULTI-ENGINE (request owner 10 Sep: ".search <engine> <query>"): bing | brave |
// duckduckgo — semua TANPA KEY, live verified 2026-09-10. Google ngeblok bot
// (halaman JS) → di-alias ke bing dengan note.
// Preview halaman: title + og:image + og:description + body plain text.
// Semua HTTP injectable (setWebSearchHttp/setPreviewHttp) buat E2E offline.
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const MAX_RESULTS = 10;
const SESSION_TTL_MS = 15 * 60 * 1000; // hasil search valid 15 menit
const PREVIEW_TEXT_LIMIT = 1500;

// ── seam injectable ──
let webSearchHttp = defaultWebSearchHttp;
let previewHttp = defaultPreviewHttp;

export function setWebSearchHttp(fn) { webSearchHttp = fn || defaultWebSearchHttp; }
export function setPreviewHttp(fn) { previewHttp = fn || defaultPreviewHttp; }
export function resetWebSearchDeps() {
  webSearchHttp = defaultWebSearchHttp;
  previewHttp = defaultPreviewHttp;
}

async function defaultWebSearchHttp(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    body: opts.body || undefined,
    signal: AbortSignal.timeout(opts.timeoutMs || 20000),
    headers: {
      "User-Agent": UA,
      "Accept-Language": "id,en;q=0.8",
      ...(opts.headers || {}),
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function defaultPreviewHttp(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: { "User-Agent": UA, "Accept-Language": "id,en;q=0.8", Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = String(res.headers.get("content-type") || "");
  if (ct && !/html|text\/plain|xml/i.test(ct)) throw new Error("bukan halaman web");
  const buf = await res.arrayBuffer();
  const cap = 1.5 * 1024 * 1024;
  const bytes = buf.byteLength > cap ? buf.slice(0, cap) : buf;
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// ── Bing: decode URL redirect bing.com/ck/a?...&u=a1<base64> ──
function decodeBingUrl(href) {
  try {
    if (/bing\.com\/ck\/a/i.test(href)) {
      const u = new URL(href, "https://www.bing.com").searchParams.get("u") || "";
      if (u.startsWith("a1")) {
        const b64 = u.slice(2);
        const decoded = Buffer.from(b64, "base64").toString("utf-8");
        if (/^https?:\/\//i.test(decoded)) return decoded;
      }
      return null;
    }
    return href;
  } catch {
    return null;
  }
}

function parseBing(html) {
  const $ = cheerio.load(html);
  const items = [];
  $("li.b_algo").each((_, el) => {
    const a = $(el).find("h2 a").first();
    const rawHref = a.attr("href") || "";
    const url = decodeBingUrl(rawHref);
    const title = (a.text() || "").trim();
    if (!url || !title) return;
    const snippet = ($(el).find(".b_caption p").first().text() || "").trim();
    if (items.some((i) => i.url === url)) return;
    items.push({ title, url, snippet });
  });
  return items;
}

function parseBrave(html) {
  const $ = cheerio.load(html);
  const items = [];
  $("a[href]").each((_, el) => {
    const a = $(el);
    const t = a.find(".title.search-snippet-title").first();
    const title = (t.attr("title") || t.text() || "").trim();
    const url = a.attr("href") || "";
    if (!title || !/^https?:\/\//i.test(url)) return;
    if (/brave\.com|search\.brave/i.test(url)) return;
    if (items.some((i) => i.url === url)) return;
    const snippet = (a.find(".snippet-description").first().text() || "").trim();
    items.push({ title, url, snippet });
  });
  return items;
}

const ENGINES = {
  bing: { label: "Bing", chain: [parseBing], url: (q, n) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=${Math.max(1, Math.min(n, 10))}`, get: false },
  brave: { label: "Brave Search", chain: [parseBrave], url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`, get: false },
  duckduckgo: { label: "DuckDuckGo", chain: [parseDdgLite], url: () => "https://lite.duckduckgo.com/lite/", get: true, post: (q) => new URLSearchParams({ q }).toString() },
};
// urutan fallback kalau engine utama gagal
const ENGINE_CHAIN = ["bing", "duckduckgo", "brave"];

function parseDdgLite(html) {
  const $ = cheerio.load(html);
  const items = [];
  $("a[rel='nofollow']").each((_, el) => {
    const a = $(el);
    const title = (a.text() || "").trim();
    const url = a.attr("href") || "";
    // skip "More at Wikipedia" dsb + link internal ddg
    if (!/^https?:\/\//i.test(url)) return;
    if (/duckduckgo\.com/i.test(url)) return;
    if (/^more at/i.test(title)) return;
    if (!title) return;
    if (items.some((i) => i.url === url)) return;
    items.push({ title, url, snippet: "" });
  });
  return items;
}

/**
 * Search web — Bing → DDG lite.
 * @returns {Promise<{source:string, items:{title,url,snippet}[]}|{error:string}>}
 */
export async function searchWeb(query, { engine = "bing", limit = MAX_RESULTS } = {}) {
  const q = String(query || "").trim();
  if (!q) return { error: "query kosong" };
  // google gak bisa di-scrape (blok bot) → dialihkan ke bing + note
  let engineNote = "";
  const reqEngine = String(engine || "bing").toLowerCase();
  let engKey = reqEngine;
  if (reqEngine === "google" || reqEngine === "googlecom" || reqEngine === "gg") {
    engKey = "bing";
    engineNote = "google";
  }
  if (!ENGINES[engKey]) return { error: `mesin search gak dikenal: ${reqEngine}` };

  // engine dipilih duluan, sisanya fallback
  const order = [engKey, ...ENGINE_CHAIN.filter((k) => k !== engKey)];
  const errors = [];
  for (const key of order) {
    const eng = ENGINES[key];
    try {
      const url = eng.url(q, limit);
      const html = eng.post
        ? await webSearchHttp(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: eng.post(q) })
        : await webSearchHttp(url);
      const items = eng.chain[0](html).slice(0, limit);
      if (items.length) {
        return { source: eng.label, engine: key, engineNote, items };
      }
      errors.push(`${eng.label}: 0 hasil`);
    } catch (e) {
      errors.push(`${eng.label}: ${e.message}`);
    }
  }
  console.error("[nova-websearch] semua engine gagal:", errors.join(" | "));
  return { error: "semua mesin search sibuk, coba lagi bentar" };
}

export function listEngines() {
  return [
    { key: "bing", label: "Bing", note: "default — paling stabil" },
    { key: "brave", label: "Brave Search", note: "privasi, hasil beragam" },
    { key: "duckduckgo", label: "DuckDuckGo", note: "privasi, tanpa tracking" },
    { key: "google", label: "Google (auto-Bing)", note: "google ngeblok bot — auto dialihkan ke bing" },
  ];
}

/**
 * Preview halaman: title + og:image + og:description + body plain text.
 * @returns {Promise<{url,title,description,image,text}|{error:string}>}
 */
export async function fetchPagePreview(url) {
  if (!/^https?:\/\//i.test(url || "")) return { error: "url gak valid" };
  let html;
  try {
    html = await previewHttp(url);
  } catch (e) {
    return { error: `halaman gak kebuka (${e.message || "timeout"})` };
  }
  try {
    const $ = cheerio.load(html);
    const title =
      ($('meta[property="og:title"]').attr("content") || "").trim() ||
      ($("title").first().text() || "").trim() ||
      "Halaman Web";
    const description =
      ($('meta[property="og:description"]').attr("content") || "").trim() ||
      ($('meta[name="description"]').attr("content") || "").trim() ||
      "";
    let image =
      ($('meta[property="og:image"]').attr("content") || "").trim() ||
      ($('meta[name="twitter:image"]').attr("content") || "").trim() ||
      "";
    if (image && image.startsWith("/")) {
      try { image = new URL(image, url).href; } catch {}
    }
    // body plain text — buang noise
    const $body = $("body");
    if ($body.length) {
      $body.find("script, style, noscript, header, footer, nav, aside, form, iframe, svg, button, select").remove();
    }
    const text = ($body.length ? $body : $.root())
      .text()
      .replace(/\s+/g, " ")
      .replace(/ (\W)/g, "$1")
      .trim()
      .slice(0, PREVIEW_TEXT_LIMIT);
    if (!text && !description) return { error: "halaman kosong / butuh javascript" };
    return { url, title: title.slice(0, 120), description: description.slice(0, 300), image, text };
  } catch (e) {
    return { error: "halaman gak kebaca" };
  }
}

// ── session hasil search per chat (TTL 15 menit) ──
const sessions = new Map();

export function saveSearchSession(chat, query, items) {
  sessions.set(chat, { query, items, ts: Date.now() });
}

export function getSearchSession(chat) {
  const s = sessions.get(chat);
  if (!s) return null;
  if (Date.now() - s.ts > SESSION_TTL_MS) {
    sessions.delete(chat);
    return null;
  }
  return s;
}
