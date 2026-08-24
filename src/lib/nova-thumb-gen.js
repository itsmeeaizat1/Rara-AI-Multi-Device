// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-thumb-gen.js
 * Generate thumbnail dinamis untuk preview card plugin.
 * Canvas 100x100: text nama fitur (putih) di background hitam.
 * Langsung 100x100 JPEG — tanpa sharp, sync, cepat.
 * Cache hasil supaya tidak regenerate tiap kali.
 */

import { createCanvas } from "@napi-rs/canvas";

// Cache thumbnail supaya tidak regenerate tiap pesan
const thumbCache = new Map();

/**
 * Convert command name ke Title Case
 * "remini" → "Remini"
 * "sticker_maker" → "Sticker Maker"
 * "tebak_gambar" → "Tebak Gambar"
 */
function titleCase(str) {
  return String(str)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .filter((w) => w.trim())
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generate thumbnail: text putih di background hitam (100x100 JPEG).
 * Gambar langsung di 100x100 — tanpa sharp, sync, cepat.
 * @param {string} text - Nama fitur (akan di-Title Case)
 * @returns {Buffer} JPEG buffer 100x100 untuk externalAdReply.thumbnail
 */
function generateThumbImage(text) {
  const cleanText = titleCase(text);

  // Cek cache
  if (thumbCache.has(cleanText)) {
    return thumbCache.get(cleanText);
  }

  const size = 100;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background hitam
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  // Text putih
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Auto-fit font size supaya text muat di canvas 100x100
  let fontSize = 22;
  ctx.font = `bold ${fontSize}px sans-serif`;
  while (ctx.measureText(cleanText).width > size - 10 && fontSize > 8) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px sans-serif`;
  }

  // Kalau masih kelebaran, split jadi 2 baris
  if (ctx.measureText(cleanText).width > size - 10) {
    const mid = Math.ceil(cleanText.length / 2);
    let splitIdx = cleanText.indexOf(" ", mid);
    if (splitIdx === -1) splitIdx = mid;

    const line1 = cleanText.substring(0, splitIdx).trim();
    const line2 = cleanText.substring(splitIdx).trim();

    // Resize ulang untuk 2 baris
    fontSize = 16;
    ctx.font = `bold ${fontSize}px sans-serif`;
    while (
      (ctx.measureText(line1).width > size - 10 ||
        ctx.measureText(line2).width > size - 10) &&
      fontSize > 7
    ) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px sans-serif`;
    }

    ctx.fillText(line1, size / 2, size / 2 - fontSize / 2 - 2);
    ctx.fillText(line2, size / 2, size / 2 + fontSize / 2 + 2);
  } else {
    ctx.fillText(cleanText, size / 2, size / 2);
  }

  const buffer = canvas.toBuffer("image/jpeg");

  // Simpan ke cache (max 200 entry)
  if (thumbCache.size >= 200) {
    const firstKey = thumbCache.keys().next().value;
    thumbCache.delete(firstKey);
  }
  thumbCache.set(cleanText, buffer);

  return buffer;
}

export { generateThumbImage, titleCase };
