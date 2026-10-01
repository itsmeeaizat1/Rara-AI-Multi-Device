// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/freeai.js — free.ai (gratis TANPA API KEY)
// .freeai      → chat (api.free.ai/v1/chat, engine Qwen3-30B)
// .freeaiimage  → text-to-image (gpu4.free.ai/v1/image/generate, sdxl)
// Headers verbatim request owner 9 Sep 2026.

const CHAT_URL = "https://api.free.ai/v1/chat/";
const IMAGE_URL = "https://gpu4.free.ai/v1/image/generate/";

const HEADERS = {
  "sec-ch-ua-platform": '"Android"',
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
  "sec-ch-ua": '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  "content-type": "application/json",
  "sec-ch-ua-mobile": "?1",
  "accept": "*/*",
  "origin": "https://free.ai",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
  "priority": "u=1, i",
};

export const FREEAI_CHAT_TIMEOUT = 60_000;
export const FREEAI_IMAGE_TIMEOUT = 120_000;

// ── CHAT: messages = [{role, content}, ...] (system + user), return content ──
export async function freeAIChat(messages, { maxTokens = 120, lang = "en", model = "qwen7b", timeoutMs = FREEAI_CHAT_TIMEOUT } = {}) {
  const ctrl = AbortSignal.timeout(timeoutMs);
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ model, stream: false, max_tokens: maxTokens, lang, messages }),
    signal: ctrl,
  });
  if (!res.ok) throw new Error(`free.ai chat HTTP ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("balasan AI kosong");
  return { content, model: data?.model || model };
}

// ── IMAGE: text-to-image, return { url, shareUrl } ──
export const FREEAI_RATIOS = ["1:1", "9:16", "16:9", "4:3", "3:4", "3:2", "2:3", "21:9"];

export async function freeAIImage({ prompt, negativePrompt = "", aspectRatio = "1:1", style = "none", model = "sdxl", timeoutMs = FREEAI_IMAGE_TIMEOUT } = {}) {
  if (!prompt || !prompt.trim()) throw new Error("prompt kosong");
  const ar = FREEAI_RATIOS.includes(aspectRatio) ? aspectRatio : "1:1";
  const ctrl = AbortSignal.timeout(timeoutMs);
  const res = await fetch(IMAGE_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt,
      model,
      aspect_ratio: ar,
      style,
    }),
    signal: ctrl,
  });
  if (!res.ok) throw new Error(`free.ai image HTTP ${res.status}`);
  const data = await res.json();
  const url = data?.image_url || data?.url;
  if (!url) throw new Error("gambar gak terkirim dari server");
  return { url, shareUrl: data?.share_url || "", ratio: ar };
}
