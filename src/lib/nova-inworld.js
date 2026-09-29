// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-inworld.js — ENGINE Inworld AI (platform.inworld.ai)
// Diverifikasi live 29 Sep 2026 pakai key owner. Endpoint yang jalan:
//   TTS   : POST https://api.inworld.ai/tts/v1/voice → {audioContent: base64}
//           body camelCase {text, voiceId | voiceDesign.designPrompt, modelId,
//           audioConfig:{audioEncoding: MP3|LINEAR16|...}}
//   VOICES: GET  https://api.inworld.ai/tts/v1/voices?pageSize=300 → {voices:[…]}
//           fields: voiceId, displayName, description, languages, tags, isCustom
//   STT   : POST https://api.inworld.ai/stt/v1/transcribe → {transcription:{…}}
//           body {transcribeConfig:{modelId, language, audioEncoding,
//           voiceProfileConfig:{enableVoiceProfile}}, audioData:{content: b64}}
//   CHAT  : POST https://api.inworld.ai/v1/chat/completions (OpenAI-compatible)
//           model langsung format "provider/model" (mis. openai/gpt-5.4-nano).
//           Router contoh "inworld/compare-frontier-models" butuh router dibuat
//           + billing aktif — model langsung jalan tanpa itu.
// GOTCHA KEY: key Inworld = base64(keyId:secret). Secret-detector/env kadang
// motong padding "==" di ujung → server nolak "Invalid authorization
// credentials" (code 7). normalizeKey() pulihin padding otomatis bila len%4==2.
// Auth: header "Authorization: Basic <key>" — key dikirim as-is, JANGAN
// di-base64 lagi.

import { getApiKey } from "./nova-api-keys.js";

const BASE = "https://api.inworld.ai";
const TTS_MODEL = "inworld-tts-2"; // flagship: 200+ bahasa, steering natural-language
const STT_MODEL = "inworld/inworld-stt-1";
const CHAT_MODEL = "openai/gpt-5.4-nano"; // diverifikasi live, murah & cepat

// ── seam buat e2e (inject http fn) ──
let _http = null;
export function _setInworldHttpForTest(fn) { _http = fn; }
async function http(path, { method = "GET", key, body, timeoutMs = 60000 } = {}) {
  if (_http) return _http(path, { method, key, body, timeoutMs });
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Basic ${key}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, json, text };
}

// ── key: ambil dari registry (.setkey inworld) + pulihin padding ──
export function normalizeKey(k) {
  let key = String(k || "").trim().replace(/^Basic\s+/i, "");
  // padding base64 kepotong (mis. secret-detector nyeret "==" sebagai markdown bold)
  if (key.length % 4 === 2) key += "==";
  else if (key.length % 4 === 3) key += "=";
  return key;
}
export function getInworldKey() {
  const raw = getApiKey("inworld") || process.env.INWORLD_API_KEY || "";
  return raw ? normalizeKey(raw) : "";
}

// ── error humanize ──
function humanize(status, json, text) {
  const msg = json?.message || json?.error?.message || String(text || "").slice(0, 120);
  if (status === 401 || json?.code === 7) return "API key Inworld-nya gak valid/kedaluwarsa — set ulang: .setkey inworld <key>";
  if (status === 402 || /billing|plan|credits/i.test(String(msg))) return "Akun Inworld kurang kredit/billing — topup di platform.inworld.ai";
  if (status === 429) return "Inworld lagi rate-limit — tunggu bentar terus coba lagi";
  return `Inworld error (HTTP ${status}): ${msg || "unknown"}`;
}

// ── TTS: teks → audio buffer ──
// opts: { text, voiceId?, designPrompt?, encoding?, sampleRate? }
// voiceId & designPrompt mutually exclusive (server nolak dua-duanya).
export async function inworldSynthesize(opts = {}) {
  const key = getInworldKey();
  if (!key) throw new Error("Key Inworld belum di-set — .setkey inworld <key>");
  const text = String(opts.text || "").trim();
  if (!text) throw new Error("Teksnya kosong");
  if (text.length > 2000) throw new Error("Teks kepanjangan (maks 2.000 karakter untuk mode non-streaming)");
  const body = {
    text,
    modelId: TTS_MODEL,
    audioConfig: { audioEncoding: opts.encoding || "MP3" },
  };
  if (opts.designPrompt) body.voiceDesign = { designPrompt: String(opts.designPrompt).trim() };
  else body.voiceId = String(opts.voiceId || "").trim();
  if (!body.voiceId && !body.voiceDesign?.designPrompt) throw new Error("voiceId / designPrompt salah satu wajib");
  const r = await http("/tts/v1/voice", { method: "POST", key, body });
  if (!r.ok || !r.json?.audioContent) throw new Error(humanize(r.status, r.json, r.text));
  const buf = Buffer.from(r.json.audioContent, "base64");
  if (!buf.length) throw new Error("Inworld balikin audio kosong");
  return { buffer: buf, encoding: body.audioConfig.audioEncoding };
}

