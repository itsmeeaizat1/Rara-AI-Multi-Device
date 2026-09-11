// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/nova-stt.js — Speech-to-Text (STT) shared helper
// Pipeline: Gemini multimodal (kalau ada key) → OpenAI Whisper → Groq Whisper (whisper-large-v3) → null
// Dipakai oleh: nova-auto-ai.js (fitur .autoai — respon VN), dst.

import config from "../../config.js";
import { getApiKey } from "./nova-api-keys.js";

/**
 * Transkripsi buffer audio (VN WhatsApp) jadi teks.
 * @param {Buffer} buffer - buffer audio mentah (ogg/opus dari WA)
 * @param {string} mimeType - mimetype audio, default "audio/ogg; codecs=opus"
 * @returns {Promise<string|null>} teks transkripsi, atau null kalau semua pipeline gagal
 */
export async function transcribeAudio(buffer, mimeType) {
  if (!buffer || buffer.length < 500) return null;
  const mime = mimeType || "audio/ogg; codecs=opus";
  const geminiKey = String(config.aiHelp?.geminiApiKey || "");
  const openaiKey = getApiKey("aiFallback") || getApiKey("openai");

  // 1) Gemini multimodal — gratis & cepat kalau key diset
  if (geminiKey) {
    try {
      const base64 = buffer.toString("base64");
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
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
