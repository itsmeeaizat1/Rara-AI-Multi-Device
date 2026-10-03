// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// dalleai — DALL-E style image generation (free via pollinations flux)
import { dalleStyle } from "../../src/scraper/stable-diffusion.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "dalleai",
  alias: ["dalleai", "dalle", "dalle3", "dalle-gen"],
  category: 'ai image',
  description: "Generate gambar ala DALL-E (gratis, pakai flux engine)",
  usage: ".dalleai <prompt gambar>",
  example: ".dalleai a photorealistic mountain landscape with snow\n.dalleai potret pria pakai jas hitam, studio lighting",
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
      return m.reply(raraWrap("dalleai", `Mau gambar apa?\n\nContoh: ${m.prefix}dalleai photorealistic mountain landscape\n${m.prefix}dalleai potret pria pakai jas hitam`, "guide"));
    }

    await m.react("🕒");

    const result = await dalleStyle(text, { width: 1024, height: 1024 });

    if (!result.status || !result.buffer) {
      await m.react("❌");
      return m.reply(raraWrap("dalleai", "Gagal generate gambar. Coba lagi.", "error"));
    }

    await m.react("🐣");

    let caption = "";
    caption += `🎨 Prompt: *${text}*\n`;
    caption += `📐 Size: *1024x1024*\n`;
    
    await sock.sendMedia(m.chat, result.buffer, null, m, { type: "image", caption });
    await m.reply(mediaInfoCaption({ header: "Rara DALL-E AI", fields: [
      { label: "Input", value: "Teks" },
      { label: "Prompt", value: text.length > 60 ? text.slice(0, 57) + "..." : text },

      { label: "Hasil", value: "Gambar (1024x1024)" },
    ] }));
    return;
  } catch (err) {
    console.error("dalleai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("dalleai", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
