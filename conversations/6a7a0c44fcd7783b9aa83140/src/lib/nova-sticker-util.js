import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Sticker } from "wa-sticker-formatter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `sticker_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

export async function convertToStickerFromBuffer(buffer, mime, options = {}) {
  const isVideo = mime?.startsWith("video");
  const isImage = mime?.startsWith("image");
  if (!isImage && !isVideo) throw new Error("Format tidak didukung");

  const inputPath = tempPath(isVideo ? ".mp4" : ".png");
  const outputPath = tempPath(".webp");

  fs.writeFileSync(inputPath, buffer);

  const sticker = await Sticker(inputPath, {
    pack: options.pack ?? "Ourin-AI",
    author: options.author ?? "Bot",
    type: options.type ?? "full",
    quality: options.quality ?? 80,
    background: options.background ?? "transparent",
  });

  fs.writeFileSync(outputPath, sticker);
  return outputPath;
}

export async function sendStickerFromMedia(sock, m, mediaMessage, mime, options = {}) {
  if (!mediaMessage) throw new Error("Media tidak ditemukan");

  let buffer;
  try {
    buffer = await sock.downloadMediaMessage(mediaMessage);
  } catch (e) {
    throw new Error("Gagal mengunduh media: " + e.message);
  }

  if (!buffer || buffer.length === 0) throw new Error("Media kosong");

  const stickerPath = await convertToStickerFromBuffer(buffer, mime, options);
  const webpBuffer = fs.readFileSync(stickerPath);

  const jid = m.chat || m.id || m.remoteJid;
  await sock.sendMessage(jid, {
    sticker: webpBuffer,
  }, { quoted: m });
}
