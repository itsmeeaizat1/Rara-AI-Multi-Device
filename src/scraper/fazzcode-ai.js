// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
    const res = await _http.get(`${HOST}/turboseek`, {
      params: { question, api_key: key },
      timeout: 45000,
    });
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
    const res = await _http.get(`${HOST}/notrack`, {
      params: { prompt, model: "C", mode: "usual", api_key: key },
      timeout: 40000,
    });
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
    const res = await _http.get(`${HOST}/router/agnes-2.5-flash`, {
      params: { prompt, api_key: key },
      timeout: 40000,
    });
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
 * fazzcodeAiChat — gabungan untuk RANTAI fallback AI (nova-ai-fallback.js):
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
