// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Toimage — convert sticker (webp) → gambar, auto REMINI + UPSCALE biar jernih.
// Request owner 9 Sep 2026: "pas di convert jd gambar, gambar di remini + upscale
// dlu biar hasilnya pas jadi gambar ga burik plus jernih" + arahan:
// "untuk hd pakai lokal aja itu bagus — klo remini pakai fitur bawaan bot pakai HF".
//
// Pipeline:
//   ENGINE 1 (default) : REMINI bawaan bot — Swin2SR realworld 4x (Real-ESRGAN
//                        family, ala Remini) via @huggingface/transformers,
//                        100% lokal setelah model ke-cache, TANPA WATERMARK,
//                        jalan di worker pool (rara-hd-pool) biar bot tetap responsif.
//                        .toimage → langsung remini AI. Sticker 512px → hasil ±1536px.
//   ENGINE 2 (fallback): HD LOKAL sharp — upscale 2x lanczos3 + unsharp mask
//                        (instan, gak butuh model). Dipakai otomatis kalau AI
//                        gagal/model belum siap, atau eksplisit: .toimage cepat/hd.
// FIX ffmpeg: toimage lama 100% ffmpeg (build VPS tanpa libwebp = gagal terus).

import fs from "fs";
import path from "path";
import os from "os";
import { queueFFmpeg } from "../../src/lib/rara-ffmpeg.js";
import { raraWrap, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { enhanceLocalAsync, isModelCached } from "../../src/lib/rara-hd-pool.js";

const pluginConfig = {
  name: "toimage",
  alias: ["toimage"],
  aliases: ["toimage", "toimg", "stickerimage", "stikerimg", "stikertoimg", "togambar"],
  category: "convert",
  description: "Convert sticker ke gambar — auto remini AI 4x + upscale HD, hasil jernih ga burik",
  usage: ".toimage (reply sticker) — remini AI 4x (Swin2SR lokal, tanpa watermark)\n.toimage cepat (alias hd) — upscale HD lokal aja, instan",
  example: ".toimage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

const REMINI_TIMEOUT = 150_000; // AI bisa lama pas unduh model pertama (±59MB)

// ── ENGINE 2: HD lokal sharp — lanczos 2x + unsharp mask ──
async function hdLocalSharp(inputBuffer) {
  const mod = await import("sharp");
  const sharp = mod.default || mod;
  const img = sharp(inputBuffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);

  // target sisi panjang minimal 1024px (max 2048 biar gak kegedean)
  let target = longest < 1024 ? 1024 : Math.min(longest * 2, 2048);
  if (longest >= 2048) target = longest; // udah gede — cukup polish aja

  const out = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: target, height: target, fit: "inside", kernel: "lanczos3" })
    .sharpen({ sigma: 1.0, m1: 0.6, m2: 0.4 }) // unsharp mask biar detail keluar
    .modulate({ saturation: 1.04, brightness: 1.01 }) // sedikit pop
    .png()
    .toBuffer({ resolveWithObject: true });

  return { buffer: out.data, width: out.info.width, height: out.info.height, engine: "hd lokal", scale: null };
}

// ── ENGINE 1: remini AI bawaan bot (Swin2SR realworld 4x via HF transformers) ──
async function reminiAI(inputBuffer) {
  const result = await Promise.race([
    enhanceLocalAsync(inputBuffer, "real"), // Swin2SR-realworld-x4-64 — 4x ala Remini
    new Promise((_, rej) => setTimeout(() => rej(new Error("remini_timeout")), REMINI_TIMEOUT)),
  ]);
  return {
    buffer: Buffer.from(result.buffer),
    width: result.width,
    height: result.height,
    engine: result.label || "remini ai 4x",
    scale: result.scale,
    ms: result.ms,
  };
}

async function handler(m, { sock }) {
  const tmpFiles = [];
  try {
    const quoted = m.quoted;
    if (!quoted) return m.reply(raraWrap("toimage", "Reply sticker-nya dulu, terus ketik .toimage", "guide"));

    const isSticker = quoted.isSticker || quoted.type === "stickerMessage" || quoted.mtype === "stickerMessage";
    if (!isSticker) return m.reply(raraWrap("toimage", "Yang di-reply harus sticker! 💡 Reply sticker → .toimage", "guide"));

    // mode: cepat/hd = lokal sharp aja (instan), default = remini AI
    const mode = (m.args?.[0] || "").toLowerCase();
    const fastMode = mode === "cepat" || mode === "fast" || mode === "hd" || mode === "lokal";

    await m.react("🕒");
    if (!fastMode && !isModelCached("real")) {
      // model AI belum ke-download di mesin ini → kasih notice sekali (unduh ±59MB, setelah itu permanen offline)
      try {
        await m.reply(raraWrap("toimage", [
          "🕒 Remini AI: unduh model pertama kali (±59MB)...",
          "",
          "Setelah ini model ke-cache permanen — pemakaian berikutnya jauh lebih cepat.",
          "Mau instan? Ketik .toimage cepat (HD lokal tanpa AI)",
        ].join("\n")));
      } catch {}
    }

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer || !mediaBuffer.length) {
      await m.react("❌");
      return m.reply(raraWrap("toimage", "Gagal mengunduh sticker — coba reply ulang sticker-nya.", "error"));
    }

    // decode webp via sharp dulu (frame pertama kalau animasi) — AI & HD dua-duanya
    // bisa baca webp langsung via sharp, tapi jalanin lewat buffer PNG hasil decode
    // biar format apapun (lottie pun) gagal lebih awal dengan pesan jelas.
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default || sharpMod;
    let decoded;
    try {
      decoded = await sharp(mediaBuffer, { failOn: "none" }).png().toBuffer();
    } catch (e) {
      // fallback ffmpeg (safety terakhir buat format aneh)
      const tmpDir = path.join(os.tmpdir(), "rara-toimg");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const inputPath = path.join(tmpDir, `sticker_${Date.now()}.webp`);
      const outputPath = path.join(tmpDir, `image_${Date.now()}.png`);
      tmpFiles.push(inputPath, outputPath);
      fs.writeFileSync(inputPath, mediaBuffer);
      try {
        await queueFFmpeg(`ffmpeg -y -i "${inputPath}" "${outputPath}"`);
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) decoded = fs.readFileSync(outputPath);
      } catch {}
    }
    if (!decoded || !decoded.length) {
      await m.react("❌");
      return m.reply(raraWrap("toimage", "Sticker ini gak bisa di-convert ke gambar (kemungkinan sticker lottie). Coba sticker lain!", "error"));
    }

    // ── pipeline hasil ──
    let result = null;
    if (!fastMode) {
      try {
        result = await reminiAI(decoded);
      } catch (e) {
        console.error("[toimage] remini AI gagal:", e.message);
      }
    }
    if (!result) {
      result = await hdLocalSharp(decoded); // fallback / mode cepat — HD lokal
    }

    await m.react("🐣");
    const caption = `✅ Sticker → Image ${result.width}x${result.height}px`;
    await sock.sendMessage(m.chat, { image: result.buffer, caption }, { quoted: m });
  } catch (e) {
    console.error("[toimage] error:", e.message);
    await m.react("❌");
    m.reply(raraGangguan("toimage"));
  } finally {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

export { pluginConfig as config, handler };
