// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// HD Upscaler — pakai sharp local (Lanczos3 + sharpen) sebagai primary
// DeepAI key expired, Azbry/Snowping down. Sharp local = gratis, no API, no rate limit
import sharp from "sharp";
import te from "../../src/lib/nova-error.js";
import cfg from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hd",
  alias: ["hd", "hdx"],
  category: "tools",
  description: "Enhance gambar jadi HD (Sharp Lanczos3 upscaler, no API key)",
  usage: ".hd (reply gambar)\n.hd doc — kirim sebagai dokumen\n.hd 2x / 4x / 8x",
  example: ".hd\n.hd 4x doc",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

/**
 * Upscale gambar pakai sharp (local, no API)
 * Kernel: Lanczos3 (best quality untuk upscaling)
 * + Sharpen untuk clarity
 * + Modulate untuk enhance warna
 */
async function upscaleImage(buffer, scale) {
  const meta = await sharp(buffer).metadata();
  const newWidth = meta.width * scale;
  const newHeight = meta.height * scale;

  const result = await sharp(buffer)
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .sharpen({ sigma: 1.2, flat: 1.0, jagged: 0.8 })
    .modulate({ brightness: 1.03, saturation: 1.08 })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();

  return { buffer: result, width: newWidth, height: newHeight };
}

async function handler(m, { sock, args }) {
  const img = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!img) {
    let txt = "";
    txt += ``;
    txt += `Kirim/reply gambar dulu ya!\n`;
    txt += `Contoh: .hd (reply gambar)\n`;
    txt += `Custom scale: .hd 4x\n`;
    txt += `Kirim sebagai dokumen: .hd doc\n`;
        return await m.reply( txt, "hd");
  }

  try {
    await m.react("🕒");
    const argList = (args || []).map((a) => String(a).toLowerCase());
    const wantDoc = argList.includes("doc");
    const scaleArg = argList.find((a) => /^\d+x$/.test(a));
    let scale = scaleArg ? parseInt(scaleArg.replace("x", "")) : 2;
    scale = Math.max(2, Math.min(8, scale || 2));
    const buffer = await m.download();
    if (!buffer) {
      return await m.reply(claraWrap("hd", "Gagal download gambar! Coba lagi."));
    }

    const { buffer: resultBuffer, width: outW, height: outH } = await upscaleImage(buffer, scale);
    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);
    let caption = "";
    caption += `Scale: ${scale}x (${outW}x${outH})\n`;
    caption += `Size: ${sizeMB}MB\n`;
    caption += `Engine: Sharp Lanczos3 (Local)\n`;
    
    if (wantDoc || resultBuffer.length > 5 * 1024 * 1024) {
      await sock.sendMessage(
        m.chat,
        {
          document: resultBuffer,
          mimetype: "image/jpeg",
          fileName: `hd-enhanced-${scale}x.jpg`,
          caption,
        },
        { quoted: m }
      );
    } else {
      await m.react("🐣");
      await sock.sendMessage(
        m.chat,
        {
          image: resultBuffer,
          caption,
        },
        { quoted: m }
      );
    }
  } catch (e) {
    await m.react("❌");
    console.error("[HD] Error:", e.message);
    let txt = "";
    txt += `Gagal enhance gambar!\n`;
    txt += `${e.message}\n`;
        await m.reply(claraWrap("hd", txt));
  }
}

export { pluginConfig as config, handler };
