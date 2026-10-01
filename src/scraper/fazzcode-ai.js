// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// fazzcode-ai.js — fazzcode.eu.cc AI wrapper (NON-roleplay)
// Sweep live 14 Sep 2026 dari 225 endpoint docs, YANG HIDUP:
//   ✅ /turboseek          — AI search: jawaban + sources (perplexity-style)
//   ✅ /notrack            — AI chat NoTrack (model C, stateless, flaky lock)
//   ✅ /router/agnes-2.5-flash — BansosAI router (model lain ENDPOINT_LOCKED)
// Yang MATI (jangan pakai): claude-sonnet-5 (upstream session invalid),
//   unlimitedai (404), t2v/generate (EROFS internal), remusic + melody
//   (hang/400), qwenimagedit (sukses tapi result kosong), magicstudio (404),
//   router lain (ENDPOINT_LOCKED auto).
// fazzcode sering AUTO-LOCK endpoint pas kena error → error message
// diturunkan ramah + transient (tunggu bentar jalan lagi).
// ═════════════════════════════════════════════

import axios from "axios";
import { getFazzcodeKey } from "../lib/config/env-loader.js";

const HOST = "https://api.fazzcode.eu.cc";

// ── seam untuk e2e (injek http mock tanpa nembak API live)
let _http = axios;
export function _setFazzAiHttpForTest(fake) { _http = fake; }
export function _resetFazzAiHttpForTest() { _http = axios; }

/**
 * UPDATE 14 Sep 2026 (sore): fazzcode rombak auth — GET + ?api_key= udah gak
 * berlaku (401 "MISSING_API_KEY" padahal key terkirim), format baru = POST
 * + header "Authorization: Bearer <key>" + body JSON. Backend sebagian
 * endpoint masih goyang (turboseek/notrack hang 524) tapi format POST udah
 * kebukti di chatbot-role (LIVE). Dual-mode: POST baru duluan, kalau POST
 * ditolak mentah (404/405 = route cuma terima GET) → fallback GET lama
 * biar tahan kalau fazzcode balikin format lama.
 */
async function fazzRequest(path, body, query, timeoutMs) {
  const key = getFazzcodeKey();
  const post = async () => _http.post(`${HOST}${path}`, body, {
    headers: { Authorization: `Bearer ${key}` }, timeout: timeoutMs,
  });
  const get = async () => _http.get(`${HOST}${path}`, {
    params: { ...query, api_key: key }, timeout: timeoutMs,
  });
  try {
    return await post();
  } catch (e) {
    const code = e?.response?.status;
    const msg = String(e?.response?.data?.message || e?.message || "");
    // POST ditolak mentah (route gak nerima POST) → coba format lama
    if (code === 404 || code === 405 || msg.includes("Not found: POST") || msg.includes("NOT_FOUND")) {
      return await get();
    }
    throw e;
  }
}

function friendly(err) {
  const msg = String(err?.response?.data?.message || err?.message || err || "");
  if (msg.includes("ENDPOINT_LOCKED") || msg.includes("dikunci"))
    return "endpoint lagi kekunci sementara di fazzcode (auto-lock, tunggu beberapa menit)";
  if (msg.includes("Invalid API key") || msg.includes("API_KEY"))
    return "API key fazzcode invalid/kosong";
  if (msg.includes("terlalu banyak") || /rate/i.test(msg)) return "rate limit fazzcode";
  return msg.slice(0, 120) || "error tak dikenal";
}

/**
 * TurboSeek — AI search engine: jawaban AI + daftar sumber.
 * @param {string} question pertanyaan natural
 * @returns {Promise<{ok:boolean, answer?:string, sources?:string[], similar?:string[], error?:string}>}
 */
export async function turboseekSearch(question) {
  const key = getFazzcodeKey();
  if (!key) return { ok: false, error: "API_KEY" };
  try {
    const res = await fazzRequest("/turboseek", { question }, { question }, 45000);
    const d = res.data;
    if (d?.status !== "success" || !d?.result?.answer) {
      return { ok: false, error: friendly(d?.message || "respon sukses tapi kosong") };
    }
    return {
      ok: true,
      answer: String(d.result.answer).trim(),
      sources: Array.isArray(d.result.sources) ? d.result.sources.filter((s) => typeof s === "string" && /^https?:\/\//.test(s)) : [],
      similar: Array.isArray(d.result.similarQuestions) ? d.result.similarQuestions.filter((s) => typeof s === "string") : [],
    };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/**
 * NoTrack AI chat — chat AI stateless (model C satu-satunya yang hidup).
 * @param {string} prompt
 * @returns {Promise<{ok:boolean, reply?:string, error?:string}>}
 */
export async function notrackChat(prompt) {
  const key = getFazzcodeKey();
  if (!key) return { ok: false, error: "API_KEY" };
  try {
    const res = await fazzRequest("/notrack", { prompt, model: "C", mode: "usual" }, { prompt, model: "C", mode: "usual" }, 40000);
    const d = res.data;
    const reply = d?.result?.response;
    if (d?.status !== "success" || !reply) {
      return { ok: false, error: friendly(d?.message || "respon sukses tapi kosong") };
    }
    return { ok: true, reply: String(reply).trim() };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/**
 * BansosAI router — Agnes 2.5 Flash (model router yang masih hidup).
 * @param {string} prompt
 * @returns {Promise<{ok:boolean, reply?:string, error?:string}>}
 */
export async function agnesChat(prompt) {
  const key = getFazzcodeKey();
  if (!key) return { ok: false, error: "API_KEY" };
  try {
    const res = await fazzRequest("/router/agnes-2.5-flash", { prompt }, { prompt }, 40000);
    const d = res.data;
    // result bentuknya { "<teks>": "<teks>" } atau string — fleksibel
    let reply = d?.result?.response || d?.result?.reply || "";
    if (!reply && d?.result && typeof d.result === "object") {
      const vals = Object.values(d.result).filter((v) => typeof v === "string" && v.length > 10);
      reply = vals[vals.length - 1] || "";
    }
    if (d?.status !== "success" || !reply) {
      return { ok: false, error: friendly(d?.message || "respon sukses tapi kosong") };
    }
    return { ok: true, reply: String(reply).trim() };
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/**
 * fazzcodeAiChat — gabungan untuk RANTAI fallback AI (rara-ai-fallback.js):
 * NoTrack duluan → kalau kena auto-lock/rate → Agnes 2.5 Flash.
 * Throw kalau dua-duanya gagal (biar rantai lanjut step berikutnya).
 * @param {string} prompt
 * @returns {Promise<string>} teks balasan AI
 */
export async function fazzcodeAiChat(prompt) {
  const key = getFazzcodeKey();
  if (!key) throw new Error("API key fazzcode kosong");
  const nt = await notrackChat(prompt);
  if (nt.ok) return nt.reply;
  const ag = await agnesChat(prompt);
  if (ag.ok) return ag.reply;
  throw new Error(`fazzcode: ${nt.error} / ${ag.error}`);
}
