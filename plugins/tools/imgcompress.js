// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "imgcompress",
  alias: ["imgcompress"],
  category: "tools",
  description: "Kompres gambar (PNG/JPG/WebP) dengan kontrol kualitas",
  usage:
    ".imgcompress (reply gambar) — Kompres default 70%\n.imgcompress <level> (reply gambar) — Kompres dengan level 1-100\n.imgcompress max (reply gambar) — Kompres maksimal\n.imgcompress info (reply gambar) — Info detail gambar",
  example: ".imgcompress 50",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function downloadFile(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
}

function getTmpFile(ext) {
  return path.join(os.tmpdir(), "nova_imgcmp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function cleanup(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch (e) { console.error('[imgcompress.js]:', e.message); }
}

async function getMediaBuffer(m) {
  // Quoted message
  if (m.quoted) {
    if (m.quoted.buffer) return { buffer: m.quoted.buffer, mime: m.quoted.mimetype || "image/jpeg", fileName: m.quoted.fileName };
    if (m.quoted.url) {
      try {
        const buffer = await downloadFile(m.quoted.url);
        return { buffer, mime: m.quoted.mimetype || "image/jpeg", fileName: m.quoted.fileName };
      } catch (e) { console.error('[imgcompress.js]:', e.message); }
    }
  }
  // Current message
  if (m.buffer) return { buffer: m.buffer, mime: m.mimetype || "image/jpeg", fileName: m.fileName };
  if (m.url) {
    try {
      const buffer = await downloadFile(m.url);
      return { buffer, mime: m.mimetype || "image/jpeg", fileName: m.fileName };
    } catch (e) { console.error('[imgcompress.js]:', e.message); }
  }
  return null;
}

async function handler(m, { sock }) {
  const arg = (m.args?.[0] || "").toLowerCase();
  const media = await getMediaBuffer(m);

  if (!media) {
    let txt = "IMAGE COMPRESSOR\n\n";
    txt += "Kompres gambar untuk mengurangi ukuran file.\n\n";
    txt += "Cara pakai:\n";
    txt += "1. .imgcompress (reply gambar) — Kompres default 70%\n";
    txt += "2. .imgcompress 50 (reply gambar) — Kompres dengan level 50%\n";
    txt += "3. .imgcompress max (reply gambar) — Kompres maksimal\n";
    txt += "4. .imgcompress info (reply gambar) — Info detail gambar\n\n";
    txt += "Level 1-100 (semakin rendah = semakin kecil ukuran)\n";
    txt += "Default: 70% | Max: 20%\n";
    txt += "Format: JPG, PNG, WebP";
    return m.reply( txt, "imgcompress");
  }

  const isImage = (media.mime || "").startsWith("image/");

  if (!isImage) {
    return m.reply(claraWrap("Imgcompress", "File bukan gambar. Reply gambar dengan .imgcompress"));
  }

  // === INFO ===
  if (arg === "info" || arg === "detail") {
    try {
      const meta = await sharp(media.buffer).metadata();
      let txt = "INFO GAMBAR\n\n";
      txt += "Format: " + (meta.format || media.mime).toUpperCase() + "\n";
      txt += "Dimensi: " + meta.width + " x " + meta.height + " px\n";
      txt += "Ukuran: " + formatSize(media.buffer.length) + "\n";
      if (meta.density) txt += "DPI: " + meta.density + "\n";
      if (meta.channels) txt += "Channels: " + meta.channels + "\n";
      if (meta.hasAlpha) txt += "Alpha: Ya\n";
      if (meta.space) txt += "Color space: " + meta.space + "\n";

      // Estimasi kompresi
      const compressed = await sharp(media.buffer).jpeg({ quality: 70 }).toBuffer();
      const ratio = Math.round((1 - compressed.length / media.buffer.length) * 100);
      txt += "\nEstimasi kompresi (70%): " + formatSize(compressed.length) + " (-" + (ratio > 0 ? ratio : 0) + "%)";

      return m.reply( txt, "imgcompress");
    } catch (e) {
      return m.reply("Gagal membaca info gambar: " + e.message);
    }
  }

  // === Set quality ===
  let quality = 70;
  if (arg === "max" || arg === "minimum" || arg === "min") {
    quality = 20;
  } else if (arg && !isNaN(parseInt(arg))) {
    quality = Math.max(1, Math.min(100, parseInt(arg)));
  }

  try {
    await m.react("🕒");
    const meta = await sharp(media.buffer).metadata();
    const originalSize = media.buffer.length;

    // Resize jika terlalu besar (max 1920px)
    let pipeline = sharp(media.buffer);
    if (meta.width > 1920 || meta.height > 1920) {
      pipeline = pipeline.resize(1920, 1920, { fit: "inside", withoutEnlargement: true });
    }

    // Convert ke JPEG dengan quality setting
    const compressed = await pipeline
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toBuffer();

    const compressedSize = compressed.length;
    const ratio = Math.round((1 - compressedSize / originalSize) * 100);
    const outPath = getTmpFile("jpg");
    fs.writeFileSync(outPath, compressed);

    let caption = "IMAGE COMPRESSOR\n\n";
    caption += "Sebelum: " + formatSize(originalSize) + "\n";
    caption += "Sesudah: " + formatSize(compressedSize) + "\n";
    caption += "Pengurangan: " + (ratio > 0 ? ratio + "%" : "0% (sudah optimal)") + "\n";
    caption += "Quality: " + quality + "%\n";
    if (meta.width > 1920 || meta.height > 1920) {
      caption += "Resize: " + meta.width + "x" + meta.height + " -> max 1920px\n";
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: { url: outPath },
      caption: caption,
    }, { quoted: m });

    cleanup(outPath);
  } catch (e) {
    await m.react("❌");
    return m.reply("Gagal kompres gambar: " + e.message);
  }
}

export { pluginConfig as config, handler };
