// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Tools — Kompres, konversi, resize, crop, border, mirror (all local via sharp)
import sharp from "sharp";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "phototools",
  alias: ["phototools", "fototools", "photocompress", "photoconvert", "photoresize", "photocrop", "photoborder", "photomirror"],
  category: "tools",
  description: "Photo Tools — kompres, konversi, resize, crop, border, mirror foto (local, no API)",
  usage: ".phototools <command> (reply gambar)\n.phototools list — Lihat semua command",
  example: ".phototools compress (reply gambar)\n.phototools convert webp (reply gambar)\n.phototools resize 512 (reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const COMMANDS = {
  compress: { desc: "Kompres ukuran file gambar", usage: ".phototools compress [quality 1-100]", extra: "Default quality: 60" },
  convert: { desc: "Konversi format (jpg, png, webp, avif)", usage: ".phototools convert <format>", extra: "Format: jpg, png, webp, avif" },
  resize: { desc: "Resize dimensi gambar", usage: ".phototools resize <width> [height]", extra: "Contoh: resize 512 | resize 800 600" },
  crop: { desc: "Crop gambar (aspect ratio)", usage: ".phototools crop <ratio>", extra: "Ratio: 1:1, 4:3, 3:4, 16:9, 9:16" },
  border: { desc: "Tambah border berwarna", usage: ".phototools border <warna> [tebal]", extra: "Contoh: border red 20 | border #0000ff 10" },
  mirror: { desc: "Mirror/flip gambar", usage: ".phototools mirror <arah>", extra: "Arah: horizontal, vertical, both" },
  rotate: { desc: "Rotasi gambar", usage: ".phototools rotate <derajat>", extra: "Derajat: 90, 180, 270" },
  grayscale: { desc: "Convert ke hitam putih", usage: ".phototools grayscale", extra: "No extra args" },
  invert: { desc: "Invert/negatif warna", usage: ".phototools invert", extra: "No extra args" },
  tint: { desc: "Tint warna", usage: ".phototools tint <warna>", extra: "Contoh: tint red | tint #ff0000" },
  extend: { desc: "Extend aspect ratio (square to landscape)", usage: ".phototools extend <ratio> [mode]", extra: "Ratio: 16:9, 4:3, 3:2 | Mode: blur (default), solid <warna>" },
};

const COLOR_MAP = {
  red: "#ff0000", green: "#00ff00", blue: "#0000ff", white: "#ffffff",
  black: "#000000", yellow: "#ffff00", cyan: "#00ffff", magenta: "#ff00ff",
  orange: "#ff8800", purple: "#8800ff", pink: "#ff0088", lime: "#88ff00",
  navy: "#000080", gold: "#ffd700", silver: "#c0c0c0", brown: "#8b4513",
};

