// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// router9v2.js — 9ROUTER V2 CLOUD (hosted 9router, 17 Sep 2026)
// API gateway OpenAI-compatible: https://9router.cloudku.us.kg
//   POST /v1/chat/completions  (chat — model prefix "ag/...")
//   GET  /v1/models            (daftar model)
// Key: pusat apikeys.json (providers.router9v2) → env ROUTER_API_KEY.
//
// GOTCHA LIVE (ditemukan pas probe 17 Sep): SEBAGIAN model balas
// SSE stream ("data: {...chunk}") WALAU request kirim stream:false —
// jadi parser WAJIB tangani DUA format: JSON object ATAU SSE text.
// Gemini family patuh stream:false (JSON polos), Claude dsb. kebal.
// ============================================================
import axios from "axios";
import fs from "node:fs";
import { dirname } from "node:path";
import { getApiKey } from "../lib/nova-api-keys.js";

export const ROUTER9V2_BASE = process.env.ROUTER9V2_URL || "https://9router.cloudku.us.kg";
export const ROUTER9V2_DEFAULT_MODEL = "ag/gemini-3.8-flash-high";

// ── seams buat e2e offline ──
const __r9 = {};
// GOTCHA: http seam WAJIB assignment langsung — Object.assign(target, fn)
// gak nyalin apa-apa (property function gak enumerable) → mock gak pernah
// aktif + e2e nyamber axios asli senyap.
export function _setRouter9v2HttpForTest(fn) { __r9.http = fn; }
export function _setRouter9v2KeyForTest(k) { __r9.key = k; }
export function _resetRouter9v2ForTest() { for (const k of Object.keys(__r9)) delete __r9[k]; }

// ── key: seam > pusat apikeys.json > env ──
export function router9v2Key() {
  if (__r9.key !== undefined) return __r9.key;
  return getApiKey("router9v2") || process.env.ROUTER_API_KEY || "";
}

// ── parse SSE → teks gabungan (fallback server yang ngotot stream) ──
function parseSse(raw) {
  const out = [];
  for (const line of String(raw).split("\n")) {
    const s = line.trim();
    if (!s.startsWith("data:")) continue;
    const body = s.slice(5).trim();
    if (!body || body === "[DONE]") continue;
    try {
      const j = JSON.parse(body);
      const delta = j?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) out.push(delta);
    } catch { /* chunk rusak → skip, jangan bikin total gagal */ }
  }
  return out.join("");
}

// ── daftar model ──
export async function router9v2Models() {
  const key = router9v2Key();
  if (!key) throw new Error("key 9router v2 kosong — isi di apikeys.json (providers.router9v2) atau env ROUTER_API_KEY");
  const http = __r9.http || ((cfg) => axios(cfg));
  let res;
  try {
    res = await http({
      method: "GET",
      url: ROUTER9V2_BASE + "/v1/models",
      headers: { Authorization: "Bearer " + key },
      timeout: 25000,
      validateStatus: null,
    });
  } catch (e) {
    throw new Error("9router v2 models gagal: " + (e?.message || e));
  }
  const status = res?.status ?? res?.response?.status ?? 0;
  const data = res?.data ?? res?.response?.data;
  if (status !== 200) {
    throw new Error(`9router v2 models HTTP ${status}: ${String(typeof data === "string" ? data.slice(0, 120) : JSON.stringify(data || "")).slice(0, 160)}`);
  }
  const ids = (Array.isArray(data?.data) ? data.data : []).map((m) => m?.id).filter(Boolean);
  if (!ids.length) throw new Error("daftar model kosong / format tak terduga");
  return { models: ids, total: ids.length };
}

// ── chat completions — auto-detect JSON vs SSE ──
export async function router9v2Chat({ messages, model, maxTokens = 4096, temperature }) {
  const key = router9v2Key();
  if (!key) throw new Error("key 9router v2 kosong — isi di apikeys.json (providers.router9v2) atau env ROUTER_API_KEY");
  if (!Array.isArray(messages) || !messages.length) throw new Error("messages kosong");
  const http = __r9.http || ((cfg) => axios(cfg));
  const t0 = Date.now();
  let res;
  try {
    res = await http({
      method: "POST",
      url: ROUTER9V2_BASE + "/v1/chat/completions",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      data: {
        model: model || ROUTER9V2_DEFAULT_MODEL,
        messages,
        max_tokens: maxTokens,
        ...(temperature != null ? { temperature } : {}),
        stream: false,
      },
      timeout: 90000,
      validateStatus: null,
    });
  } catch (e) {
    if (e?.code === "ECONNABORTED") throw new Error("9router v2 timeout (90 dtk) — coba lagi / model lain");
    throw new Error("9router v2 gagal: " + (e?.message || e));
  }
  const status = res?.status ?? res?.response?.status ?? 0;
  const data = res?.data ?? res?.response?.data;
  if (status !== 200) {
    throw new Error(`9router v2 HTTP ${status}: ${String(typeof data === "string" ? data.slice(0, 140) : JSON.stringify(data || "")).slice(0, 180)}`);
  }
  // JSON polos → ambil message.content; SSE text → gabung delta
  let text = "";
  let usage = null;
  let usedModel = model || ROUTER9V2_DEFAULT_MODEL;
  if (typeof data === "string") {
    text = parseSse(data);
  } else if (data && typeof data === "object") {
    text = String(data?.choices?.[0]?.message?.content || "");
    usage = data?.usage || null;
    if (data?.model) usedModel = data.model;
  }
  if (!text.trim()) throw new Error("9router v2 balas kosong — coba lagi / model lain (.ai9v2 list)");
  return { text: text.trim(), model: usedModel, latencyMs: Date.now() - t0, usage };
}

// ── preferensi model per chat (persist ke file state kecil) ──
let __stateFile = "./src/data/router9v2.json";
export function _setRouter9v2StateFileForTest(p) { __stateFile = p; }
function loadState() {
  try { return JSON.parse(fs.readFileSync(__stateFile, "utf8")); } catch { return {}; }
}
function saveState(st) {
  try { fs.mkdirSync(dirname(__stateFile), { recursive: true }); } catch {}
  fs.writeFileSync(__stateFile, JSON.stringify(st, null, 2));
}
export function getRouter9v2Pref(chat) {
  return loadState()[chat] || null;
}
export function setRouter9v2Pref(chat, model) {
  const st = loadState();
  st[chat] = model;
  saveState(st);
  return model;
}
