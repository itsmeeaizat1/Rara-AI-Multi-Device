// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/rara-salaamai.js — ai.salaam.world (Salaam World Islamic AI Assistant)
// GRATIS TANPA API KEY — AI Engine Pro (WordPress) di baliknya:
//   1) POST /wp-json/mwai/v1/start_session  → { sessionId, restNonce } (guest otomatis dapet nonce)
//   2) POST /wp-json/mwai-ui/v1/chats/submit (X-WP-Nonce) → { success, reply }
// GOTCHA (nemu live 10 Sep 2026): query WAJIB di field `newMessage` — kirim cuma
// `messages` = ditolak 403 "Sorry, your query has been rejected" (basics_security_check
// baca newMessage doang). `messages` cuma konteks history multi-turn.
// 5 asisten, tiap asisten = contextId beda (scrape data-system per halaman).

const BASE = "https://ai.salaam.world";
const START_URL = `${BASE}/wp-json/mwai/v1/start_session`;
const SUBMIT_URL = `${BASE}/wp-json/mwai-ui/v1/chats/submit`;

const HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "origin": BASE,
  "referer": `${BASE}/brother-junaid/`,
  "content-type": "application/json",
};

export const SALAAM_TIMEOUT = 120_000;
export const SALAAM_SESSION_TTL = 20 * 60 * 1000; // nonce+sessionId segar tiap 20 menit

// ── Asisten Salaam World (contextId live-verified 10 Sep 2026) ──
export const SALAAM_ASSISTANTS = [
  { id: "junaid", name: "Brother Junaid", contextId: 1439, maxLen: 512, desc: "tanya apa aja soal Islam (fiqih, sejarah, akidah)" },
  { id: "bilkees", name: "Sister Bilkees", contextId: 1510, maxLen: 512, desc: "doa (dua) harian & moment" },
  { id: "khadijah", name: "Sister Khadijah", contextId: 1505, maxLen: 512, desc: "belajar Islam buat anak kecil" },
  { id: "musa", name: "Brother Musa", contextId: 1520, maxLen: 20, desc: "main tebak-tebakan Islam (jawab 1 kata)" },
  { id: "zahra", name: "Sister Zahra", contextId: 1515, maxLen: 20, desc: "main tebak-tebakan Islam (jawab 1 kata)" },
];

export function resolveSalaamAssistant(id) {
  if (!id) return SALAAM_ASSISTANTS[0];
  const q = String(id).toLowerCase().trim();
  return SALAAM_ASSISTANTS.find((a) => a.id === q) || null;
}

// ── seam buat E2E: setSalaamHttp(fn) ganti transport fetch ──
let _http = null;
export function setSalaamHttp(fn) { _http = fn; }
export function resetSalaamHttp() { _http = null; }
async function httpPost(url, headers, body, timeoutMs) {
  if (_http) return _http(url, headers, body);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs || SALAAM_TIMEOUT),
  });
  let json = null;
  try { json = await res.json(); } catch { /* body bukan json */ }
  return { status: res.status, ok: res.ok, json };
}

// ── session cache (nonce = X-WP-Nonce) ──
let _session = { sessionId: null, nonce: null, ts: 0 };
export function resetSalaamSession() { _session = { sessionId: null, nonce: null, ts: 0 }; }

async function ensureSession(force = false) {
  const fresh = _session.nonce && Date.now() - _session.ts < SALAAM_SESSION_TTL;
  if (!force && fresh) return _session;
  const r = await httpPost(START_URL, HEADERS, {});
  const j = r.json;
  if (!r.ok || !j?.sessionId || !j?.restNonce) {
    throw new Error(j?.message || `start_session HTTP ${r.status}`);
  }
  _session = { sessionId: j.sessionId, nonce: j.restNonce, ts: Date.now() };
  return _session;
}

// ── bersihin balasan (AI Engine kadang kirim HTML entity + tag) ──
export function cleanSalaamReply(t) {
  let s = String(t || "");
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
       .replace(/&#039;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
       .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ""; } });
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

// ── TANYA: askSalaam({ question, assistantId, history }) ──
// history = [{role:'user'|'assistant', content}] konteks multi-turn (maks 8 terakhir)
// return { reply, assistant: {id,name}, sessionId }
export async function askSalaam({ question, assistantId = "junaid", history = [] }) {
  const assistant = resolveSalaamAssistant(assistantId);
  if (!assistant) throw new Error(`asisten gak dikenal: ${assistantId}`);
  const q = String(question || "").trim();
  if (!q) throw new Error("pertanyaan kosong");
  if (q.length > assistant.maxLen) {
    throw new Error(`pertanyaan kepanjangan (maks ${assistant.maxLen} karakter buat ${assistant.name})`);
  }

  const cleanHistory = (Array.isArray(history) ? history : [])
    .filter((h) => h?.role === "user" || h?.role === "assistant")
    .map((h) => ({ role: h.role, content: String(h.content || "").slice(0, 500) }))
    .slice(-8);

  const sess = await ensureSession();
  const body = {
    botId: "default",
    contextId: assistant.contextId,
    session: sess.sessionId,
    messages: [...cleanHistory, { role: "user", content: q }],
    newMessage: q,
    stream: false,
  };
  const headers = {
    ...HEADERS,
    "x-wp-nonce": sess.nonce,
    "referer": `${BASE}/${["bilkees", "khadijah", "zahra"].includes(assistant.id) ? "sister" : "brother"}-${assistant.id}/`,
  };
  let r = await httpPost(SUBMIT_URL, headers, body);

  // nonce kadaluarsa → refresh sekali lalu retry
  if ((r.status === 401 || r.status === 403) && r.json?.code === "rest_forbidden") {
    await ensureSession(true);
    r = await httpPost(SUBMIT_URL, { ...HEADERS, "x-wp-nonce": _session.nonce }, body);
  }

  const j = r.json;
  if (!r.ok) {
    // AI Engine: 403 "query rejected" (payload salah/blocked) | 500 "Oops!" (backend LLM down)
    const msg = j?.message || `HTTP ${r.status}`;
    if (r.status === 403) throw new Error(`query ditolak server salaam (${msg})`);
    throw new Error(`server salaam bermasalah (${msg})`);
  }
  if (!j?.success) throw new Error(j?.message || "balasan gagal dari server salaam");
  const reply = cleanSalaamReply(j.reply || j.answer || "");
  if (!reply) throw new Error("balasan kosong dari server salaam");
  return { reply, assistant: { id: assistant.id, name: assistant.name }, sessionId: sess.sessionId };
}
