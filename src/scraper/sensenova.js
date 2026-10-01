// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// sensenova.js — SenseNova AI (SenseTime) — OpenAI-compatible
// Endpoint: https://token.sensenova.ai/v1/chat/completions
// Key: apikeys.json raraai.sensenova (fallback env SENSENOVA_API_KEY)
//
// Model tersedia (verified live 8 Sep 2026, key owner):
//   - sensenova-6.8-flash-lite — MULTIMODAL VISION (input text+image), 256K ctx, gratis
//   - sensenova-6.7-flash-lite — MULTIMODAL VISION (input text+image), 256K ctx, gratis
//   - sensenova-u1-fast / u1.5-lite — generator infografis (image output) —
//     TERSEDIA di /v1/models TAPI "model not found" di chat (key tier belum akses)
//
// Dipakai: rantai fallback AI (prioritas 2 setelah Mercury), vision chain
// (.vision/.aichatimg — vision asli tanpa detour describe), command .aisensenova.

const SENSENOVA_URL = "https://token.sensenova.ai/v1/chat/completions";
const DEFAULT_MODEL = "sensenova-6.8-flash-lite";
const FALLBACK_MODEL = "sensenova-6.7-flash-lite";

let __sensenovaKeyDead = false;

async function getSensenovaKey() {
  if (__sensenovaKeyDead) return "";
  let key = process.env.SENSENOVA_API_KEY || "";
  if (!key) {
    try {
      const { getApiKeys } = await import("../lib/config/env-loader.js");
      key = getApiKeys()?.sensenova || "";
    } catch {}
  }
  return key;
}

function trimReply(text) {
  return String(text || "").trim();
}

/**
 * Chat SenseNova — pesan format OpenAI (string atau array multimodal).
 * @param {Array|String} messages - array messages lengkap, atau string konten user
 * @param {Object} [opts] - { model, maxTokens, timeoutMs }
 * @returns {String} balasan assistant
 */
export async function sensenovaChat(messages, opts = {}) {
  const key = await getSensenovaKey();
  if (!key) throw new Error("key sensenova kosong");
  const model = opts.model || DEFAULT_MODEL;
  const msgs = typeof messages === "string" ? [{ role: "user", content: messages }] : messages;

  const doCall = async (mdl) => {
    const res = await fetch(SENSENOVA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: mdl,
        messages: msgs,
        max_tokens: opts.maxTokens || 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs || 25000),
    });
    if (res.status === 401 || res.status === 403) {
      __sensenovaKeyDead = true; // key invalid — mati sampai restart biar gak nambah latency
      throw new Error(`sensenova key invalid (HTTP ${res.status})`);
    }
    if (!res.ok) throw new Error(`sensenova HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const text = trimReply(data?.choices?.[0]?.message?.content);
    if (text) return text;
    throw new Error("sensenova balas kosong");
  };

  try {
    return await doCall(model);
  } catch (e) {
    // model utama bermasalah → coba model cadangan sekali
    if (model !== FALLBACK_MODEL && !__sensenovaKeyDead) {
      return await doCall(FALLBACK_MODEL);
    }
    throw e;
  }
}

/**
 * Vision SenseNova — analisis gambar MULTIMODAL ASLI (tanpa key Gemini!).
 * @param {Buffer} imageBuffer - buffer gambar (jpg/png/webp)
 * @param {String} question - pertanyaan user
 * @param {String} [instruction] - instruksi system tambahan
 * @returns {Object} { status, text, engine, model }
 */
export async function sensenovaVision({ imageBuffer, question, instruction = "" }) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error("buffer gambar kosong");
  const q = (question || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.").trim();

  const b64Head = imageBuffer.subarray(0, 8).toString("base64");
  const mime = b64Head.startsWith("/9j/") ? "image/jpeg"
    : b64Head.startsWith("UklGR") ? "image/webp"
    : b64Head.startsWith("R0lGO") ? "image/gif"
    : "image/png";

  const sys = (instruction ? instruction + "\n\n" : "") +
    "Kamu adalah asisten AI vision yang ahli. Analisis gambar dengan detail dan akurat. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia.";

  const messages = [
    { role: "system", content: sys },
    {
      role: "user",
      content: [
        { type: "text", text: q },
        { type: "image_url", image_url: { url: `data:${mime};base64,${imageBuffer.toString("base64")}` } },
      ],
    },
  ];

  const text = await sensenovaChat(messages, { timeoutMs: 60000 });
  return { status: true, text, engine: "sensenova-vision", model: DEFAULT_MODEL };
}
