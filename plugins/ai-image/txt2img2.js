// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { Txt2Img2 } from "../../src/scraper/txt2img2.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch ai-image) — helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "txt2img2",
  alias: ["txt2img2"],
  category: 'ai image',
  description: "Buat gambar dari teks pakai Flux Klein 4B",
  usage: ".txt2img2 <deskripsi gambar>",
  example: ".txt2img2 Mobil Lamborghini revuelto",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(raraGuide("txt2img2", {
 kaomoji: "(•̀ᴗ•́)و",
 sapaan: "bikin gambar dari teks pakai AI Flux Klein 4B, hasilnya tajam! (๑•̀ㅂ•́)و✧",
      cara: "ketik deskripsi gambar yang mau dibuat",
      contoh: m.prefix + "txt2img2 Mobil Lamborghini revuelto",
      note: "proses generate agak lama, sekitar 30-60 detik",
      spec: ["⚡ energi 3", "⏱ 30dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await Txt2Img2(text);

    if (!result.status) {
      { return await m.reply(raraWrap(m.command, result.error || "Generate gagal, coba lagi ya", "error")); };
    }

    const txt2Card = await dlCard("gambar", { url: result.url }, [["Prompt", String(result.prompt || prompt).slice(0, 40)], ["Engine", "Flux Klein 4B"]]);
    await sock.sendMedia(m.chat, result.url, (txt2Card || null), m, {
      type: "image",
    });
  } catch (e) {
    console.error(e);
    m.reply(raraError("Txt2Img2", "❌ Gagal generate gambar, coba lagi nanti"));
  }
}

export { pluginConfig as config, handler };
