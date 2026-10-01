// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
export const MIN1AI_DEFAULT_MODEL = "qwen3-8b"; // owner 11 Sep: default qwen biasa (free)

// ══ SEMUA MODEL MIN1AI — ID VERIFIED LIVE (11 Sep 2026, via API) ══
// free = kredit 0 jalan; lainnya valid tapi butuh kredit berbayar.
// (gpt-3.5, gpt-oss, deepseek-v3.2, kimi, claude — ID-nya GAK dikenali
// API chat-with-ai, jadi sengaja gak dimasukin biar gak nyasar.)
export const MIN1AI_MODEL_GROUPS = {
  "Qwen": [
    "qwen3-8b (free)",
    "qwen3-vl-8b-thinking (free)",
    "qwen3.7-max",
    "qwen3.7-plus",
    "qwen3.7-flash",
    "qwen3.6-plus",
    "qwen3.6-max-preview",
  ],
  "OpenAI": [
    "gpt-6-astra",
    "gpt-5.6-luna",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.4-pro",
    "gpt-5.2",
    "gpt-5.2-pro",
    "gpt-5.1",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "o3",
    "o3-pro",
    "o3-mini",
  ],
  "DeepSeek": [
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "deepseek-chat",
    "deepseek-reasoner",
  ],
  "Gemini": [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
  ],
  "Grok": [
    "grok-4.6",
    "grok-4.5",
    "grok-4.3",
    "grok-4-fast-reasoning",
    "grok-4-fast-non-reasoning",
    "grok-4-0709",
    "grok-3",
    "grok-3-mini",
  ],
  "GLM": [
    "glm-5.3",
    "glm-5.2",
    "glm-5.1",
    "glm-5",
  ],
  "Mistral": [
    "mistral-large-latest",
    "ministral-14b-latest",
  ],
  "Cohere": [
    "command-r-08-2024",
  ],
};

// Flat daftar id valid (tanpa suffix "(free)")
export const MIN1AI_MODELS = Object.values(MIN1AI_MODEL_GROUPS)
  .flat()
  .map((s) => String(s).replace(/\s*\(free\)\s*$/i, "").trim());


export async function getMin1aiKey() {
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
// ═══════════════════════════════════════════════════════════
// VISION — qwen3-vl-8b-thinking (QWEN VISION, FREE) via 1min.ai
// (verified live 17 Sep 2026: baca foto anjing beneran)
// Format (resmi, ngikutin client 1min.ai): upload buffer ke
// /api/assets (multipart "asset") → key "images/..." → chat-with-ai
// ?isStreaming=true + promptObject.attachments.images → SSE event
// "content" diparse → jawaban.
// ═══════════════════════════════════════════════════════════
const MIN1AI_VISION_MODEL = "qwen3-vl-8b-thinking";

/**
 * Upload buffer gambar ke Asset API 1min.ai → return asset key ("images/...").
 */
async function min1aiUploadAsset(imageBuffer, apiKey, ext = "jpg") {
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  const form = new FormData();
  form.append("asset", new Blob([imageBuffer], { type: mime }), `foto.${ext || "jpg"}`);
  const res = await fetch("https://api.1min.ai/api/assets", {
    method: "POST",
    headers: { "API-KEY": apiKey },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`1min.ai upload asset HTTP ${res.status}`);
  const j = await res.json().catch(() => ({}));
  const key = j?.asset?.key;
  if (!key) throw new Error("1min.ai upload asset: key kosong");
  return key;
}

/**
 * Scan gambar pakai Qwen vision (qwen3-vl-8b-thinking, free) via 1min.ai.
 * @param {Buffer} imageBuffer - buffer gambar (jpg/png/webp)
 * @param {string} prompt - pertanyaan/instruksi tentang gambar
 * @returns {Promise<{status, text, model}>}
 */
export async function min1aiVision(imageBuffer, prompt, opts = {}) {
  if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw new Error("buffer gambar kosong");
  const key = await getMin1aiKey();
  if (!key) throw new Error("key 1min.ai kosong — set apikeys.json aiSatuan.min1ai");

  // magic byte → ext biar mime bener (png/webp/gif/jpeg)
  const b64Head = imageBuffer.subarray(0, 8).toString("base64");
  const ext = b64Head.startsWith("iVBOR") ? "png"
    : b64Head.startsWith("UklGR") ? "webp"
    : b64Head.startsWith("R0lGO") ? "gif" : "jpg";

  const assetKey = await min1aiUploadAsset(imageBuffer, key, ext);

  const model = (opts.model || MIN1AI_VISION_MODEL).trim();
  const body = {
    type: "UNIFY_CHAT_WITH_AI",
    model,
    promptObject: {
      prompt: String(prompt || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.").trim(),
      attachments: { images: [assetKey] },
    },
  };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs || 120000);
  let res;
  try {
    res = await fetch(MIN1AI_URL + "?isStreaming=true", {
      method: "POST",
      headers: { "Content-Type": "application/json", "API-KEY": key },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch (e) {
    throw new Error(e?.name === "AbortError" ? "1min.ai vision timeout" : `gagal hubungi 1min.ai: ${e.message}`);
  } finally { clearTimeout(timer); }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg += ` — ${j?.message || j?.error || ""}`; } catch {}
    throw new Error(`1min.ai vision gagal: ${msg}`);
  }

  // parse SSE: event "content" = potongan jawaban; "reasoning" = proses pikir (skip)
  const raw = await res.text();
  const parts = [];
  for (const chunk of raw.split(/\r?\n\r?\n/)) {
    const em = chunk.match(/event: (\w+)/);
    const dm = chunk.match(/data: (.*)/s);
    if (!em || !dm || em[1] !== "content") continue;
    try { parts.push(JSON.parse(dm[1].trim()).content || ""); } catch {}
  }
  const text = parts.join("").trim();
  if (!text) throw new Error("1min.ai vision: jawaban kosong (model gak baca gambar / stream gagal)");
  return { status: true, text, model };
}

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
