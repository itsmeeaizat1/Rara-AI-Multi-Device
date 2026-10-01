// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// stickerfilter.js — Apply filter ke sticker (local @napi-rs/canvas, no API)
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { addExifToWebp } from "../../src/lib/nova-exif.js";
import { novaWrap, novaError, novaGuide, novaNoQuoted, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "stickerfilter",
  alias: ["stickerfilter", "sfilter"],
  category: "sticker",
  description: "Tambah filter ke sticker (blur, grayscale, invert, sepia, circle)",
  usage: ".stickerfilter <filter>",
  example: ".stickerfilter blur",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const FILTERS = ["blur", "grayscale", "invert", "sepia", "circle", "brightness", "contrast", "glitch"];

async function applyFilter(imageBuffer, filter) {
  const image = await loadImage(imageBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0, image.width, image.height);

  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;

  switch (filter) {
    case "blur":
      ctx.filter = "blur(5px)";
      ctx.drawImage(canvas, 0, 0);
      break;

    case "grayscale":
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      break;

    case "invert":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      ctx.putImageData(imageData, 0, 0);
      break;

    case "sepia":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      ctx.putImageData(imageData, 0, 0);
      break;

    case "circle":
      ctx.clearRect(0, 0, image.width, image.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(image.width / 2, image.height / 2, Math.min(image.width, image.height) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, 0, 0, image.width, image.height);
      ctx.restore();
      break;

    case "brightness":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + 50);
        data[i + 1] = Math.min(255, data[i + 1] + 50);
        data[i + 2] = Math.min(255, data[i + 2] + 50);
      }
      ctx.putImageData(imageData, 0, 0);
      break;

    case "contrast":
      const factor = 1.5;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
      }
      ctx.putImageData(imageData, 0, 0);
      break;

    case "glitch":
      // Simple glitch: shift color channels
      ctx.clearRect(0, 0, image.width, image.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(image, 0, 0);
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(image, 5, 0);  // Red shift
      ctx.drawImage(image, -5, 0);  // Blue shift
      ctx.globalCompositeOperation = "source-over";
      break;

    default:
      throw new Error("Filter tidak dikenal");
  }

  return canvas.toBuffer("image/png");
}

async function handler(m, { sock }) {
  const filter = m.args?.[0]?.toLowerCase();

  if (!filter) {
    return m.reply(novaWrap("Sticker Filter", `Filter tersedia: ${FILTERS.join(", ")}\n\nReply sticker dulu lalu ketik .stickerfilter <filter>`, "guide"));
  }

  if (!FILTERS.includes(filter)) {
    return m.reply(novaError("Sticker Filter", `Filter tidak valid! Pilih: ${FILTERS.join(", ")}`));
  }

  if (!m.quoted || !m.quoted.sticker) {
    return m.reply(novaNoQuoted("Sticker Filter", "sticker"));
  }

  try {
    await m.react("🕒");
    const stickerBuffer = await m.quoted.download();
    if (!stickerBuffer || stickerBuffer.length < 100) {
      return m.reply(novaGagal("Sticker Filter"));
    }

    const filteredBuffer = await applyFilter(stickerBuffer, filter);

    let exifBuf = filteredBuffer;
    try {
      exifBuf = await addExifToWebp(filteredBuffer, "Nova AI", `Filter: ${filter}`);
    } catch (e) {
      console.log("[stickerfilter] exif:", e.message);
    }

    await sock.sendMessage(m.chat, { sticker: exifBuf }, { quoted: m });
    await m.react("🐣");
    await m.reply(novaBerhasil("stickerfilter"));
  } catch (err) {
    console.error("[StickerFilter]", err);
    await m.react("❌");
    m.reply(novaWrap("stickerfilter", "Gagal apply filter ke sticker. Coba lagi!", "error"));
  }
}

export { pluginConfig as config, handler };
