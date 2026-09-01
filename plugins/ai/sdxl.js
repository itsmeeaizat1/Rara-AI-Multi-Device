// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// sdxl — Stable Diffusion XL image generation (free via pollinations)
import { stableDiffusion } from "../../src/scraper/stable-diffusion.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "sdxl",
  alias: ["sdxl", "stablediffusion", "sdai", "sdxlgen"],
  category: 'ai image',
  description: "Generate gambar dengan Stable Diffusion XL (gratis)",
  usage: ".sdxl <prompt gambar>",
  example: ".sdxl a futuristic city at sunset, cyberpunk style\n.sdxl kucing lucu berwarna pink, kartun",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      return m.reply(claraWrap("sdxl", `Mau gambar apa?\n\nContoh: ${m.prefix}sdxl futuristic city at sunset, cyberpunk\n${m.prefix}sdxl kucing lucu pink, kartun style`, "guide"));
    }

    await m.react("🕒");

    const result = await stableDiffusion(text, { width: 1024, height: 1024, model: "flux" });

    if (!result.status || !result.buffer) {
      await m.react("❌");
      return m.reply(claraWrap("sdxl", "Gagal generate gambar. Coba lagi nanti.", "error"));
    }

    await m.react("🐣");

    let caption = "";
    caption += `🎨 Prompt: *${text}*\n`;
    caption += `⚙️ Engine: *${result.model}*\n`;
    caption += `📐 Size: *1024x1024*\n`;
    
    return await sock.sendMedia(m.chat, result.buffer, null, m, { type: "image", caption });
  } catch (err) {
    console.error("sdxl error:", err);
    await m.react("❌");
    return m.reply(claraWrap("sdxl", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
