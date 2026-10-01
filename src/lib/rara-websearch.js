// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-websearch.js — web search + page preview (request owner 2026-09-10:
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
let linkResolverHttp = defaultLinkResolverHttp;

export function setWebSearchHttp(fn) { webSearchHttp = fn || defaultWebSearchHttp; }
export function setLinkResolverHttp(fn) { linkResolverHttp = fn || defaultLinkResolverHttp; }
export function setPreviewHttp(fn) { previewHttp = fn || defaultPreviewHttp; }
export function resetWebSearchDeps() {
  webSearchHttp = defaultWebSearchHttp;
  previewHttp = defaultPreviewHttp;
  linkResolverHttp = defaultLinkResolverHttp;
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

async function defaultLinkResolverHttp(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(opts.timeoutMs || 9000),
    headers: { "User-Agent": UA },
  });
  return {
    status: res.status,
    location: res.headers.get("location") || "",
    text: res.status >= 200 && res.status < 300 ? await res.text() : "",
  };
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

function parseBaidu(html) {
  const $ = cheerio.load(html);
  const items = [];
  $("h3 a").each((_, el) => {
    const a = $(el);
    const title = (a.text() || "").trim();
    const url = a.attr("href") || "";
    if (!title || !/^https?:\/\//i.test(url)) return;
    if (items.some((i) => i.url === url)) return;
    items.push({ title, url, snippet: "" });
  });
  return items;
}

function parseSogou(html) {
  const $ = cheerio.load(html);
  const items = [];
  $("h3 a").each((_, el) => {
    const a = $(el);
    const title = (a.text() || "").trim();
    const raw = a.attr("href") || "";
    if (!title) return;
    // skip link internal sogou (bukan hasil)
    if (!/^https?:\/\//.test(raw) && !raw.startsWith("/link?")) return;
    const url = raw.startsWith("/link?") ? "https://www.sogou.com" + raw : raw;
    if (items.some((i) => i.url === url)) return;
    const snippet = (a.closest(".vrwrap, .rb").find(".space-txt, .str-text-info").first().text() || "").trim();
    items.push({ title, url, snippet });
  });
  return items;
}

// resolve redirect asli baidu.com/link (HTTPS HEAD → 302 Location)
async function resolveBaiduLink(url) {
  if (!/baidu\.com\/link/i.test(url)) return url;
  try {
    const u = url.replace(/^http:\/\//i, "https://");
    const r = await linkResolverHttp(u, { method: "HEAD" });
    if (r.status >= 300 && r.status < 400 && r.location) {
      try { return new URL(r.location, u).href; } catch { return r.location; }
    }
  } catch (e) {
    console.error("[rara-websearch] resolve baidu link gagal:", e.message);
  }
  return url;
}

// resolve redirect sogou.com/link (body: window.location.replace / URL='…')
async function resolveSogouLink(url) {
  if (!/sogou\.com\/link/i.test(url)) return url;
  try {
    const r = await linkResolverHttp(url, { method: "GET" });
    const body = r.text || "";
    const m = body.match(/window\.location\.replace\("([^"]+)"\)/) || body.match(/URL='([^']+)'/) || body.match(/URL=\"([^"]+)\"/);
    if (m && /^https?:\/\//i.test(m[1])) return m[1];
  } catch (e) {
    console.error("[rara-websearch] resolve sogou link gagal:", e.message);
  }
  return url;
}

const ENGINES = {
  bing: { label: "Bing", chain: [parseBing], url: (q, n) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=${Math.max(1, Math.min(n, 10))}`, get: false },
  brave: { label: "Brave Search", chain: [parseBrave], url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`, get: false },
  duckduckgo: { label: "DuckDuckGo", chain: [parseDdgLite], url: () => "https://lite.duckduckgo.com/lite/", get: true, post: (q) => new URLSearchParams({ q }).toString() },
  baidu: { label: "Baidu 百度", chain: [parseBaidu], url: (q, n) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}&rn=${Math.max(1, Math.min(n, 10))}`, headers: { "Accept-Language": "zh-CN,zh;q=0.9,id;q=0.8", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", Referer: "https://www.baidu.com/" }, resolve: resolveBaiduLink },
  sogou: { label: "Sogou 搜狗", chain: [parseSogou], url: (q) => `https://www.sogou.com/web?query=${encodeURIComponent(q)}`, headers: { "Accept-Language": "zh-CN,zh;q=0.9,id;q=0.8", Accept: "text/html,application/xhtml+xml", Referer: "https://www.sogou.com/" }, resolve: resolveSogouLink },
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
  // 🎯 RELEVANSI GUARD (bug owner 12 Sep: ".agent disuruh siapa prabowo malah
  // tdk ditemukan" — Bing balikin SERP SAMPAH utk pertanyaan natural Indonesia:
  // query "siapa prabowo" → hasil "Siapa Gdl | Guadalajara - Facebook" →
  // agent baca halaman nyasar → nyimpulin gak ketemu). Item yang GAK
  // ngandung satu pun kata query dibuang; kalau SEMUA item satu engine gak
  // nyambung → engine dianggap gagal → lanjut engine berikut. Kalau
  // pada akhirnya SEMUA engine cuma punya hasil nyasar, hasil mentah
  // terakhir tetap dikasih (lebih baik nyasar daripada "tdk ditemukan").
  // kata tanya/filler Indonesia + angka murni GAK dihitung buat relevansi —
  // "siapa" di SERP sampah ("Siapa Gdl | Guadalajara") bikin guard versi 1 lolos
  const STOP_ID = new Set(["siapa","apa","yang","dan","atau","dari","adalah","itu","ini","untuk","dengan","pada","bagaimana","gimana","kapan","dimana","kemana","kenapa","mengapa","berapa","tolong","mohon","cari","carikan","kasih","beri","dong","ya","saya","aku","kamu","dia","mereka","kita","ada","gak","nggak","tidak","bisa","boleh","akan","sudah","belum","lagi","juga","hanya","biar","supaya","agar","klo","kalau","karena","sampe","sampai","tentang","mengenai"]);
  const mkTerms = (qs) => (qs.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((w) => !STOP_ID.has(w) && !/^\d+$/.test(w));
  // qCore = query minus kata tanya — "siapa prabowo" → "prabowo" (BING SERING
  // drop kata inti & nyariin kata tandanya doang → SERP sampah "SIAPA Guadalajara")
  const mkCore = (qs) => qs.split(/\s+/).filter((w) => !STOP_ID.has(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))).join(" ").trim();

  // satu putaran penuh (semua engine di `order`) buat satu query
  const attempt = async (qs) => {
    const terms = mkTerms(qs);
    let lastResort = null;
    const errs = [];
    for (const key of order) {
      const eng = ENGINES[key];
      try {
        const url = eng.url(qs, limit);
        // FIX 12 Sep 2026 (ketemu pas smoke .raraagent browsing): engine tanpa
        // headers (bing/brave/ddg) tadinya kirim request TANPA User-Agent →
        // bing jawab SERP sampah gak nyambung (Ubisoft/aparthotel utk query
        // berita). UA default WAJIB selalu terkirim.
        const baseHeaders = { "User-Agent": UA, "Accept-Language": "id,en;q=0.8", Accept: "text/html,application/xhtml+xml", ...(eng.headers || {}) };
        const html = eng.post
          ? await webSearchHttp(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...baseHeaders }, body: eng.post(qs) })
          : await webSearchHttp(url, { headers: baseHeaders });
        let items = eng.chain[0](html).slice(0, limit);
        if (items.length) {
          // engine cina: link redirect → resolve URL asli paralel (fallback: link redirect tetap dipakai)
          if (eng.resolve) {
            items = await Promise.all(items.map(async (it) => ({ ...it, url: await eng.resolve(it.url) })));
          }
          if (terms.length) {
            // skor = berapa kata query yang ke-match di judul+snippet. 1 kata
            // doang (mis. cuma "cara" di SERP sampah) = nyasar — minimal 2 kata
            // buat query multi-kata, 1 buat query 1 kata.
            const need = terms.length >= 2 ? 2 : 1;
            const relevant = items.filter((it) => {
              const hay = ((it.title || "") + " " + (it.snippet || "")).toLowerCase();
              return terms.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) >= need;
            });
            if (!relevant.length) {
              errs.push(eng.label + ": hasil gak nyambung sama query");
              lastResort = { source: eng.label, engine: key, engineNote, items };
              continue;
            }
            items = relevant;
          }
          return { result: { source: eng.label, engine: key, engineNote, items } };
        }
        errs.push(`${eng.label}: 0 hasil`);
      } catch (e) {
        errs.push(`${eng.label}: ${e.message}`);
      }
    }
    return { lastResort, errs };
  };

  const qCore = mkCore(q);
  const a1 = await attempt(q);
  if (a1.result) return a1.result;
  // semua engine nyasar buat query penuh → retry tanpa kata tanya
  // ("siapa prabowo" → "prabowo") sebelum nyerah
  if (qCore && qCore !== q) {
    const a2 = await attempt(qCore);
    if (a2.result) return { ...a2.result, engineNote: engineNote || "", usedCoreQuery: true };
    if (a2.lastResort) return { ...a2.lastResort, lowRelevance: true };
  }
  // hasil mentah terakhir tetap dikasih (ditandain lowRelevance biar agent
  // gak baca halaman sampah & jawab jujur "gak nemu di web")
  if (a1.lastResort) return { ...a1.lastResort, lowRelevance: true };
  console.error("[rara-websearch] semua engine gagal:", (a1.errs || []).join(" | "));
  return { error: "semua mesin search sibuk, coba lagi bentar" };
}

export function listEngines() {
  return [
    { key: "bing", label: "Bing", note: "default — paling stabil" },
    { key: "brave", label: "Brave Search", note: "privasi, hasil beragam" },
    { key: "duckduckgo", label: "DuckDuckGo", note: "privasi, tanpa tracking" },
    { key: "google", label: "Google (auto-Bing)", note: "google ngeblok bot — auto dialihkan ke bing" },
    { key: "baidu", label: "Baidu 百度", note: "mesin search cina no.1" },
    { key: "sogou", label: "Sogou 搜狗", note: "mesin cina — konten WeChat/Zhihu (kadang ngeblok bot → auto fallback)" },
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
