// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/apikey/ai-chain.js — KONFIG MULTI-PROVIDER AI (single source of truth)
// File config: src/lib/apikey/ai-providers.json (list provider kebawah).
//   - "chain"  : urutan prioritas rantai (.novaai/.autonovaai/autoflow aichat)
//   - "providers": key tiap AI — owner TINGGAL ISI "apikey"-nya doang.
//     apikey kosong = di-skip otomatis dari rantai (bukan error).
//   - Provider free/source-ikyy udah preset key "kyzz" — gak perlu diisi,
//     tanpa ambil config dr apikeys.json, langsung nembak API-nya.
//   - Fitur AI SATUAN (.grok, .openai, .deepseek, .gemini ikyy, dll) ambil
//     key dari sini juga via getProviderApiKey().
// File dibaca LIVE tiap pemanggilan — edit tanpa restart bot, langsung aktif.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFG_FILE = path.join(__dirname, "ai-providers.json");
const LEGACY_KEYS_FILE = path.join(__dirname, "apikeys.json");

let _cache = null;
let _cacheMtime = 0;

function readConfig() {
  try {
    const mtime = fs.statSync(CFG_FILE).mtimeMs;
    if (_cache && mtime === _cacheMtime) return _cache;
    _cache = JSON.parse(fs.readFileSync(CFG_FILE, "utf8"));
    _cacheMtime = mtime;
    return _cache;
  } catch {
    return { chain: [], providers: {} };
  }
}

function readLegacyKeys() {
  try { return JSON.parse(fs.readFileSync(LEGACY_KEYS_FILE, "utf8")); } catch { return {}; }
}

// fallback key lama biar key yang UDAH ada di apikeys.json / env tetep kepake
// walau slot apikey di ai-providers.json kosong (backward compatible).
const LEGACY_SLOTS = {
  groq: { slot: "groqkey", env: "GROQ_KEY" },
  openai: { slot: "openai", env: "OPENAI_KEY" },
  deepseek: { slot: "deepseekkey", env: "DEEPSEEK_KEY" },
  zhipu: { slot: "zhipu", env: "ZHIPU_KEY" },
  kimi: { slot: "kimi", env: "MOONSHOT_KEY" },
  claude: { slot: "claude", env: "ANTHROPIC_KEY" },
  anthropic: { slot: "claude", env: "ANTHROPIC_KEY" },
  grok: { slot: "xai", env: "XAI_KEY" },
  xai: { slot: "xai", env: "XAI_KEY" },
  gemini: { slot: "google", env: "" }, // Google Gemini direct (bukan ikyy)
};

/**
 * Ambil API key provider AI — urutan: ai-providers.json → ikyy shared →
 * legacy apikeys.json/env. Provider free tanpa key → "" (pemanggil nemah langsung).
 * @param {string} name - nama provider (groq, openai, ikyy_gpt5mini, grok, dll)
 * @returns {string} apikey ("" = gak ada / gak butuh)
 */
export function getProviderApiKey(name) {
  if (!name) return "";
  const cfg = readConfig();
  const entry = cfg.providers?.[name];
  const direct = String(entry?.apikey ?? "").trim();
  if (direct) return direct;

  // keluarga ikyy (ikyy_gemini, ikyy_gpt5mini, ikyy_*) → shared key ikyy
  if (name.startsWith("ikyy")) {
    const shared = String(cfg.providers?.ikyy_gemini?.apikey ?? "").trim();
    if (shared) return shared;
    return String(readLegacyKeys().ikyyxd ?? "").trim() || "kyzz";
  }

  const legacy = LEGACY_SLOTS[name];
  if (legacy) {
    const fromSlot = String(readLegacyKeys()[legacy.slot] ?? "").trim();
    if (fromSlot) return fromSlot;
    if (legacy.env && process.env[legacy.env]) return process.env[legacy.env];
  }
  return "";
}

/**
 * Bangun rantai provider buat otak AI (askAI di aiagent.js).
 * Urutan = urunan array "chain" di ai-providers.json — paling atas paling
 * sering dipakai; kalau down/expired → otomatis geser ke bawah.
 * Entry kosong apikey & bukan free → di-skip.
 */
export function getAiChain() {
  const cfg = readConfig();
  const providers = cfg.providers || {};
  const order = Array.isArray(cfg.chain) ? cfg.chain : [];

  const out = [];
  for (const name of order) {
    const e = providers[name];
    if (!e?.url) continue;
    const method = e.method || "post";
    const format = e.format || "openai";
    const free = !!e.free; // true = gak butuh apikey, langsung nembak API
    const headers = buildHeaders(method, format);
    out.push({
      name,
      method,
      format,
      textParam: e.textParam || "text",
      url: e.url,
      model: e.model || "",
      free,
      key: () => getProviderApiKey(name),
      headers,
    });
  }
  return out;
}

function buildHeaders(method, format) {
  if (method === "get") return () => ({ "Content-Type": "application/json" });
  if (format === "anthropic") {
    return (k) => ({
      "Content-Type": "application/json",
      "x-api-key": k,
      "anthropic-version": "2023-06-01",
    });
  }
  return (k) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${k}`,
  });
}

export { readConfig as readAiProvidersConfig };
