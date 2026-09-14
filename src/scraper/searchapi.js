// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 searchapi.js — Google AI Mode (searchapi.io)
// 🔹 Docs: https://www.searchapi.io/docs/google-ai-mode-api
// 🔹 GET /api/v1/search?engine=google_ai_mode&q=<query>[&url=<imageUrl>]
// 🔹 Jawaban AI Google (AI Mode) + reference links (publisher URL udah
//   di-resolve searchapi, bukan google redirect).
// 🔹 STRICT SATUAN (owner 14 Sep 2026): key kosong / 401 / 429 → error asli
//   keluar, TANPA fallback ke AI/rantai lain.
// ═════════════════════════════════════════════

import { getSearchApiKey } from "../lib/config/env-loader.js";

const API_URL = "https://www.searchapi.io/api/v1/search";
const TIMEOUT_MS = 60000;

// seam buat e2e (mock http + key)
let _http = null;
export function _setSearchApiHttpForTest(fn) { _http = fn; }
let _keyOverride = null;
export function _setSearchApiKeyForTest(k) { _keyOverride = k; }
function getKey() { return _keyOverride !== null ? _keyOverride : getSearchApiKey(); }

/**
 * Bersihin markdown AI Mode biar rapi di kartu WA:
 * - sitasi numerik inline [0](url) → dibuang (sumber udah ada di daftar bawah)
 * - [teks](url) → teks doang
 * - **bold** → *bold* (format WhatsApp)
 * - header md (## ) → dibuang
 */
function cleanMarkdown(md) {
  return String(md)
    .replace(/<video_wrapper>[\s\S]*?<\/video_wrapper>/gi, "") // blok saran video AI Mode
    .replace(/<\/?[a-z_]+>/gi, "") // tag wrapper lain
    .replace(/\[(\d+)\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Ambil jawaban AI dari text_blocks / generated_markdown (toleran bentuk respon).
 */
function extractAnswer(data) {
  // 1. generated_markdown (bentuk utama per docs)
  const md = data?.generated_markdown || data?.markdown || "";
  if (typeof md === "string" && md.trim()) return cleanMarkdown(md);

  // 2. text_blocks: [{type:"text", snippet:"..."}]
  const blocks = data?.text_blocks || [];
  const parts = [];
  for (const b of blocks) {
    const snip = b?.snippet || b?.text || b?.content || "";
    if (typeof snip === "string" && snip.trim()) parts.push(snip.trim());
    // table block kadang beda struktur
    if (b?.type === "table" && Array.isArray(b?.table)) {
      for (const row of b.table) {
        if (Array.isArray(row)) parts.push(row.map(String).join(" | "));
      }
    }
  }
  if (parts.length) return parts.join("\n\n");

  // 3. fallback longsoran bentuk lain
  const alt = data?.ai_mode_text || data?.answer || data?.response || "";
  return typeof alt === "string" ? cleanMarkdown(alt) : "";
}

/**
 * Sumber: reference_links (publisher URL resolved) + web_references.
 * @returns {Array<{title, link}>}
 */
function extractSources(data) {
  const out = [];
  const seen = new Set();
  const push = (link, title) => {
    if (!link || seen.has(link)) return;
    // buang redirect google yang gak ke-resolve (bukan sumber asli)
    if (/translate\.google\.com\/translate/i.test(link)) return;
    if (/www\.google\.com\/goto\?/i.test(link)) return;
    seen.add(link);
    out.push({ title: title || "", link });
  };
  for (const r of data?.reference_links || []) {
    push(r?.link || r?.url, r?.title || r?.source || "");
  }
  for (const r of data?.web_references || []) {
    const link = r?.link || r?.url || r?.serpapi_link || "";
    push(link, r?.title || r?.source || "");
  }
  return out.slice(0, 8);
}

/**
 * Pertanyaan lanjutan (followups) kalau ada.
 */
function extractFollowups(data) {
  const f = data?.followups || data?.related_questions || [];
  return (Array.isArray(f) ? f : [])
    .map((x) => (typeof x === "string" ? x : x?.question || x?.text || ""))
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Google AI Mode search.
 * @param {string} query pertanyaan (opsional kalau imageUrl ada)
 * @param {object} [opts]
 * @param {string} [opts.imageUrl] URL gambar publik → visual AI mode
 * @returns {Promise<{ok:boolean, answer:string, sources:Array, followups:Array, error?:string, httpStatus?:number, took?:number}>}
 */
export async function googleAiModeSearch(query, opts = {}) {
  const key = getKey();
  if (!key) {
    return { ok: false, answer: "", sources: [], followups: [], error: "API_KEY" };
  }
  const q = String(query || "").trim();
  const imageUrl = String(opts.imageUrl || "").trim();
  if (!q && !imageUrl) {
    return { ok: false, answer: "", sources: [], followups: [], error: "QUERY_KOSONG" };
  }

  const params = new URLSearchParams({ engine: "google_ai_mode", api_key: key });
  if (q) params.set("q", q);
  if (imageUrl) params.set("url", imageUrl);
  // AI Mode jawab sesuai bahasa query — hl=id, gl=id biar default konsisten Indonesia
  params.set("hl", "id");
  params.set("gl", "id");

  const url = `${API_URL}?${params.toString()}`;
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    } finally { clearTimeout(t); }
  });

  let res;
  try {
    res = await doFetch(url);
  } catch (e) {
    return { ok: false, answer: "", sources: [], followups: [], error: e?.name === "AbortError" ? "TIMEOUT (60 dtk) — AI Mode lagi lambat" : (e?.message || "gagal koneksi") };
  }

  const status = res?.status || 0;
  if (status === 401 || status === 403) {
    return { ok: false, answer: "", sources: [], followups: [], error: `API_KEY_INVALID (${status}) — key searchapi.io ditolak/expired`, httpStatus: status };
  }
  if (status === 429) {
    return { ok: false, answer: "", sources: [], followups: [], error: "QUOTA_HABIS (429) — kuota searchapi.io habis (free trial ±100 req/bulan, upgrade di searchapi.io)", httpStatus: status };
  }
  if (status !== 200) {
    let body = "";
    try { body = (await res.text()).slice(0, 150); } catch {}
    return { ok: false, answer: "", sources: [], followups: [], error: `HTTP ${status} ${body}`.trim(), httpStatus: status };
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    return { ok: false, answer: "", sources: [], followups: [], error: "respon bukan JSON: " + (e?.message || "parse gagal"), httpStatus: status };
  }

  const meta = data?.search_metadata || {};
  if (String(meta.status || "").toLowerCase() === "failed" || data?.error) {
    return { ok: false, answer: "", sources: [], followups: [], error: data?.error || "searchapi status failed", httpStatus: status };
  }

  const answer = extractAnswer(data);
  if (!answer) {
    return { ok: false, answer: "", sources: [], followups: [], error: "AI Mode gak ngasih jawaban (coba query lain / tambah konteks)", httpStatus: status };
  }

  return {
    ok: true,
    answer,
    sources: extractSources(data),
    followups: extractFollowups(data),
    took: meta.total_time_taken,
  };
}
