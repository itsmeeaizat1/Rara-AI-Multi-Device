// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import sharp from "sharp";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraBerhasil } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "nowm",
  alias: ["nowm"],
  category: "maker",
  description: "Hapus watermark/logo/teks dari gambar (AI inpainting via ClipDrop)",
  usage: ".nowm (reply gambar) | .nowm <posisi> (reply gambar)",
  example: ".nowm | .nowm center | .nowm top-right",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const POSITIONS = {
  "top-left": { x: 0, y: 0, w: 0.3, h: 0.3 },
  "top-right": { x: 0.7, y: 0, w: 0.3, h: 0.3 },
  "top": { x: 0.2, y: 0, w: 0.6, h: 0.2 },
  "center": { x: 0.25, y: 0.3, w: 0.5, h: 0.4 },
  "bottom-left": { x: 0, y: 0.7, w: 0.3, h: 0.3 },
  "bottom-right": { x: 0.7, y: 0.7, w: 0.3, h: 0.3 },
  "bottom": { x: 0.2, y: 0.8, w: 0.6, h: 0.2 },
  "left": { x: 0, y: 0.3, w: 0.2, h: 0.4 },
  "right": { x: 0.8, y: 0.3, w: 0.2, h: 0.4 },
  "all": { x: 0, y: 0, w: 1, h: 1 },
};

async function getImageMeta(buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width, height: meta.height };
}

async function autoGenerateMask(imageBuffer, position) {
  const { width, height } = await getImageMeta(imageBuffer);

  // Get raw grayscale pixel data
  const rawData = await sharp(imageBuffer)
    .resize(Math.min(width, 800), Math.min(height, 800), { fit: "inside" })
    .greyscale()
    .raw()
    .toBuffer();

  const scaledW = Math.min(width, 800);
  const scaledH = Math.min(height, 800);

  // Create mask buffer (0 = keep, 255 = remove)
  const maskData = Buffer.alloc(scaledW * scaledH, 0);

  if (position && POSITIONS[position]) {
    // Region mode: fill specific area with white
    const pos = POSITIONS[position];
    const x1 = Math.floor(pos.x * scaledW);
    const y1 = Math.floor(pos.y * scaledH);
    const x2 = Math.min(Math.floor((pos.x + pos.w) * scaledW), scaledW);
    const y2 = Math.min(Math.floor((pos.y + pos.h) * scaledH), scaledH);
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        maskData[y * scaledW + x] = 255;
      }
    }
  } else {
    // Auto mode: detect bright areas with contrast (text/watermark-like)
    const brightnessThreshold = 200;
    const minContrast = 25;
    const radius = 2;

    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        const idx = y * scaledW + x;
        const brightness = rawData[idx];

        if (brightness > brightnessThreshold) {
          let maxDiff = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= scaledW || ny >= scaledH) continue;
              const nBrightness = rawData[ny * scaledW + nx];
              const diff = Math.abs(brightness - nBrightness);
              if (diff > maxDiff) maxDiff = diff;
            }
          }
          if (maxDiff > minContrast) {
            maskData[idx] = 255;
          }
        }
      }
    }

    // Dilate mask (expand white areas by a few pixels)
    const dilated = Buffer.alloc(scaledW * scaledH, 0);
    const dilateRadius = 3;
    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        if (maskData[y * scaledW + x] === 255) {
          for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
            for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= scaledW || ny >= scaledH) continue;
              dilated[ny * scaledW + nx] = 255;
            }
          }
        }
      }
    }
    dilated.copy(maskData);
  }

  // Create PNG mask from raw data (single channel -> grayscale PNG)
  const maskPng = await sharp(maskData, {
    raw: { width: scaledW, height: scaledH, channels: 1 },
  })
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  return maskPng;
}

