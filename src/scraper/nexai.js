// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/nexai.js — NexAI (apinex.bond) multi-provider AI
// Request owner 12 Sep 2026: "tmbah ai multi provider baru nexai" —
// OpenAI-compatible: POST https://api.apinex.bond/v1/chat/completions
// Auth: Bearer sk-apx… (key: apikeys.json aiMultiprovider.providers.nexai).
// Katalog model PUBLIK tanpa key: https://apinex.bond/api/public/models
// (id, provider, ctx, $/1M, health; prefix "free/" = zero-cost).
// GLM default owner: free/glm-5.3-flash (zero-cost, verified live).
// Response OpenAI; GLM/deepseek/qwen punya reasoning_content — dipakai
// kalau content kosong. STRICT SATU RUTE (pola satuan owner): key kosong /
// saldo habis / model gak ada → error jelas, gak nyamber provider lain.

import { getProviderApiKey } from "../lib/apikey/ai-chain.js";

const NEXAI_CHAT_URL = "https://api.apinex.bond/v1/chat/completions";
const NEXAI_MODELS_URL = "https://apinex.bond/api/public/models";

// ── DEFAULT OWNER: glm → free/glm-5.3-flash (zero-cost, jalan tanpa saldo) ──
export const NEXAI_DEFAULT_MODEL = "free/glm-5.3-flash";

// alias singkat biar gampang diketik di .nexai model <nama>
export const NEXAI_MODEL_ALIAS = {
  glm: "free/glm-5.3-flash",
  "glm-free": "free/glm-5.3-flash",
  "glm-flash": "glm-5.3-flash",
  luna: "free/gpt-5.6-luna",
  gpt: "gpt-5.6-sol",
  qwen: "free/qwen-3.8-max",
  deepseek: "free/deepseek-v4-flash-0731",
  muse: "free/muse-spark-1.3",
  gemini: "free/gemini-3.8-flash",
  opus: "claude-opus-5",
  sonnet: "claude-sonnet-5",
  grok: "grok-4.6",
  kimi: "kimi-k3",
};

// ── KATALOG STATIK FALLBACK (live 12 Sep 2026 via /api/public/models) —
// dipakai kalau API katalog down, biar .nexai list tetep nampil ──
export const NEXAI_FALLBACK_MODELS = [
  { id: "free/glm-5.3-flash", provider: "Free", name: "GLM-5.3 Flash", contextWindow: "1M", dollarsPer1M: 0.75, health: "live", free: true },
  { id: "free/gpt-5.6-luna", provider: "Free", name: "GPT-5.6 Luna", contextWindow: "1M", dollarsPer1M: 0.75, health: "live", free: true },
  { id: "free/qwen-3.8-max", provider: "Free", name: "Qwen-3.8 Max", contextWindow: "1M", dollarsPer1M: 0.5, health: "live", free: true },
  { id: "free/deepseek-v4-flash-0731", provider: "Free", name: "DeepSeek V4 Flash", contextWindow: "1M", dollarsPer1M: 0.5, health: "live", free: true },
  { id: "free/muse-spark-1.3", provider: "Free", name: "Muse Spark 1.3", contextWindow: "1M", dollarsPer1M: 0.25, health: "partial", free: true },
  { id: "free/gemini-3.8-flash", provider: "Free", name: "Gemini 3.8 Flash", contextWindow: "1M", dollarsPer1M: 1, health: "partial", free: true },
  { id: "free/gemini-3.1-pro", provider: "Free", name: "Gemini 3.1 Pro", contextWindow: "1M", dollarsPer1M: 0.5, health: "partial", free: true },
  { id: "free/deepseek-v4-pro-0813", provider: "Free", name: "DeepSeek V4 Pro", contextWindow: "1M", dollarsPer1M: 0.5, health: "partial", free: true },
  { id: "free/deepseek-v4.1-flash", provider: "Free", name: "DeepSeek V4.1 Flash", contextWindow: "1M", dollarsPer1M: 0.5, health: "unavailable", free: true },
  { id: "glm-5.3", provider: "Zhipu", name: "GLM-5.3", contextWindow: "1M", dollarsPer1M: 0.15, health: "live", free: false },
  { id: "glm-5.3-flash", provider: "Zhipu", name: "GLM-5.3 Flash", contextWindow: "1M", dollarsPer1M: 0.05, health: "live", free: false },
  { id: "gpt-6-astra", provider: "OpenAI", name: "GPT-6 Astra", contextWindow: "1M", dollarsPer1M: 0.5, health: "live", free: false },
  { id: "gpt-5.6-sol", provider: "OpenAI", name: "GPT-5.6 Sol", contextWindow: "1M", dollarsPer1M: 0.25, health: "live", free: false },
  { id: "gpt-5.6-luna", provider: "OpenAI", name: "GPT-5.6 Luna", contextWindow: "1M", dollarsPer1M: 0.075, health: "live", free: false },
  { id: "gpt-5.6-terra", provider: "OpenAI", name: "GPT-5.6 Terra", contextWindow: "1M", dollarsPer1M: 0.175, health: "live", free: false },
  { id: "gemini-3.8-flash", provider: "Gemini", name: "Gemini 3.8 Flash", contextWindow: "1M", dollarsPer1M: 0.1, health: "live", free: false },
  { id: "gemini-3.1-pro", provider: "Gemini", name: "Gemini 3.1 Pro", contextWindow: "1M", dollarsPer1M: 0.15, health: "live", free: false },
  { id: "claude-opus-5", provider: "Anthropic", name: "Claude Opus 5", contextWindow: "1M", dollarsPer1M: 0.5, health: "live", free: false },
  { id: "claude-sonnet-5", provider: "Anthropic", name: "Claude Sonnet 5", contextWindow: "1M", dollarsPer1M: 0.4, health: "live", free: false },
  { id: "grok-4.6", provider: "xAI", name: "Grok 4.6", contextWindow: "500K", dollarsPer1M: 0.25, health: "live", free: false },
  { id: "kimi-k3", provider: "Moonshot", name: "Kimi K3", contextWindow: "1M", dollarsPer1M: 0.2, health: "partial", free: false },
  { id: "deepseek-v4-flash", provider: "DeepSeek", name: "DeepSeek V4 Flash", contextWindow: "1M", dollarsPer1M: 0.05, health: "unavailable", free: false },
  { id: "deepseek-v4-pro", provider: "DeepSeek", name: "DeepSeek V4 Pro", contextWindow: "1M", dollarsPer1M: 0.075, health: "unavailable", free: false },
];

