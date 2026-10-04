// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { fluxImage } from "../../src/scraper/seaart.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
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
  name: "rarabanana2",
  alias: ["rarabanana2", "novabanana2"],
  category: 'ai image',
  description: "Buat gambar dengan AI menggunakan prompt",
  usage: ".rarabanana2 <prompt>",
  example: ".rarabanana2 make it anime style",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.text;
  if (!prompt) {
    return m.reply(raraGuide("rarabanana2", {
 kaomoji: "(◕ᴗ◕)",
 sapaan: "bikin gambar apa aja pakai AI Banana2, deskripsikan aja! (≧▽≦)",
      cara: "ketik deskripsi gambar yang mau dibuat",
      contoh: `${m.prefix}rarabanana2 make a cat`,
      spec: ["⚡ energi 1", "⏱ 30dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await fluxImage(prompt, "1:1");
    const imageUrl = result.url;
    const c = await dlCard("gambar", { url: imageUrl }, [["Prompt", String(prompt).slice(0, 40)], ["Engine", "SeaArt Flux Image"]]);
    await sock.sendMedia(m.chat, imageUrl, null, m, {
      type: "image",
      caption: c || undefined,
    });
  } catch (error) {
    console.log(error);
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Terjadi kesalahan";
    await m.react("🐣");
    m.reply(raraWrap("Rarabanana2", `🍀 *Waduhh, sepertinya ini ada kendala*

${msg}

Silahkan coba lagi nanti, dimohon jangan spam`));
  }
}

export { pluginConfig as config, handler };
