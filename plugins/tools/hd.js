// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// HD Upscaler — pakai sharp local (Lanczos3 + sharpen) sebagai primary
// DeepAI key expired, Azbry/Snowping down. Sharp local = gratis, no API, no rate limit
import sharp from "sharp";
import te from "../../src/lib/nova-error.js";
import cfg from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "remini",
  alias: ["hd", "enhance", "hd4k"],
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
    let txt = `╔┈┈「 HD IMAGE 」\n`;
    txt += `╎❏ Reply gambar untuk enhance jadi HD\n\n`;
    txt += `╎❏ \`${m.prefix}remini\` — upscale 4x (default)\n`;
    txt += `╎❏ \`${m.prefix}remini 2x\` — upscale 2x (cepat)\n`;
    txt += `╎❏ \`${m.prefix}remini 8x\` — upscale 8x (max)\n`;
    txt += `╎❏ \`${m.prefix}remini doc\` — kirim sebagai dokumen\n\n`;
    txt += `╎❏ Contoh: \`${m.prefix}remini 8x doc\`\n`;
    txt += `╚┈┈❖`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "remini" });
  }

  await m.react("🕐");

  try {
    let b = m.quoted?.isMedia ? await m.quoted.download() : await m.download();

    if (!b || b.length === 0) {
      throw new Error("Gagal download gambar");
    }

    // Parse argumen
    const input = (args.join(" ") || "").trim().toLowerCase();
    const parts = input.split(/\s+/);

    let scale = 4; // default
    let wantDoc = false;

    for (const part of parts) {
      if (part === "doc" || part === "document") {
        wantDoc = true;
      } else if (part === "2x" || part === "2") {
        scale = 2;
      } else if (part === "4x" || part === "4") {
        scale = 4;
      } else if (part === "8x" || part === "8") {
        scale = 8;
      } else if (part === "16x" || part === "16") {
        scale = 16;
      }
    }

    // Upscale pakai sharp (local, no API key)
    const { buffer: resultBuffer, width: outW, height: outH } = await upscaleImage(b, scale);
    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);

    await m.react("✅");

    let caption = `╔┈┈「 HD ENHANCED 」\n`;
    caption += `╎❏ Scale: ${scale}x (${outW}x${outH})\n`;
    caption += `╎❏ Size: ${sizeMB}MB\n`;
    caption += `╎❏ Engine: Sharp Lanczos3 (Local)\n`;
    caption += `╚┈┈❖`;

    if (wantDoc || resultBuffer.length > 5 * 1024 * 1024) {
      // Document mode — no compress
      const mode = wantDoc ? "Document" : "Auto-Document";
      await sock.sendMessage(
        m.chat,
        {
          document: resultBuffer,
          mimetype: "image/jpeg",
          fileName: `HD-${scale}x-${Date.now()}.jpg`,
          caption,
        },
        { quoted: m },
      );
    } else {
      // Image mode
      await sock.sendMessage(
        m.chat,
        {
          image: resultBuffer,
          caption,
          jpegQuality: 100,
        },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error("[REMINI] Error:", e.message);
    let txt = `╔┈┈「 HD ERROR 」\n`;
    txt += `╎❏ Gagal enhance gambar!\n`;
    txt += `╎❏ ${e.message}\n`;
    txt += `╚┈┈❖`;
    await m.reply(claraWrap("remini", txt));
  }
}

export { pluginConfig as config, handler };
