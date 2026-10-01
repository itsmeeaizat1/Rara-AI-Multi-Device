// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// stable-diffusion.js — Scraper untuk Stable Diffusion image generation
// Free via Pollinations (no API key) + fallback ke Stability AI (requires key)
//
// FIX 16 Sep 2026 (owner report ".sdxl gagal"): pollinations upstream flaky —
// kadang rate-limit (429), timeout antrean, atau balikin HALAMAN HTML error
// yang dulu lolos validasi "length > 1000" (bukan gambar → dikirim rusak /
// gagal). Sekarang: (1) validasi MAGIC BYTE wajib (JPEG/PNG/WebP), HTML ditolak;
// (2) retry multi-attempt + model cadangan flux → turbo; (3) error informatif
// (kode + penyebab) biar bisa didiagnosis, bukan "gagal" polos.
import axios from "axios";

const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

// seam http buat e2e — fn(url, timeoutMs) → axios-like { status, data: Buffer, headers }
let _http = null;
export function _setSdHttpForTest(fn) { _http = fn; }

// magic byte gambar asli — HTML/plain-text error page ditolak total
function _isImageBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 1000) return false;
  const b = buf;
  const isJpg = b[0] === 0xff && b[1] === 0xd8;
  const isPng = b[0] === 0x89 && b[1] === 0x50;
  const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46; // RIFF
  const isGif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  return isJpg || isPng || isWebp || isGif;
}

function _looksHtml(buf) {
  const head = buf.slice(0, 300).toString("utf8").toLowerCase();
  return head.includes("<!doctype") || head.includes("<html") || head.includes("<body");
}

async function _doGet(url, timeoutMs) {
  if (_http) return _http(url, timeoutMs);
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: timeoutMs });
  return { status: res.status, data: Buffer.from(res.data), headers: res.headers };
}

const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Rantai percobaan pollinations: flux (utama) → turbo (cadangan ringan) → flux (retry terakhir).
 * Setiap attempt punya timeout sendiri; 429 → tunggu 2.5 dtk sebelum attempt berikut.
 */
async function stableDiffusion(prompt, options = {}) {
  const {
    negativePrompt = "",
    width = 1024,
    height = 1024,
    steps = 30,
    seed = -1,
    model = "flux",
  } = options;

  const enhanced = negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt;
  // LIVE 16 Sep 2026: flux 1024x1024 cold bisa 45-60 dtk — timeout 60s dulu
  // sering kena pas antrean rame. Attempt-1 dikasih napas 70 dtk.
  const chain = [
    { model, timeout: 70000 },
    { model: model === "turbo" ? "flux" : "turbo", timeout: 40000 },
    { model, timeout: 60000 },
  ];

  let lastError = "unknown";
  for (let i = 0; i < chain.length; i++) {
    const { model: m, timeout: t } = chain[i];
    if (i > 0) await _sleep(2500);
    const url = `${POLLINATIONS_URL}/${encodeURIComponent(enhanced)}?width=${width}&height=${height}&seed=${seed > 0 ? seed : ""}&model=${m}&nologo=true`;
    try {
      const res = await _doGet(url, t);
      if (res.status === 429) { lastError = "HTTP 429 — rate limit pollinations (coba lagi bentar)"; continue; }
      if (res.status !== 200) { lastError = `HTTP ${res.status} dari pollinations`; continue; }
      const buf = Buffer.from(res.data || Buffer.alloc(0));
      if (_looksHtml(buf)) { lastError = "pollinations balas HTML error (bukan gambar)"; continue; }
      if (_isImageBuffer(buf)) {
        return { status: true, buffer: buf, model: `pollinations-${m}` };
      }
      lastError = `respon bukan gambar valid (${buf.length} byte)`;
    } catch (err) {
      const code = err?.code || err?.name || "";
      if (code === "ECONNABORTED" || code === "AbortError" || /timeout/i.test(String(err?.message))) {
        lastError = `timeout ${t / 1000}s (antrean pollinations sibuk)`;
      } else {
        lastError = err?.message || "gagal koneksi";
      }
    }
  }
  return { status: false, error: lastError };
}

// DALL-E style generation (pakai pollinations dengan model tertentu)
async function dalleStyle(prompt, options = {}) {
  const { width = 1024, height = 1024 } = options;
  return stableDiffusion(prompt, { ...options, model: "flux", width, height });
}

export { stableDiffusion, dalleStyle };
