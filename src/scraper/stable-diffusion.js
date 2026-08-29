// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// stable-diffusion.js — Scraper untuk Stable Diffusion image generation
// Free via Pollinations (no API key) + fallback ke Stability AI (requires key)
import axios from "axios";

const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

async function stableDiffusion(prompt, options = {}) {
  const {
    negativePrompt = "",
    width = 1024,
    height = 1024,
    steps = 30,
    seed = -1,
    model = "flux",
  } = options;

  try {
    // Method 1: Pollinations (free, no key)
    const enhanced = negativePrompt
      ? `${prompt}. Avoid: ${negativePrompt}`
      : prompt;
    const url = `${POLLINATIONS_URL}/${encodeURIComponent(enhanced)}?width=${width}&height=${height}&seed=${seed > 0 ? seed : ""}&model=${model}&nologo=true`;

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000,
    });

    if (res.data && res.data.length > 1000) {
      return {
        status: true,
        buffer: Buffer.from(res.data),
        model: `pollinations-${model}`,
      };
    }
    return { status: false, error: "Gagal generate gambar" };
  } catch (err) {
    return { status: false, error: err.message };
  }
}

// DALL-E style generation (pakai pollinations dengan model tertentu)
async function dalleStyle(prompt, options = {}) {
  const { width = 1024, height = 1024 } = options;
  return stableDiffusion(prompt, { ...options, model: "flux", width, height });
}

export { stableDiffusion, dalleStyle };