function resolveColor(input) {
  if (!input) return "#000000";
  const lower = input.toLowerCase().trim();
  if (lower.startsWith("#")) return lower;
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  return lower;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const cmd = (args[0] || "").toLowerCase().trim();

    if (!cmd || cmd === "list" || cmd === "help") {
      const lines = [
        "PHOTO TOOLS (Local, no API)",
        "Kompres, convert, resize, crop, border, mirror, rotate",
        "",
        "COMMANDS:",
      ];
      let i = 1;
      for (const [key, info] of Object.entries(COMMANDS)) {
        lines.push(i + ". " + key + " - " + info.desc);
        lines.push("   " + info.usage);
        i++;
      }
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push("Reply gambar lalu ketik command di atas");
      lines.push("");
      lines.push("Contoh:");
      lines.push(usedPrefix + "phototools compress");
      lines.push(usedPrefix + "phototools convert webp");
      lines.push(usedPrefix + "phototools resize 512");
      lines.push(usedPrefix + "phototools crop 1:1");
      return m.reply(claraWrap("Photo Tools", lines, "info"));
    }

    if (!COMMANDS[cmd]) {
      const available = Object.keys(COMMANDS).join(", ");
      return m.reply(claraWrap("Photo Tools", [
        "Command tidak ditemukan: " + cmd,
        "",
        "Tersedia: " + available,
        "",
        "Ketik " + usedPrefix + "phototools list",
      ], "warn"));
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("Photo Tools", [
        "Reply gambar dulu, lalu ketik:",
        usedPrefix + "phototools " + cmd,
        "",
        "Command: " + cmd + " - " + COMMANDS[cmd].desc,
      ], "warn"));
    }

    m.reply(claraWrap("Photo Tools", "Processing: " + cmd + "..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(claraWrap("Photo Tools", "Gagal download gambar.", "warn"));
    }

    const originalSize = imgBuffer.length;
    let result;
    let outputMime = "image/png";
    let caption = cmd.toUpperCase() + " result | Original: " + (originalSize / 1024).toFixed(1) + "KB";

    switch (cmd) {
      case "compress": {
        const quality = parseInt(args[1]) || 60;
        const q = Math.max(1, Math.min(100, quality));
        result = await sharp(imgBuffer, { failOn: "none" })
          .jpeg({ quality: q, mozjpeg: true })
          .toBuffer();
        outputMime = "image/jpeg";
        caption += " -> Result: " + (result.length / 1024).toFixed(1) + "KB (Q:" + q + ")";
        break;
      }

      case "convert": {
        const format = (args[1] || "jpg").toLowerCase().trim();
        const formats = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", avif: "avif" };
        const fmt = formats[format];
        if (!fmt) throw new Error("Format tidak didukung: " + format + ". Tersedia: jpg, png, webp, avif");
        result = await sharp(imgBuffer, { failOn: "none" })[fmt]({ quality: 90 }).toBuffer();
        outputMime = "image/" + fmt;
        caption += " -> Format: " + fmt.toUpperCase() + " (" + (result.length / 1024).toFixed(1) + "KB)";
        break;
      }

      case "resize": {
        const width = parseInt(args[1]) || 512;
        const height = parseInt(args[2]) || null;
        const resizeOpts = { width: Math.max(16, Math.min(4096, width)), withoutEnlargement: true };
        if (height) {
          resizeOpts.height = Math.max(16, Math.min(4096, height));
          resizeOpts.fit = "cover";
        } else {
          resizeOpts.fit = "inside";
        }
        result = await sharp(imgBuffer, { failOn: "none" }).resize(resizeOpts).png().toBuffer();
        caption += " -> Size: " + width + (height ? "x" + height : "px");
        break;
      }

      case "crop": {
        const ratioInput = (args[1] || "1:1").trim();
        const [rw, rh] = ratioInput.split(":").map(Number);
        if (!rw || !rh) throw new Error("Format ratio salah. Contoh: 1:1, 4:3, 16:9");
        const meta = await sharp(imgBuffer).metadata();
        const targetW = meta.width;
        const targetH = Math.round((meta.width * rh) / rw);
        const finalH = Math.min(targetH, meta.height);
        const finalW = Math.round((finalH * rw) / rh);
        result = await sharp(imgBuffer, { failOn: "none" })
          .resize({ width: finalW, height: finalH, fit: "cover", position: "center" })
          .png()
          .toBuffer();
        caption += " -> Ratio: " + ratioInput + " (" + finalW + "x" + finalH + "px)";
        break;
      }

      case "border": {
        const color = resolveColor(args[1] || "white");
        const thickness = Math.max(1, Math.min(200, parseInt(args[2]) || 20));
        const meta = await sharp(imgBuffer).metadata();
        result = await sharp(imgBuffer, { failOn: "none" })
          .extend({
            top: thickness,
            bottom: thickness,
            left: thickness,
            right: thickness,
            background: color,
          })
          .png()
          .toBuffer();
        caption += " -> Border: " + color + " (" + thickness + "px)";
        break;
      }

      case "mirror": {
        const dir = (args[1] || "horizontal").toLowerCase().trim();
        let flipFn;
        if (dir === "horizontal" || dir === "h") flipFn = (img) => img.flip();
        else if (dir === "vertical" || dir === "v") flipFn = (img) => img.flop();
        else if (dir === "both" || dir === "b") flipFn = (img) => img.flip().flop();
        else throw new Error("Arah tidak valid: " + dir + ". Tersedia: horizontal, vertical, both");
        result = await flipFn(sharp(imgBuffer, { failOn: "none" })).png().toBuffer();
        caption += " -> Mirror: " + dir;
        break;
      }

      case "rotate": {
        const angle = parseInt(args[1]) || 90;
        const valid = [90, 180, 270];
        if (!valid.includes(angle)) throw new Error("Derajat tidak valid: " + angle + ". Tersedia: 90, 180, 270");
        result = await sharp(imgBuffer, { failOn: "none" }).rotate(angle).png().toBuffer();
        caption += " -> Rotate: " + angle + "deg";
        break;
      }

      case "grayscale": {
        result = await sharp(imgBuffer, { failOn: "none" }).grayscale().png().toBuffer();
        caption += " -> Grayscale";
        break;
      }

      case "invert": {
        result = await sharp(imgBuffer, { failOn: "none" }).negate().png().toBuffer();
        caption += " -> Invert";
        break;
      }

      case "tint": {
        const tintColor = resolveColor(args[1] || "red");
        result = await sharp(imgBuffer, { failOn: "none" }).tint(tintColor).png().toBuffer();
        caption += " -> Tint: " + tintColor;
        break;
      }

      case "extend": {
        const ratioInput = (args[1] || "16:9").trim();
        const [erw, erh] = ratioInput.split(":").map(Number);
        if (!erw || !erh) throw new Error("Format ratio salah. Contoh: 16:9, 4:3, 3:2");
        const mode = (args[2] || "blur").toLowerCase().trim();

        const meta = await sharp(imgBuffer).metadata();
        const srcW = meta.width;
        const srcH = meta.height;

        // Target canvas size based on ratio
        let canvasW, canvasH;
        if (erw >= erh) {
          // Landscape — width based
          canvasW = srcW;
          canvasH = Math.round((srcW * erh) / erw);
          if (canvasH > srcH) {
            canvasH = srcH;
            canvasW = Math.round((srcH * erw) / erh);
          }
        } else {
          // Portrait — height based
          canvasH = srcH;
          canvasW = Math.round((srcH * erw) / erh);
          if (canvasW > srcW) {
            canvasW = srcW;
            canvasH = Math.round((srcW * erh) / erw);
          }
        }

        // Scale up the source image to fill the canvas, then blur
        const blurred = await sharp(imgBuffer, { failOn: "none" })
          .resize(canvasW, canvasH, { fit: "cover", position: "center" })
          .modulate({ brightness: 0.6, saturation: 1.3 })
          .blur(30)
          .png()
          .toBuffer();

        // Resize original to fit inside canvas (contain)
        const inner = await sharp(imgBuffer, { failOn: "none" })
          .resize(canvasW, canvasH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();

        if (mode === "solid") {
          const solidColor = resolveColor(args[3] || "black");
          result = await sharp({
            create: {
              width: canvasW,
              height: canvasH,
              channels: 4,
              background: solidColor,
            }
          })
          .composite([{ input: inner, blend: "over" }])
          .png()
          .toBuffer();
          caption += " -> Extend: " + ratioInput + " (" + canvasW + "x" + canvasH + "px) solid:" + solidColor;
        } else {
          result = await sharp(blurred)
            .composite([{ input: inner, blend: "over" }])
            .png()
            .toBuffer();
          caption += " -> Extend: " + ratioInput + " (" + canvasW + "x" + canvasH + "px) blur";
        }
        break;
      }

      default:
        throw new Error("Command tidak dikenali: " + cmd);
    }

    if (!result || result.length === 0) {
      return m.reply(claraWrap("Photo Tools", "Gagal processing. Coba gambar lain.", "warn"));
    }

    caption += "\nPowered by sharp (local, no API)";

    await conn.sendMessage(
      m.key.remoteJid,
      { image: result, caption: claraWrap("Photo Tools", caption, "info") },
      { quoted: m }
    );
  } catch (e) {
    console.error("[PhotoTools]", e);
    m.reply(claraWrap("Photo Tools", [
      "Error: " + e.message,
      "",
      "Ketik " + usedPrefix + "phototools list untuk bantuan",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
