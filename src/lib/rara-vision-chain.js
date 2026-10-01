// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-vision-chain.js — RANTAI SCAN GAMBAR (vision) TANPA-WAYAR-KEY
// Dipakai .vision + .aichatimg + fitur vision lain.
//
// Rantai:
//   0. Qwen Vision (1min.ai qwen3-vl-8b-thinking, FREE, key owner valid) —
//      UTAMA (aturan owner 17 Sep: vision qwen dipakai duluan, ASLI Qwen).
//   0.4 Gemini (Google) Vision (key .setkey gemini / apikeys.json) —
//      FALLBACK otomatis kalau Qwen down. Key kosong/expired → skip.
//   1. DESCRIBE + LLM (TANPA KEY, live verified 8 Sep 2026):
//      imageprompt.org deskripsi detail gambar (gratis, akurat — baca teks,
//      warna, posisi, gaya) → deskripsi dijadiin konteks buat LLM
//      (Mercury dLLM duluan — super cepat, fallback Haidar/Ikyy/Xemoz)
//      buat jawab pertanyaan user dalam bahasa Indonesia.
//
// Kenapa chain ini: jalur 0.5 SenseNova = vision MULTIMODAL ASLI (baca gambar
// langsung). Mercury/Inception TIDAK support input gambar (text-only,
// docs.inceptionlabs.ai — input_modalities: text). Jadi vision digabungin:
// describe-model baca gambar, Mercury nyusun jawaban. Key Gemini valid →
// jalur 0 lebih presisi (bisa jawab pertanyaan spesifik langsung).

import { GeminiVision } from "../scraper/geminiVision.js";
import { min1aiVision } from "../scraper/min1ai.js";
import { viaMercury, aiChainChat } from "./rara-ai-fallback.js";

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
  // 🔹 FIX 17 Sep 2026: catat error TIAP engine — kalau semuanya gagal, error
  // yang muncul nyebut engine + penyebab persis (bukan "coba lagi" buta),
  // jadi keluhan owner langsung kelihatan akarnya dari pesan error bot.
  const fails = [];
  const note = (engine, e) => fails.push(`${engine}: ${e?.message || e || "gagal"}`);

  // ── 0. QWEN VISION (1min.ai qwen3-vl-8b-thinking, FREE) — UTAMA.
  // Request owner 17 Sep: "utama klo qwen pakai qwen vision aja, klo qwen
  // down otomatis ke google vision" — Qwen vision JADI JALUR PERTAMA,
  // Gemini/Google vision cuma fallback kalau Qwen down. Provider sama
  // dengan otak agent (min1ai, key owner valid, live verified baca foto).
  try {
    // (nama variabel beda dari q — jangan shadow const q di atas)
    const qv = await min1aiVision(imageBuffer, (instruction ? instruction + "\n\n" : "") + q);
    if (qv?.status && qv?.text) return { status: true, text: qv.text, engine: "qwen-vision", model: qv.model };
    note("qwen-vision", "jawaban kosong");
  } catch (e) { note("qwen-vision", e); }

  // ── 0.4 Gemini (Google) Vision — FALLBACK kalau Qwen down (aturan owner
  // 17 Sep: qwen down → otomatis ke google vision).
  try {
    const g = await GeminiVision({
      imageBuffer,
      prompt: q,
      instruction: instruction || "Kamu adalah asisten AI vision yang ahli. Analisis gambar dengan detail dan akurat. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.",
    });
    if (g?.status && g?.text) return { status: true, text: g.text, engine: "gemini-vision", model: g.model };
    note("gemini-vision", "jawaban kosong");
  } catch (e) { note("gemini-vision", e); }

  // ── 0.5 SenseNova vision — MULTIMODAL ASLI (SenseTime, key owner, gratis) ──
  try {
    const { sensenovaVision } = await import("../scraper/sensenova.js");
    const sv = await sensenovaVision({ imageBuffer, question: q, instruction });
    if (sv?.status && sv?.text) return { status: true, text: sv.text, engine: "sensenova-vision", model: sv.model };
    note("sensenova-vision", "jawaban kosong");
  } catch (e) { note("sensenova-vision", e); }

  // ── 1. Describe + LLM (tanpa key) — describe-model baca gambar ──
  // retry 1x — imageprompt.org kadang ngambek sekali-sekali
  let desc = "";
  for (let i = 0; i < 2 && !desc; i++) {
    try { desc = await describeImage(imageBuffer); }
    catch (e) { note("describe" + (i ? "-retry" : ""), e); }
  }
  if (!desc) throw new Error("semua jalur scan gagal — " + fails.join(" | "));
  const sys = (instruction ? instruction + "\n\n" : "") +
    "Kamu adalah asisten AI vision. Kamu belum melihat gambarnya langsung, tapi dapet hasil analisis detail dari model vision khusus deskripsi gambar di bawah. Jawab pertanyaan user berdasarkan deskripsi itu, dalam bahasa Indonesia, singkat dan natural. Kalau deskripsi gak cukup buat jawab pertanyaan spesifik, jawab apa yang bisa dijawab dan jujur soal keterbatasannya. JANGAN bilang kamu gak lihat gambar — langsung jawab dari analisis yang ada.";

  let answer = "";
  const fullPrompt = `${sys}\n\n[HASIL ANALISIS GAMBAR]:\n${desc}\n\n[PERTANYAAN USER]: ${q}`;

  // Mercury duluan — dLLM difusi super cepat
  try {
    answer = await viaMercury(fullPrompt);
  } catch {
    // fallback rantai multi-API (dengan sesi kalau ada)
    answer = await aiChainChat(fullPrompt, {
      persona: "asisten AI vision Rara",
      model: "gemini",
      sessionKey,
    });
  }
  answer = (answer || "").trim();
  if (!answer) {
    note("describe+llm", "jawaban LLM kosong");
    throw new Error("semua jalur scan gagal — " + fails.join(" | "));
  }
  return { status: true, text: answer, engine: "describe+mercury", model: "imageprompt.org + mercury-2" };
}