async function localWatermarkRemove(imageBuffer, maskBuffer) {
  // Fallback: local content-aware fill using sharp
  const { width, height } = await getImageMeta(imageBuffer);

  // Get image pixels
  const imgData = await sharp(imageBuffer)
    .resize(Math.min(width, 800), Math.min(height, 800), { fit: "inside" })
    .raw()
    .toBuffer();

  const scaledW = Math.min(width, 800);
  const scaledH = Math.min(height, 800);
  const channels = 3;

  // Get mask at same scale
  const maskData = await sharp(maskBuffer)
    .resize(scaledW, scaledH, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  // For each masked pixel, sample surrounding non-masked pixels
  const result = Buffer.from(imgData);

  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const mIdx = y * scaledW + x;
      if (maskData[mIdx] > 128) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let radius = 5; radius <= 30 && count < 8; radius += 5) {
          for (let angle = 0; angle < 360; angle += 45) {
            const nx = Math.round(x + Math.cos((angle * Math.PI) / 180) * radius);
            const ny = Math.round(y + Math.sin((angle * Math.PI) / 180) * radius);
            if (nx < 0 || ny < 0 || nx >= scaledW || ny >= scaledH) continue;
            const nMIdx = ny * scaledW + nx;
            if (maskData[nMIdx] > 128) continue;
            const nIdx = ny * scaledW * channels + nx * channels;
            r += imgData[nIdx];
            g += imgData[nIdx + 1];
            b += imgData[nIdx + 2];
            count++;
          }
        }
        if (count > 0) {
          const idx = y * scaledW * channels + x * channels;
          result[idx] = Math.round(r / count);
          result[idx + 1] = Math.round(g / count);
          result[idx + 2] = Math.round(b / count);
        }
      }
    }
  }

  return sharp(result, {
    raw: { width: scaledW, height: scaledH, channels },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function clipdropCleanup(imageBuffer, maskBuffer, apiKey) {
  const FormData = (await import("form-data")).default;
  const axios = (await import("axios")).default;

  const form = new FormData();
  form.append("image_file", imageBuffer, {
    filename: "image.jpg",
    contentType: "image/jpeg",
  });
  form.append("mask_file", maskBuffer, {
    filename: "mask.png",
    contentType: "image/png",
  });
  form.append("mode", "fast");

  const response = await axios.post("https://clipdrop-api.co/cleanup/v1", form, {
    headers: {
      "x-api-key": apiKey,
      ...form.getHeaders(),
    },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(response.data);
}

async function handler(m, { sock }) {
  const qmsg = m.quoted || m;
  const isImage =
    qmsg.isImage ||
    qmsg.type === "imageMessage" ||
    qmsg.mtype === "imageMessage" ||
    qmsg.mimetype?.includes("image");

  if (!isImage) {
    return m.reply(raraWrap("nowm", [
      "Hapus watermark, logo, teks, atau object dari gambar.",
      "",
      "📌 Format:",
      `${m.prefix}nowm (reply gambar) — auto detect watermark`,
      `${m.prefix}nowm center (reply gambar) — hapus area tengah`,
      `${m.prefix}nowm top-right (reply gambar) — hapus area kanan atas`,
      "",
      "Posisi yang didukung: top-left, top-right, top, center,",
      "bottom-left, bottom-right, bottom, left, right, all",
      "",
      `💡 Contoh: ${m.prefix}nowm center`,
      "",
      "Pakai ClipDrop AI API (100 free credits), fallback lokal otomatis.",
    ]));
  }

  const input = m.text?.trim().toLowerCase() || "";
  const position = POSITIONS[input] ? input : null;
  const apiKey = config.ai?.clipdropApiKey || config.clipdropApiKey || "";
  try {
    const imageBuffer = await qmsg.download();
    if (!imageBuffer) {
      return m.reply(raraWrap("nowm", "Gagal download gambar. Coba lagi."));
    }

    // Resize if too large (ClipDrop max 16MP, but keep small for speed)
    let processedBuffer = imageBuffer;
    const meta = await sharp(imageBuffer).metadata();
    if (meta.width > 1280 || meta.height > 1280) {
      processedBuffer = await sharp(imageBuffer)
        .resize(1280, 1280, { fit: "inside" })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    await m.react("🕒");

    // Generate mask
    const maskBuffer = await autoGenerateMask(processedBuffer, position);

    let resultBuffer;
    let usedApi = false;

    if (apiKey) {
      try {
        resultBuffer = await clipdropCleanup(processedBuffer, maskBuffer, apiKey);
        usedApi = true;
      } catch (apiErr) {
        const status = apiErr.response?.status;
        const errMsg = status === 402
          ? "ClipDrop credits habis. Fallback ke local mode."
          : status === 401
            ? "API key tidak valid. Fallback ke local mode."
            : "ClipDrop error (" + (apiErr.message || "unknown") + "). Fallback ke local mode.";
        await m.reply(raraWrap("nowm", errMsg));
        resultBuffer = await localWatermarkRemove(processedBuffer, maskBuffer);
      }
    } else {
      resultBuffer = await localWatermarkRemove(processedBuffer, maskBuffer);
    }

    if (!resultBuffer) {
      return m.reply(raraWrap("nowm", "Gagal memproses gambar. Coba gambar lain."));
    }
    await m.react("🐣");
    await sock.sendMessage(
      m.chat,
      {
        image: resultBuffer,
        caption: raraBerhasil() + "\nEngine: " + (usedApi ? "ClipDrop AI" : "Local"),
      },
      { quoted: m },
    );
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("nowm", "Gagal: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
