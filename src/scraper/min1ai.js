// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// min1ai — scraper 1min.ai (app.1min.ai) multi provider AI
// Endpoint: POST https://api.1min.ai/api/chat-with-ai (non-streaming, UNIFY_CHAT_WITH_AI)
// Auth: header "API-KEY: <key>" (BUKAN Bearer). Key: apikeys.json aiSatuan.min1ai
// (fallback env MIN1AI_API_KEY).
// Model FREE (verified live 11 Sep 2026): qwen3-vl-8b-thinking (default), qwen3-8b.
// Model lain (gpt-5, gemini-2.5-pro, grok-3, dll) valid tapi butuh kredit berbayar.
// Response: aiRecord.status SUCCESS → aiRecordDetail.resultObject
//   (list of string → join, string → langsung, object {content} → content).
// FAILURE → resultObject {code} (INSUFFICIENT_CREDITS, UNSUPPORTED_MODEL, dll).

const MIN1AI_URL = "https://api.1min.ai/api/chat-with-ai";
export const MIN1AI_DEFAULT_MODEL = "qwen3-vl-8b-thinking";

// Model terverifikasi live (11 Sep 2026) — free = kredit 0, jalan tanpa top-up.
export const MIN1AI_MODELS = [
  "qwen3-vl-8b-thinking (free)",
  "qwen3-8b (free)",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.7-flash",
  "qwen3.6-plus",
  "qwen3.6-max-preview",
  "gpt-5",
  "gpt-4o-mini",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "deepseek-chat",
  "grok-3",
  "mistral-large-latest",
];

async function getMin1aiKey() {
  let key = process.env.MIN1AI_API_KEY || "";
  if (!key) {
    try {
      const { getAiSatuanKeys } = await import("../lib/config/env-loader.js");
      key = (getAiSatuanKeys?.())?.min1ai || "";
    } catch {}
  }
  return key;
}

function extractContent(data) {
  const rec = data?.aiRecord || {};
  const det = rec?.aiRecordDetail || {};
  const rob = det?.resultObject;

  // Gagal — BusinessError code dari 1min.ai
  if (rec.status === "FAILURE" || (rob && !Array.isArray(rob) && rob?.code)) {
    const code = rob?.code || "UNKNOWN_ERROR";
    const map = {
      INSUFFICIENT_CREDITS: "kredit 1min.ai kurang — model ini butuh kredit berbayar (pakai model free: qwen3-vl-8b-thinking / qwen3-8b)",
      UNSUPPORTED_MODEL: "model tidak dikenali 1min.ai",
    };
    throw new Error(map[code] || `1min.ai error: ${code}`);
  }

  // Sukses — resultObject bentuknya bervariasi
  if (Array.isArray(rob)) return rob.filter(Boolean).map(String).join("\n").trim();
  if (typeof rob === "string") return rob.trim();
  if (rob?.content) return String(rob.content).trim();
  if (Array.isArray(det?.responseObject)) return det.responseObject.filter(Boolean).map(String).join("\n").trim();
  if (typeof data?.results?.content === "string") return data.results.content.trim();
  return "";
}

/**
 * Chat 1min.ai — STRICT SATU RUTE (no fallback brand lain).
 * @param {String} prompt - pertanyaan user
 * @param {Object} [opts] - { model (default qwen3-vl-8b-thinking), timeoutMs (default 120s) }
 * @returns {String} balasan AI
 */
export async function min1aiChat(prompt, opts = {}) {
  const key = await getMin1aiKey();
  if (!key) throw new Error("key 1min.ai kosong — set apikeys.json aiSatuan.min1ai");

  const model = (opts.model || MIN1AI_DEFAULT_MODEL).trim();
  const body = {
    type: "UNIFY_CHAT_WITH_AI",
    model,
    promptObject: { prompt: String(prompt || "").trim() },
  };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs || 120000);
  let res;
  try {
    res = await fetch(MIN1AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "API-KEY": key },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch (e) {
    throw new Error(e?.name === "AbortError" ? "1min.ai timeout — coba lagi (model thinking bisa lambat)" : `gagal hubungi 1min.ai: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.errorCode === "UNSUPPORTED_MODEL" || j?.message) msg = j.message || j.errorCode;
    } catch {}
    throw new Error(`1min.ai: ${msg}`);
  }

  const data = await res.json().catch(() => null);
  if (!data) throw new Error("respons 1min.ai bukan JSON");
  const out = extractContent(data);
  if (!out) throw new Error("balasan 1min.ai kosong");
  return out;
}
