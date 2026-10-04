// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// dalleai — DALL-E style image generation (free via pollinations flux)
import { dalleStyle } from "../../src/scraper/stable-diffusion.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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

    let oldCap = "";
    oldCap += `🎨 Prompt: *${text}*\n`;
    oldCap += `⚙️ Engine: *${result.model}*\n`;
    oldCap += `📐 Size: *1024x1024*\n`;
    const c = await dlCard("gambar", { buffer: result.buffer }, [["Prompt", text], ["Engine", result.model]]);
    return await sock.sendMedia(m.chat, result.buffer, c || oldCap, m, { type: "image", caption: c || oldCap });
  } catch (err) {
    console.error("dalleai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("dalleai", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