// ── katalog voice (cache 1 jam) ──
let _voiceCache = { at: 0, list: [] };
export function _resetVoiceCacheForTest() { _voiceCache = { at: 0, list: [] }; }
export async function inworldListVoices({ pageSize = 300, force = false } = {}) {
  const key = getInworldKey();
  if (!key) throw new Error("Key Inworld belum di-set — .setkey inworld <key>");
  if (!force && _voiceCache.list.length && Date.now() - _voiceCache.at < 3600_000) return _voiceCache.list;
  const r = await http(`/tts/v1/voices?pageSize=${pageSize}`, { key });
  if (!r.ok || !Array.isArray(r.json?.voices)) throw new Error(humanize(r.status, r.json, r.text));
  _voiceCache = { at: Date.now(), list: r.json.voices };
  return r.json.voices;
}

// default voice: voice CUSTOM workspace bernama "Aizat" (buatan owner —
// diminta 29 Sep: "aku mau suara inworld yg nama aizat itu") > custom LAIN
// > katalog (TTS-2 cross-lingual — voice en tetap ngomong Indonesia bagus).
let _lastVoice = { id: "", name: "" };
export function getLastInworldVoice() { return _lastVoice; }
const PREFERRED_VOICE_NAME = /aizat/i; // nama voice custom owner
export async function resolveDefaultVoice() {
  try {
    const voices = await inworldListVoices();
    const customs = voices.filter(v => v.isCustom && v.voiceId);
    // 1) voice custom bernama "Aizat" duluan (permintaan owner 29 Sep)
    // 2) voice custom lain 3) katalog bebas
    const picked =
      customs.find(v => PREFERRED_VOICE_NAME.test(String(v.displayName || ""))) ||
      customs[0] ||
      voices.find(v => v.voiceId) ||
      null;
    if (picked) {
      _lastVoice = { id: picked.voiceId, name: String(picked.displayName || picked.voiceId) };
      return picked.voiceId;
    }
    return "Daniel";
  } catch { return "Daniel"; }
}

// ── STT: audio (vn) → transcript + profil suara ──
// opts: { audioB64, encoding, language }
export async function inworldTranscribe(opts = {}) {
  const key = getInworldKey();
  if (!key) throw new Error("Key Inworld belum di-set — .setkey inworld <key>");
  if (!opts.audioB64) throw new Error("Audio-nya kosong");
  const body = {
    transcribeConfig: {
      modelId: STT_MODEL,
      language: opts.language || "id",
      audioEncoding: opts.encoding || "OGG_OPUS", // VN WhatsApp = ogg opus
      voiceProfileConfig: { enableVoiceProfile: true },
    },
    audioData: { content: opts.audioB64 },
  };
  const r = await http("/stt/v1/transcribe", { method: "POST", key, body });
  if (!r.ok || !r.json?.transcription) throw new Error(humanize(r.status, r.json, r.text));
  const t = r.json.transcription;
  // profil suara: ambil label confidence tertinggi per kategori
  const pickTop = (arr) => Array.isArray(arr) && arr.length
    ? arr.slice().sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]?.label
    : null;
  return {
    transcript: String(t.transcript || "").trim(),
    profile: {
      gender: pickTop(t.voiceProfile?.gender),
      age: pickTop(t.voiceProfile?.age),
      emotion: pickTop(t.voiceProfile?.emotion),
      accent: pickTop(t.voiceProfile?.accent),
    },
  };
}

// ── LLM chat (OpenAI-compatible, model langsung) ──
// opts: { model?, messages: [{role, content}] }
export async function inworldChat(opts = {}) {
  const key = getInworldKey();
  if (!key) throw new Error("Key Inworld belum di-set — .setkey inworld <key>");
  const messages = Array.isArray(opts.messages) && opts.messages.length ? opts.messages : null;
  if (!messages) throw new Error("Pesan kosong");
  const body = {
    model: opts.model || CHAT_MODEL,
    messages,
  };
  const r = await http("/v1/chat/completions", { method: "POST", key, body, timeoutMs: 90000 });
  if (!r.ok) throw new Error(humanize(r.status, r.json, r.text));
  const content = r.json?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) throw new Error("Inworld chat balikin jawaban kosong");
  return { content: String(content).trim(), model: body.model };
}
