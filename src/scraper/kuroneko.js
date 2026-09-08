// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kuroneko.js — KuroNeko API (sylvatica.my.id) — scraper AI lengkap
// Key: apikeys.json field `kuroneko` (fallback env KURONEKO_API_KEY)
// Docs: sylvatica.my.id — free via login, semua endpoint pakai ?apikey=
//
// Fitur AI (live verified 8 Sep 2026):
//   - text2vid   : TEXT → VIDEO mp4 (sora engine) — generator video AI
//   - tts        : TTS suara karakter/selebritas (nahida, taylor_swift,
//                  elon_musk, goku, miku, eminem, optimus_prime, dll — 12 voice)
//   - toonmix    : foto → kartun/anime custom prompt (nai-diffusion-4-5)
//   - animetoreal: gambar ANIME → versi realistis (kebalikan jadianime)
//   - nanobanana : edit gambar img2img (nano-banana via KuroNeko, cadangan editimg)
//   - kuroneko   : chat AI flagship KuroNeko
//   - gpt5/claude/qwen3/mistral/perplexity/bypassai/aiseek: chat AI (cadangan rantai)
// Gak dipakai (mati utk key ini): chatgpt (bocor debug), gptanon (403),
// imagenai (auth error), txt2img (session expired), aisong (backend down),
// nova (moderation debug), deepsek (answer kosong).

const KN_BASE = "https://sylvatica.my.id/api";

async function getKuronekoKey() {
  let key = process.env.KURONEKO_API_KEY || "";
  if (!key) {
    try {
      const { getApiKeys } = await import("../lib/config/env-loader.js");
      const keys = getApiKeys();
      key = keys?.kuroneko || keys?.sylva || "";
    } catch {}
  }
  return key;
}

/**
 * GET helper — auto-inject apikey, retry kalau rate-limit (429).
 * KuroNeko rate-limit ketat (~beberapa req/menit) — command user aman,
 * tapi burst request (test/automation) perlu backoff.
 */
async function knGet(path, params = {}, timeoutMs = 60000, _attempt = 0) {
  const key = await getKuronekoKey();
  if (!key) throw new Error("key kuroneko kosong");
  const qs = new URLSearchParams({ apikey: key, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${KN_BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(timeoutMs) });
  // rate-limit → tunggu 8s, max 3 retry
  if (res.status === 429 && _attempt < 3) {
    await new Promise((r) => setTimeout(r, 8000 * (_attempt + 1)));
    return knGet(path, params, timeoutMs, _attempt + 1);
  }
  if (!res.ok) throw new Error(`kuroneko HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data?.status === false) {
    // beberapa error backend juga sifatnya transient (session worker) — retry 1x
    if (_attempt < 1 && /Parameter|session|expired/i.test(String(data?.message || ""))) {
      await new Promise((r) => setTimeout(r, 4000));
      return knGet(path, params, timeoutMs, _attempt + 1);
    }
    throw new Error(data?.message || "kuroneko gagal");
  }
  return data;
}

/** Upload buffer gambar ke uguu → URL publik (dipakai fitur berbasis url) */
export async function uploadToUguu(buffer, filename = "img.jpg") {
  const form = new FormData();
  form.append("files[]", new Blob([buffer]), filename);
  const res = await fetch("https://uguu.se/upload.php", { method: "POST", body: form, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`uguu HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const url = data?.files?.[0]?.url;
  if (!url) throw new Error("upload uguu gagal");
  return url;
}

/** TEXT → VIDEO: hasil { url, status } */
export async function text2vid(prompt) {
  const d = await knGet("ai/text2vid", { prompt }, 180000);
  const url = d?.result?.url || d?.url || d?.result;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL video kosong");
  return url;
}

/** Daftar voice TTS selebritas/karakter */
export async function celebVoiceList() {
  const d = await knGet("ai/tts", { text: "list" }, 30000);
  const models = d?.available_models || [];
  if (!models.length) throw new Error("daftar voice kosong");
  return models; // [{id, name}]
}

/** TTS suara selebritas — hasil URL audio wav */
export async function celebTTS(text, voice = "nahida") {
  const d = await knGet("ai/tts", { text, model: voice }, 90000);
  const url = d?.result?.audio_url || d?.result;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL audio kosong");
  return url;
}

/** Foto → kartun/anime gaya custom (NovelAI nai-diffusion-4-5) */
export async function toonMix(imageUrl, prompt = "jadikan kartun anime lucu dan colorful") {
  const d = await knGet("ai/toonmix", { url: imageUrl, prompt }, 180000);
  const url = d?.url || d?.result?.url || d?.result;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL hasil kosong");
  return url;
}

/** Gambar anime → versi realistis */
export async function animeToReal(imageUrl) {
  const d = await knGet("ai/animetoreal", { url: imageUrl }, 180000);
  const url = d?.result?.result_url || d?.url || d?.result?.url || d?.result;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL hasil kosong");
  return url;
}

/** Edit gambar img2img (nano-banana via KuroNeko) — cadangan engine .editimg */
export async function nanoBananaEdit(imageUrl, prompt) {
  const d = await knGet("ai/nanobanana", { url: imageUrl, prompt }, 180000);
  const url = d?.data?.image || d?.image || d?.result?.url || d?.result;
  if (typeof url !== "string" || !url.startsWith("http")) throw new Error("URL hasil kosong");
  return url;
}

/** Chat AI flagship KuroNeko — hasil teks */
export async function kuronekoChat(q) {
  const d = await knGet("ai/kuroneko", { q }, 45000);
  const r = d?.result;
  const text = typeof r === "string" ? r : r?.reply || r?.answer || r?.response || r?.message || "";
  if (!text) throw new Error("jawaban kosong");
  return String(text).trim();
}
