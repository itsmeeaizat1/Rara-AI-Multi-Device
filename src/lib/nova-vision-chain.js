// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-vision-chain.js — RANTAI SCAN GAMBAR (vision) TANPA-WAYAR-KEY
// Dipakai .vision + .aichatimg + fitur vision lain.
//
// Rantai:
//   0. Gemini Vision (key .setkey gemini / apikeys.json) — jawab langsung
//      pake model vision asli. Key kosong/expired → skip otomatis.
//   1. DESCRIBE + LLM (TANPA KEY, live verified 8 Sep 2026):
//      imageprompt.org deskripsi detail gambar (gratis, akurat — baca teks,
//      warna, posisi, gaya) → deskripsi dijadiin konteks buat LLM
//      (Mercury dLLM duluan — super cepat, fallback Haidar/Ikyy/Xemoz)
//      buat jawab pertanyaan user dalam bahasa Indonesia.
//
// Kenapa chain ini: Mercury/Inception TIDAK support input gambar (text-only,
// docs.inceptionlabs.ai — input_modalities: text). Jadi vision digabungin:
// describe-model baca gambar, Mercury nyusun jawaban. Key Gemini valid →
// jalur 0 lebih presisi (bisa jawab pertanyaan spesifik langsung).

import { GeminiVision } from "../scraper/geminiVision.js";
import { viaMercury, aiFallbackChat } from "./nova-ai-fallback.js";

// ── MIME detection dari buffer (sama pattern geminiVision.js) ──
function detectMime(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 12) return "image/png";
  const b64Head = buf.subarray(0, 8).toString("base64");
  if (b64Head.startsWith("/9j/")) return "image/jpeg";
  if (b64Head.startsWith("iVBOR")) return "image/png";
  if (b64Head.startsWith("UklGR")) return "image/webp";
  if (b64Head.startsWith("R0lGO")) return "image/gif";
  return "image/png";
}

/**
 * Deskripsi detail gambar via imageprompt.org (gratis, tanpa key, live verified).
 * Return string deskripsi bahasa Inggris yang kaya detail
 * (teks terbaca, warna, komposisi, gaya, objek).
 */
export async function describeImage(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error("buffer gambar kosong");
  const mime = detectMime(imageBuffer);
  const res = await fetch("https://imageprompt.org/api/ai/prompts/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
      Origin: "https://imageprompt.org",
      Referer: "https://imageprompt.org/image-to-prompt",
    },
    body: JSON.stringify({
      base64Url: `data:${mime};base64,${imageBuffer.toString("base64")}`,
      imageModelId: 0,
      language: "en",
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`imageprompt HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const desc = typeof data?.prompt === "string" ? data.prompt.trim() : "";
  if (!desc) throw new Error("deskripsi kosong");
  return desc;
}

/**
 * Rantai scan gambar lengkap.
 * @param {Object} opts
 * @param {Buffer} opts.imageBuffer - buffer gambar (jpg/png/webp)
 * @param {string} opts.question - pertanyaan user tentang gambar
 * @param {string} [opts.instruction] - instruksi system tambahan
 * @param {string} [opts.sessionKey] - key sesi obrolan (optional, utk describe+LLM)
 * @returns {Object} { status, text, engine, model }
 */
export async function visionScan({ imageBuffer, question, instruction = "", sessionKey }) {
  const q = (question || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.").trim();

  // ── 0. Gemini Vision — jalur paling presisi (butuh key valid) ──
  try {
    const g = await GeminiVision({
      imageBuffer,
      prompt: q,
      instruction: instruction || "Kamu adalah asisten AI vision yang ahli. Analisis gambar dengan detail dan akurat. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.",
    });
    if (g?.status && g?.text) return { status: true, text: g.text, engine: "gemini-vision", model: g.model };
  } catch {}

  // ── 1. Describe + LLM (tanpa key) — describe-model baca gambar ──
  const desc = await describeImage(imageBuffer);
  const sys = (instruction ? instruction + "\n\n" : "") +
    "Kamu adalah asisten AI vision. Kamu belum melihat gambarnya langsung, tapi dapet hasil analisis detail dari model vision khusus deskripsi gambar di bawah. Jawab pertanyaan user berdasarkan deskripsi itu, dalam bahasa Indonesia, singkat dan natural. Kalau deskripsi gak cukup buat jawab pertanyaan spesifik, jawab apa yang bisa dijawab dan jujur soal keterbatasannya. JANGAN bilang kamu gak lihat gambar — langsung jawab dari analisis yang ada.";

  let answer = "";
  const fullPrompt = `${sys}\n\n[HASIL ANALISIS GAMBAR]:\n${desc}\n\n[PERTANYAAN USER]: ${q}`;

  // Mercury duluan — dLLM difusi super cepat
  try {
    answer = await viaMercury(fullPrompt);
  } catch {
    // fallback rantai multi-API (dengan sesi kalau ada)
    answer = await aiFallbackChat(fullPrompt, {
      persona: "asisten AI vision Nova",
      model: "gemini",
      sessionKey,
    });
  }
  answer = (answer || "").trim();
  if (!answer) throw new Error("jawaban LLM kosong");
  return { status: true, text: answer, engine: "describe+mercury", model: "imageprompt.org + mercury-2" };
}
