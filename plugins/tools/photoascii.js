// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Photo ASCII — Convert foto ke ASCII art (local via sharp, no API)
import sharp from "sharp";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "photoascii",
  alias: ["photoascii"],
  category: "tools",
  description: "Photo ASCII — Convert foto ke ASCII art text (local, no API)",
  usage: ".photoascii (reply gambar)\n.photoascii <width> (reply gambar)",
  example: ".photoascii (reply gambar)\n.photoascii 80 (reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ASCII chars dari gelap ke terang
const CHARS = "@%#*+=-:. ";
// Alternative set lebih detail
const CHARS_DETAIL = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

function pixelToChar(brightness, charSet) {
  const idx = Math.floor((brightness / 255) * (charSet.length - 1));
  return charSet[idx];
}

async function imgToAscii(buffer, targetWidth, detail) {
  const charSet = detail ? CHARS_DETAIL : CHARS;

  // Resize ke target width, keep aspect ratio, convert to grayscale
  const meta = await sharp(buffer).metadata();
  const aspectRatio = meta.height / meta.width;
  // ASCII chars tingginya ~2x lebarnya, jadi bagi height 2
  const targetHeight = Math.round(targetWidth * aspectRatio * 0.5);

  const { data, info } = await sharp(buffer, { failOn: "none" })
    .resize({ width: targetWidth, height: targetHeight, fit: "cover" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let ascii = "";
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const brightness = data[idx];
      ascii += pixelToChar(brightness, charSet);
    }
    ascii += "\n";
  }

  return ascii;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    // Get image from reply
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";

    if (!mime || !mime.startsWith("image/")) {
      return m.reply(raraWrap("Photo ASCII", [
        "Reply gambar dulu, lalu ketik:",
        usedPrefix + "photoascii",
        "",
        "Opsi: " + usedPrefix + "photoascii <width> (40-120)",
        "Contoh: " + usedPrefix + "photoascii 80",
      ], "warn"));
    }

    // Parse width
    let width = parseInt(args[0]) || 60;
    width = Math.max(20, Math.min(150, width));

    const detail = args[1] === "detail" || args[1] === "d";

    m.reply(raraWrap("Photo ASCII", "Converting ke ASCII art..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(raraWrap("Photo ASCII", "Gagal download gambar.", "warn"));
    }

    const ascii = await imgToAscii(imgBuffer, width, detail);

    if (!ascii || ascii.length === 0) {
      return m.reply(raraWrap("Photo ASCII", "Gagal convert ASCII.", "warn"));
    }

    // Send as monospace text
    let result = "```\n" + ascii + "\n```";
    // WhatsApp monospace max ~65536 chars
    if (result.length > 60000) {
      result = "```\n" + ascii.substring(0, 60000) + "\n```";
    }

    await m.react("🐣");
    m.reply(raraWrap("Photo ASCII", [
      "Width: " + width + " chars",
      detail ? "Mode: Detail" : "Mode: Standard",
      "",
      result,
    ], "info"));
  } catch (e) {
    await m.react("❌");
    console.error("[PhotoASCII]", e);
    m.reply(raraWrap("Photo ASCII", [
      "Error: " + e.message,
      "",
      "Kemungkinan:",
      "1. Format gambar tidak didukung",
      "2. Coba width lebih kecil (40-60)",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
