// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Toimage — convert sticker (webp) → gambar PNG/JPG.
// FIX 9 Sep 2026: ffmpeg di banyak build VPS gak bawa libwebp (decode webp gagal
// → "Gangguan" terus) → sekarang SHARP dulu (decode webp native, selalu ada
// karena prebuilt binary-nya bundle libwebp), ffmpeg cuma fallback.
// Sticker animasi → frame pertama (sharp default baca page pertama).

import fs from "fs";
import path from "path";
import os from "os";
import { queueFFmpeg } from "../../src/lib/nova-ffmpeg.js";
import { claraWrap, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "toimage",
  alias: ["toimage"],
  aliases: ["toimage", "toimg", "stickerimage", "stikerimg", "stikertoimg", "togambar"],
  category: "convert",
  description: "Convert sticker ke gambar PNG/JPG",
  usage: ".toimage (reply sticker)",
  example: ".toimage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

// ── convert via sharp (decode webp native — engine utama) ──
async function convertWithSharp(buffer, outputPath) {
  const mod = await import("sharp");
  const sharp = mod.default || mod;
  // sharp default cuma baca PAGE PERTAMA webp animasi → frame pertama, pas buat output PNG
  await sharp(buffer).withMetadata().png().toFile(outputPath);
  return true;
}

// ── convert via ffmpeg (fallback kalau sharp gak ada/error) ──
async function convertWithFfmpeg(inputPath, outputPath) {
  await queueFFmpeg(`ffmpeg -y -i "${inputPath}" "${outputPath}"`);
  return fs.existsSync(outputPath);
}

async function handler(m, { sock }) {
  const tmpFiles = [];
  try {
    const quoted = m.quoted;
    if (!quoted) return m.reply(claraWrap("toimage", "Reply sticker-nya dulu, terus ketik .toimage", "guide"));

    const isSticker = quoted.isSticker || quoted.type === "stickerMessage" || quoted.mtype === "stickerMessage";
    if (!isSticker) return m.reply(claraWrap("toimage", "Yang di-reply harus sticker! 💡 Reply sticker → .toimage", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer || !mediaBuffer.length) {
      await m.react("❌");
      return m.reply(claraWrap("toimage", "Gagal mengunduh sticker — coba reply ulang sticker-nya.", "error"));
    }

    const tmpDir = path.join(os.tmpdir(), "nova-toimg");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const stamp = Date.now();
    const inputPath = path.join(tmpDir, `sticker_${stamp}.webp`);
    const outputPath = path.join(tmpDir, `image_${stamp}.png`);
    tmpFiles.push(inputPath, outputPath);
    fs.writeFileSync(inputPath, mediaBuffer);

    // engine 1: sharp (decode webp native, gak tergantung build ffmpeg)
    let ok = false;
    let usedEngine = "sharp";
    try {
      ok = await convertWithSharp(mediaBuffer, outputPath);
    } catch (e) {
      console.error("[toimage] sharp gagal:", e.message);
    }

    // engine 2: ffmpeg fallback
    if (!ok) {
      usedEngine = "ffmpeg";
      try {
        ok = await convertWithFfmpeg(inputPath, outputPath);
      } catch (e) {
        console.error("[toimage] ffmpeg gagal:", e.message);
      }
    }

    if (!ok || !fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      await m.react("❌");
      return m.reply(claraWrap("toimage", "Sticker ini gak bisa di-convert ke gambar (kemungkinan sticker lottie/antrian penuh). Coba sticker lain!", "error"));
    }

    const imgBuffer = fs.readFileSync(outputPath);
    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: imgBuffer, caption: "✅ Sticker → Image" }, { quoted: m });
  } catch (e) {
    console.error("[toimage] error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("toimage"));
  } finally {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

export { pluginConfig as config, handler };
