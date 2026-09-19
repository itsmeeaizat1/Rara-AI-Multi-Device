// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// HD Upscaler — pakai sharp local (Lanczos3 + sharpen) sebagai primary
// DeepAI key expired, Azbry/Snowping down. Sharp local = gratis, no API, no rate limit
import sharp from "sharp";
import te from "../../src/lib/nova-error.js";
import cfg from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hd",
  alias: ["hd", "hdx"],
  category: "tools",
  description: "Enhance gambar jadi HD (Sharp Lanczos3 upscaler, no API key)",
  usage: ".hd (reply gambar)\n.hd doc — kirim sebagai dokumen\n.hd 2x / 4x / 8x / 16x (angka polos juga bisa: .hd 16)",
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
// batas sisi maksimal hasil — WA/sharp makin berat di atas ini, dan
// JPEG di atas 16000px banyak viewer yang gak bisa buka
const MAX_OUTPUT_PX = 16000;

/**
 * Upscale gambar pakai sharp (local, no API)
 * Kernel: Lanczos3 (best quality untuk upscaling)
 * + Sharpen untuk clarity (pass akhir saja)
 * + Modulate untuk enhance warna
 *
 * FIX 19 Sep 2026 (owner: ".hd 16 knp hasilnya gak 16x"): scale kini
 * sampai 16x. Buat scale besar (8x/16x) upscale dilakukan BERTAHAP 2x
 * per pass (intermediate PNG lossless) — lanczos sekali lompat 16x
 * hasilnya lembek/blur, bertahap detailnya jauh lebih terjaga.
 * Scale otomatis diturunkan kalau sisi hasil lewat MAX_OUTPUT_PX.
 */
async function upscaleImage(buffer, scale) {
  const meta = await sharp(buffer).metadata();
  let finalScale = scale;
  const longest = Math.max(meta.width || 0, meta.height || 0) || 0;
  while (longest && longest * finalScale > MAX_OUTPUT_PX && finalScale > 2) {
    finalScale--; // gambar gede → turunin scale biar gak lewat batas
  }
  const newWidth = meta.width * finalScale;
  const newHeight = meta.height * finalScale;

  // pass 2x bertahap untuk scale pangkat-2 (4/8/16) — sisanya sekali jalan
  const isPow2 = finalScale > 2 && (finalScale & (finalScale - 1)) === 0;
  let cur = buffer;
  if (isPow2) {
    const passes = Math.log2(finalScale);
    for (let i = 0; i < passes - 1; i++) {
      const m2 = await sharp(cur).metadata();
      cur = await sharp(cur)
        .resize(m2.width * 2, m2.height * 2, {
          kernel: sharp.kernel.lanczos3,
          fit: "fill",
        })
        .png({ compressionLevel: 0 }) // intermediate lossless
        .toBuffer();
    }
  }

  const result = await sharp(cur)
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .sharpen({ sigma: 1.2, flat: 1.0, jagged: 0.8 })
    .modulate({ brightness: 1.03, saturation: 1.08 })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();

  return { buffer: result, width: newWidth, height: newHeight, scale: finalScale, capped: finalScale < scale };
}

async function handler(m, { sock, args }) {
  const img = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!img) {
    return await m.reply(novaBox("HD Enhance", [
      "Kirim gambar baru atau reply/tag foto yang",
      "udah diupload sebelumnya, terus ketik .hd",
      "---",
      "Contoh    : .hd (reply gambar apa pun)",
      "Scale     : .hd 4x (2x/4x/8x/16x)",
      "Dokumen   : .hd doc (hasil dikirim jpg file)",
    ]));
  }

  try {
    await m.react("🕒");
    const argList = (args || []).map((a) => String(a).toLowerCase());
    const wantDoc = argList.includes("doc");
    // FIX 19 Sep 2026: ".hd 16" (angka polos) dulunya GAK dikenali (regex
    // nyari "16x" doang) → diem-diem fallback 2x; dan scale di-clamp max 8.
    // Sekarang: angka polos + "16x" dua-duanya sah, range 2..16.
    const scaleArg = argList.find((a) => /^\d{1,2}x?$/.test(a));
    let scale = scaleArg ? parseInt(scaleArg.replace("x", "")) : 2;
    scale = Math.max(2, Math.min(16, scale || 2));
    // FIX: reply/tag foto yang udah diupload sebelumnya — unduh dari
    // pesan yang di-quote, bukan dari pesan command (isinya teks).
    let buffer;
    if (m.quoted && (m.quoted.isMedia || m.quoted.type === "imageMessage")) {
      buffer = await m.quoted.download();
    } else if (m.isImage || m.isMedia) {
      buffer = await m.download();
    }
    if (!buffer || !buffer.length) {
      return await m.reply(claraWrap("hd", "Gagal download gambar! Coba lagi."));
    }

    const { buffer: resultBuffer, width: outW, height: outH, scale: finalScale, capped } = await upscaleImage(buffer, scale);
    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);
    let caption = "";
    caption += `Scale: ${finalScale}x (${outW}x${outH})\n`;
    caption += `Size: ${sizeMB}MB\n`;
    caption += `Engine: Sharp Lanczos3 (Local)${capped ? ` — scale diturunin dari ${scale}x (batas ${MAX_OUTPUT_PX}px)` : ""}\n`;
    
    if (wantDoc || outW > 1920 || outH > 1920 || resultBuffer.length > 5 * 1024 * 1024) {
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