// ── SEAM TRANSPORT (pola salaamai) — e2e inject mock, produksi fetch asli ──
let _http = null;
export function setNexaiHttp(fn) { _http = fn; }
export function resetNexaiHttp() { _http = null; }

async function realHttp(url, headers, body, timeoutMs) {
  return fetch(url, { method: body ? "POST" : "GET", headers, body, signal: AbortSignal.timeout(timeoutMs) });
}

// normalisasi id model: lowercase + resolve alias
export function normNexaiModel(raw) {
  const q = String(raw || "").trim().toLowerCase();
  if (!q) return "";
  return NEXAI_MODEL_ALIAS[q] || q;
}

/**
 * Ambil key NexAI (dibaca LIVE dari apikeys.json — edit tanpa restart).
 * @returns {string} key ("" = belum diset)
 */
export function getNexaiKey() {
  try { return String(getProviderApiKey("nexai") || "").trim(); }
  catch { return ""; }
}

/**
 * Katalog model APInex — LIVE dari endpoint publik (tanpa key), cache 10 menit.
 * Gagal fetch → fallback statik (live:false).
 * @returns {Promise<{ models: Array, live: boolean }>}
 */
let _modelsCache = { at: 0, data: null };
export function resetNexaiModelsCache() { _modelsCache = { at: 0, data: null }; }
export async function nexaiModels({ timeoutMs = 15000 } = {}) {
  const now = Date.now();
  if (_modelsCache.data && now - _modelsCache.at < 10 * 60 * 1000) {
    return _modelsCache.data;
  }
  const http = _http || realHttp;
  try {
    const res = await http(NEXAI_MODELS_URL, { Accept: "application/json" }, null, timeoutMs);
    if (res.status === 200) {
      const data = await res.json();
      const raw = Array.isArray(data?.models) ? data.models : [];
      const models = raw.map((m) => ({
        id: String(m.id || ""),
        provider: String(m.provider || ""),
        name: String(m.name || m.id || ""),
        contextWindow: String(m.contextWindow || "—"),
        dollarsPer1M: Number(m.dollarsPer1M ?? 0),
        health: String(m.health || "unknown"),
        free: String(m.id || "").startsWith("free/") || String(m.provider || "").toLowerCase() === "free",
      })).filter((m) => m.id);
      if (models.length) {
        const out = { models, live: true };
        _modelsCache = { at: now, data: out };
        return out;
      }
    }
  } catch {}
  return { models: NEXAI_FALLBACK_MODELS, live: false };
}

/**
 * Chat NexAI (apinex.bond, OpenAI-compatible).
 * @param {string} prompt — pertanyaan user
 * @param {object} opts — { model (default free/glm-5.3-flash), systemPrompt,
 *   timeoutMs (default 35s — selaras budget rantai otak) }
 * @returns {Promise<string>} balasan AI
 */
export async function nexaiChat(prompt, opts = {}) {
  const text = String(prompt || "").trim();
  if (!text) throw new Error("Pertanyaan kosong — ketik pesannya setelah .nexai");

  const key = getNexaiKey();
  if (!key) throw new Error("key NexAI belum diset — isi aiMultiprovider.providers.nexai.apikey di apikeys.json (daftar di apinex.bond/register)");

  const model = normNexaiModel(opts.model) || NEXAI_DEFAULT_MODEL;
  const messages = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: String(opts.systemPrompt) });
  messages.push({ role: "user", content: text });

  const http = _http || realHttp;
  let res;
  try {
    res = await http(
      NEXAI_CHAT_URL,
      { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      JSON.stringify({ model, messages }),
      opts.timeoutMs || 35000
    );
  } catch (e) {
    throw new Error(`API NexAI gak kebuka: ${e.message}`);
  }

  let data;
  try { data = await res.json(); }
  catch { throw new Error(`API NexAI balas HTTP ${res.status} (bukan JSON)`); }

  // error API — diterjemahin biar user tau harus gimana
  if (data?.error) {
    const msg = String(data.error.message || "");
    if (data.error.type === "billing_error" || /insufficient balance/i.test(msg)) {
      throw new Error(`saldo APInex kosong buat model ${model} — pakai model free (contoh: .nexai model free/glm-5.3-flash) atau top-up apinex.bond`);
    }
    if (data.error.type === "not_found_error" || /not found/i.test(msg)) {
      throw new Error(`model "${model}" gak ada di APInex — ketik .nexai list buat daftar model`);
    }
    throw new Error(msg || "API NexAI nolak request");
  }

  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  // GLM/deepseek/qwen kadang content kosong tapi reasoning_content isi
  const reply = String(content || choice?.message?.reasoning_content || "").trim();
  if (!reply) throw new Error("NexAI balas kosong — coba lagi / ganti model (.nexai list)");

  return reply;
}
