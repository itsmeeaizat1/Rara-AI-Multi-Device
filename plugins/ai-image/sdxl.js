// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// sdxl — Stable Diffusion XL image generation
// FIX 16 Sep 2026 (owner report ".sdxl gagal"): pollinations gratis flaky —
// sekarang ada FALLBACK ke ZelAPI ai-image/sdxl (key owner) kalau pollinations
// total gagal, dan error reply nunjukin PENYEBAB asli biar bisa didiagnosis.
import { stableDiffusion, _setSdHttpForTest } from "../../src/scraper/stable-diffusion.js";
import { zelImageEndpoint } from "../../src/scraper/zelapi.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "sdxl",
  alias: ["sdxl", "stablediffusion", "sdai", "sdxlgen"],
  category: 'ai image',
  description: "Generate gambar dengan Stable Diffusion XL (pollinations gratis + fallback ZelAPI)",
  usage: ".sdxl <prompt gambar>",
  example: ".sdxl a futuristic city at sunset, cyberpunk style\n.sdxl kucing lucu berwarna pink, kartun",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(raraWrap("sdxl", `Mau gambar apa?\n\nContoh: ${m.prefix}sdxl futuristic city at sunset, cyberpunk\n${m.prefix}sdxl kucing lucu pink, kartun style`, "guide"));
    }

    await m.react("🕒");

    let result = await stableDiffusion(text, { width: 1024, height: 1024, model: "flux" });
    let via = result.status ? result.model : null;

    // Fallback: pollinations total gagal → ZelAPI ai-image/sdxl (key owner)
    if (!result.status || !result.buffer) {
      const zl = await zelImageEndpoint("ai-image/sdxl", text, { textParam: "prompt" });
      if (zl?.ok && zl?.buffer && zl.buffer.length > 1000) {
        result = { status: true, buffer: zl.buffer, model: "zelapi-sdxl" };
        via = "zelapi-sdxl";
      } else {
        await m.react("❌");
        const alasan = result?.error || zl?.error || "tidak diketahui";
        return m.reply(raraWrap("sdxl", `Gagal generate gambar.\nPenyebab: ${alasan}\n\nCoba lagi sebentar — kalau masih gagal, lapor dengan teks penyebab di atas ya.`, "error"));
      }
    }

    await m.react("🐣");

    let caption = "";
    caption += `🎨 Prompt: *${text}*\n`;
    caption += `⚙️ Engine: *${via || result.model}*\n`;
    caption += `📐 Size: *1024x1024*\n`;

    return await sock.sendMedia(m.chat, result.buffer, null, m, { type: "image", caption });
  } catch (err) {
    console.error("sdxl error:", err);
    await m.react("❌");
    return m.reply(raraWrap("sdxl", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, _setSdHttpForTest };
