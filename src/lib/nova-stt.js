// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/nova-stt.js — Speech-to-Text (STT) shared helper
// Pipeline: Inworld STT-1 (utama, owner 29 Sep) → Gemini multimodal → OpenAI Whisper → Groq Whisper → null
// Dipakai oleh: nova-auto-ai.js (fitur .autoai — respon VN), dst.

import config from "../../config.js";
import { getApiKey } from "./nova-api-keys.js";

/**
 * Transkripsi buffer audio (VN WhatsApp) jadi teks.
 * @param {Buffer} buffer - buffer audio mentah (ogg/opus dari WA)
 * @param {string} mimeType - mimetype audio, default "audio/ogg; codecs=opus"
 * @returns {Promise<string|null>} teks transkripsi, atau null kalau semua pipeline gagal
 */
// 🔹 SEAM E2E (owner 29 Sep: Inworld STT jadi pipeline utama): undefined =
// asli (coba Inworld beneran kalau ada key); null = simulate Inworld down;
// function = mock(buffer, mime) → transcript string.
let _inworldSttImpl;
export function _setInworldSttForTest(fn) { _inworldSttImpl = fn; }

export async function transcribeAudio(buffer, mimeType) {
  if (!buffer || buffer.length < 500) return null;
  const mime = mimeType || "audio/ogg; codecs=opus";
  const geminiKey = String(config.aiHelp?.geminiApiKey || "");
  const openaiKey = getApiKey("aiFallback") || getApiKey("openai");

  // 0) INWORLD STT (owner 29 Sep 2026: "stt generate buatan dr ai inworld ai")
  // — pipeline UTAMA: inworld-stt-1 + voice profile. Kalau down/tanpa key →
  // fallback ke pipeline lama (Gemini → OpenAI → Groq), gak ada yang berubah.
  if (_inworldSttImpl !== undefined) {
    if (_inworldSttImpl !== null) {
      try {
        const t = await _inworldSttImpl(buffer, mime);
        if (t && t.trim().length > 1) return t.trim();
      } catch {}
    }
    // null/throw = simulate down → lanjut pipeline lama
  } else {
    try {
      const { getInworldKey, inworldTranscribe } = await import("./nova-inworld.js");
      if (getInworldKey()) {
        const r = await inworldTranscribe({
          audioB64: buffer.toString("base64"),
          encoding: "OGG_OPUS", // VN WhatsApp = ogg opus
          language: "id",
        });
        const t = r?.transcript;
        if (t && t.trim().length > 1) return t.trim();
      }
    } catch (e) {
      console.log("[STT] Inworld gagal (" + (e?.message || e) + ") — fallback ke pipeline lama");
    }
  }

  // 1) Gemini multimodal — gratis & cepat kalau key diset
  if (geminiKey) {
    try {
      const base64 = buffer.toString("base64");
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { data: base64, mimeType: mime } },
                { text: "Transkripsi audio ini ke teks. Berikan HANYA teks hasil transkripsi, tanpa penjelasan." },
              ],
            }],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 1) return text.trim();
      }
    } catch (e) {
      console.error("[STT] Gemini error:", e.message);
    }
  }

  // 2) OpenAI Whisper fallback
  if (openaiKey) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], { type: mime }), "voice.ogg");
      formData.append("model", "whisper-1");
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + openaiKey },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim().length > 1) return data.text.trim();
      }
    } catch (e) {
      console.error("[STT] Whisper error:", e.message);
    }
  }

  // 3) Groq Whisper (whisper-large-v3) — free tier, cepat, format API kompatibel OpenAI
  let groqKey = "";
  try {
    const { getProviderApiKey } = await import("./apikey/ai-chain.js");
    groqKey = getProviderApiKey("groq") || "";
  } catch {}
  if (!groqKey) groqKey = getApiKey("groqkey") || getApiKey("groq");
  if (groqKey) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], { type: mime }), "voice.ogg");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "id");
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + groqKey },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim().length > 1) return data.text.trim();
      }
    } catch (e) {
      console.error("[STT] Groq Whisper error:", e.message);
    }
  }

  return null;
}
