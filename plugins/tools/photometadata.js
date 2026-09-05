// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Metadata — Baca EXIF & metadata foto (local via sharp, no API)
import sharp from "sharp";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "photometadata",
  alias: ["photometadata"],
  category: "tools",
  description: "Photo Metadata — Baca EXIF & metadata foto (local, no API)",
  usage: ".photometadata (reply gambar)",
  example: ".photometadata (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MIME_LABELS = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/tiff": "TIFF",
};

const EXIF_TAG_NAMES = {
  Make: "Kamera",
  Model: "Model",
  LensModel: "Lens",
  FocalLength: "Focal Length",
  FNumber: "Aperture (f/)",
  ExposureTime: "Shutter Speed",
  ISO: "ISO",
  DateTimeOriginal: "Tanggal Ambil",
  GPSLatitude: "Latitude GPS",
  GPSLongitude: "Longitude GPS",
  GPSAltitude: "Altitude GPS",
  Orientation: "Orientasi",
  WhiteBalance: "White Balance",
  Flash: "Flash",
  ExposureMode: "Mode Exposure",
  SceneCaptureType: "Scene Type",
  Software: "Software",
  Artist: "Artist",
  Copyright: "Copyright",
};

function formatExposureTime(val) {
  if (!val) return "N/A";
  if (val < 1) return "1/" + Math.round(1 / val) + "s";
  return val + "s";
}

function formatGPS(val) {
  if (!val) return "N/A";
  return val.toFixed(6);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";

    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("Photo Metadata", [
        "Reply foto dulu, lalu ketik:",
        usedPrefix + "photometadata",
        "",
        "Bakal nampilin: dimensi, format, ukuran, EXIF (kalo ada)",
      ], "warn"));
    }

    m.reply(claraWrap("Photo Metadata", "Membaca metadata foto..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(claraWrap("Photo Metadata", "Gagal download gambar.", "warn"));
    }

    const meta = await sharp(imgBuffer).metadata();

    const fileSize = imgBuffer.length;
    const sizeKB = (fileSize / 1024).toFixed(1);
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const sizeStr = fileSize > 1024 * 1024 ? sizeMB + " MB" : sizeKB + " KB";

    const format = MIME_LABELS[mime] || meta.format?.toUpperCase() || "Unknown";
    const width = meta.width || "N/A";
    const height = meta.height || "N/A";
    const channels = meta.channels || "N/A";
    const hasAlpha = meta.hasAlpha ? "Yes" : "No";
    const hasProfile = meta.hasProfile ? "Yes" : "No";
    const density = meta.density ? meta.density + " DPI" : "N/A";

    const lines = [
      "INFO FOTO",
      "",
      "DIMENSI & FORMAT:",
      "Format: " + format,
      "Ukuran: " + width + " x " + height + " px",
      "Channels: " + channels,
      "File size: " + sizeStr,
      "Alpha channel: " + hasAlpha,
      "Color profile: " + hasProfile,
      "Density: " + density,
    ];

    // EXIF data
    if (meta.exif) {
      lines.push("");
      lines.push("EXIF DATA:");

      // Parse EXIF tags from raw buffer
      const exif = meta.exif;
      const exifStr = exif.toString("utf-8").replace(/\0/g, "");

      // Extract common EXIF tags
      const tags = {};
      const tagPattern = /([A-Za-z]+)\x00([^\x00]+)/g;
      let match;
      while ((match = tagPattern.exec(exifStr)) !== null) {
        const tag = match[1].trim();
        const val = match[2].trim();
        if (tag && val && val.length > 0 && val.length < 200) {
          tags[tag] = val;
        }
      }

      // Also try to find EXIF as structured data
      try {
        // sharp can parse some EXIF directly
        if (meta.exif) {
          const rawStr = exif.toString("binary");
          // Look for common patterns
          const patterns = {
            Make: /Make\x00\x00([^\x00]+)/,
            Model: /Model\x00\x00([^\x00]+)/,
            Software: /Software\x00\x00([^\x00]+)/,
            DateTimeOriginal: /DateTimeOriginal\x00([^\x00]+)/,
          };
          for (const [key, pattern] of Object.entries(patterns)) {
            const m = rawStr.match(pattern);
            if (m && m[1]) {
              tags[key] = m[1].trim();
            }
          }
        }
      } catch (e) { /* ignore parse errors */ }

      if (Object.keys(tags).length > 0) {
        for (const [key, val] of Object.entries(tags)) {
          const label = EXIF_TAG_NAMES[key] || key;
          let displayVal = val;
          if (key === "ExposureTime") displayVal = formatExposureTime(parseFloat(val));
          if (key === "GPSLatitude" || key === "GPSLongitude") displayVal = formatGPS(parseFloat(val));
          lines.push(label + ": " + displayVal);
        }
      } else {
        lines.push("Tidak ada EXIF terbaca");
        lines.push("(Mungkin sudah di-strip atau dari screenshot)");
      }
    } else {
      lines.push("");
      lines.push("EXIF: Tidak ada (gambar tanpa metadata)");
      lines.push("(Biasanya screenshot, download, atau sudah di-compress)");
    }

    // Additional info
    lines.push("");
    lines.push("Sharp version: " + (sharp.versions?.sharp || "N/A"));

    await m.react("🐣");
    return m.reply(claraWrap("Photo Metadata", lines, "info"));
  } catch (e) {
    await m.react("❌");
    console.error("[PhotoMetadata]", e);
    m.reply(claraWrap("Photo Metadata", [
      "Error: " + e.message,
      "",
      "Kemungkinan:",
      "1. Format gambar tidak didukung",
      "2. File corrupt",
      "3. Coba foto lain",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
