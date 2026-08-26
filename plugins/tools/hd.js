// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// HD Upscaler — pakai sharp local (Lanczos3 + sharpen) sebagai primary
// DeepAI key expired, Azbry/Snowping down. Sharp local = gratis, no API, no rate limit
import sharp from "sharp";
import te from "../../src/lib/nova-error.js";
import cfg from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "remini",
  alias: ["remini"],
  category: "tools",
  description: "Enhance gambar jadi HD (Sharp Lanczos3 upscaler, no API key)",
  usage: ".remini (reply gambar)\n.remini doc — kirim sebagai dokumen\n.remini 2x / 4x / 8x",
  example: ".remini\n.remini 4x doc",
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
    let txt = `╭──「 *HD ENHANCE* 」\n`;
    txt += `╰──────────❀\n`;
    txt += `│ ❏ Kirim/reply gambar dulu ya!\n`;
    txt += `│ ❏ Contoh: .remini (reply gambar)\n`;
    txt += `│ ❏ Custom scale: .remini 4x\n`;
    txt += `│ ❏ Kirim sebagai dokumen: .remini doc\n`;
    txt += `╰──────────❀`;
    return await m.reply( txt, "remini");
  }

  try {
    const argList = (args || []).map((a) => String(a).toLowerCase());
    const wantDoc = argList.includes("doc");
    const scaleArg = argList.find((a) => /^\d+x$/.test(a));
    let scale = scaleArg ? parseInt(scaleArg.replace("x", "")) : 2;
    scale = Math.max(2, Math.min(8, scale || 2));

    await m.react("🕒");

    const buffer = await m.download();
    if (!buffer) {
      return await m.reply(claraWrap("remini", "Gagal download gambar! Coba lagi."));
    }

    const { buffer: resultBuffer, width: outW, height: outH } = await upscaleImage(buffer, scale);
    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);

    await m.react("🐣");

    let caption = `╭──「 *HD ENHANCED* 」\n`;
    caption += `│ ❏ Scale: ${scale}x (${outW}x${outH})\n`;
    caption += `│ ❏ Size: ${sizeMB}MB\n`;
    caption += `│ ❏ Engine: Sharp Lanczos3 (Local)\n`;
    caption += `╰──────────❀`;

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
    console.error("[HD/Remini] Error:", e.message);
    await m.react("❌");
    let txt = `╭──「 *ERROR* 」\n`;
    txt += `│ ❏ Gagal enhance gambar!\n`;
    txt += `│ ❏ ${e.message}\n`;
    txt += `╰──────────❀`;
    await m.reply(claraWrap("remini", txt));
  }
}

export { pluginConfig as config, handler };
