// plugins/sticker/smemev2.js
// Local Meme Sticker Generator - 100% local, no third-party API
// Uses skia-canvas + Anton font (Impact-like) for classic meme text overlay
// Command: .smemev2 top text | bottom text (reply to image/sticker)

import fs from "fs";
import path from "path";
import { Canvas, loadImage, FontLibrary } from "skia-canvas";
import sharp from "sharp";
import { config } from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// Register Anton font (Impact-like, free Google Font)
const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "Anton.ttf");
if (fs.existsSync(FONT_PATH)) {
  FontLibrary.use("Anton", FONT_PATH);
}

// ─── Word wrap function ───
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}

// ─── Draw meme text on canvas ───
function drawMemeText(ctx, text, canvasWidth, canvasHeight, isTop) {
  if (!text || text.trim() === "") return;

  text = text.toUpperCase();
  const padding = canvasWidth * 0.04;
  const maxTextWidth = canvasWidth - padding * 2;

  // Auto-size font based on image width
  let fontSize = Math.floor(canvasWidth / 8);
  ctx.font = `${fontSize}px Anton`;
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = Math.max(2, fontSize / 15);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Wrap text and scale down if too tall
  let lines = wrapText(ctx, text, maxTextWidth);
  const maxLinesHeight = canvasHeight * 0.35;
  let totalHeight = lines.length * fontSize * 1.1;
  let scaleReductions = 0;
  while (totalHeight > maxLinesHeight && fontSize > 12 && scaleReductions < 10) {
    fontSize = Math.floor(fontSize * 0.85);
    ctx.font = `${fontSize}px Anton`;
    ctx.lineWidth = Math.max(2, fontSize / 15);
    lines = wrapText(ctx, text, maxTextWidth);
    totalHeight = lines.length * fontSize * 1.1;
    scaleReductions++;
  }

  const finalLineHeight = fontSize * 1.1;
  let startY;

  if (isTop) {
    startY = padding * 0.5;
  } else {
    startY = canvasHeight - padding * 0.5 - lines.length * finalLineHeight;
  }

  // Draw each line: stroke (outline) first, then fill
  ctx.lineJoin = "round";
  for (let i = 0; i < lines.length; i++) {
    const x = canvasWidth / 2;
    const y = startY + i * finalLineHeight;
    ctx.strokeText(lines[i], x, y);
    ctx.fillText(lines[i], x, y);
  }
}

// ─── Generate meme image locally ───
async function generateMeme(imageBuffer, topText, bottomText) {
  const img = await loadImage(imageBuffer);
  const w = img.width;
  const h = img.height;

  const canvas = new Canvas(w, h);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, w, h);
  drawMemeText(ctx, topText, w, h, true);
  drawMemeText(ctx, bottomText, w, h, false);

  return await canvas.png;
}

// ─── Plugin Config ───
const pluginConfig = {
  name: "smemev2",
  alias: ["smemev2", "memelocal", "smemelocal"],
  category: "sticker",
  description: "Membuat sticker meme dari gambar (100% lokal, tanpa API)",
  usage: ".smemev2 <top>|<bottom>",
  example: ".smemev2 Ketika|Kamu Lupa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// ─── Handler ───
async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && m.quoted.isImage);
    const isSticker =
      m.isSticker ||
      (m.quoted && (m.quoted.isSticker || m.quoted.type === "stickerMessage"));

    if (!isImage && !isSticker) {
      const help = claraWrap(
        "smemev2",
        [
          "Meme Sticker Lokal (tanpa API)",
          "",
          "Reply atau kirim gambar/sticker dengan caption:",
          "",
          ".smemev2 top text|bottom text",
          ".smemev2 top text (atas saja)",
          ".smemev2 |bottom text (bawah saja)",
          "",
          "Contoh: .smemev2 Ketika|Kamu Lupa",
          "",
          "100% diproses di server, gak kirim gambar ke API mana pun.",
        ].join("\n")
      );
      await sendReplyWithNav(m, sock, help, { commandName: "smemev2" });
      return;
    }

    const input = m.args.join(" ").trim();

    let topText = "";
    let bottomText = "";

    if (input.includes("|")) {
      const parts = input.split("|");
      topText = (parts[0] || "").trim();
      bottomText = (parts[1] || "").trim();
    } else if (input.length > 0) {
      topText = input;
    } else {
      const help = claraWrap(
        "smemev2",
        [
          "Format: .smemev2 top|bottom",
          "",
          "Contoh: .smemev2 Ketika|Kamu Lupa",
          "Contoh: .smemev2 Top text saja",
          "Contoh: .smemev2 |Bottom text saja",
        ].join("\n")
      );
      await sendReplyWithNav(m, sock, help, { commandName: "smemev2" });
      return;
    }

    await m.react("🕐");

    // Download media
    let mediaBuffer;
    if (m.quoted) {
      mediaBuffer = await m.quoted.download();
    } else if (m.download) {
      mediaBuffer = await m.download();
    }

    if (!mediaBuffer) {
      await m.reply(claraWrap("smemev2", "Gagal mengunduh media. Coba reply ke gambar/sticker-nya lagi."));
      return;
    }

    // If sticker (webp), convert to PNG first
    if (isSticker) {
      try {
        mediaBuffer = await sharp(mediaBuffer).png().toBuffer();
      } catch (e) {
        console.log("[SMEMEV2] Sticker to PNG failed:", e.message);
      }
    }

    // Generate meme locally
    let memeBuffer;
    try {
      memeBuffer = await generateMeme(mediaBuffer, topText, bottomText);
    } catch (e) {
      console.error("[SMEMEV2] Generate failed:", e.message);
      await m.reply(claraWrap("smemev2", "Gagal generate meme. Mungkin format gambar tidak didukung."));
      return;
    }

    // Resize to sticker size (512x512) and convert to webp
    let stickerBuffer;
    try {
      stickerBuffer = await sharp(memeBuffer)
        .resize(512, 512, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp()
        .toBuffer();
    } catch (e) {
      console.error("[SMEMEV2] Sticker resize failed:", e.message);
      await sock.sendMessage(m.chat, { image: memeBuffer, caption: "Meme (fallback mode)" }, { quoted: m });
      await m.react("✅");
      return;
    }

    // Send as sticker
    await sock.sendImageAsSticker(m.chat, stickerBuffer, m, {
      packname: config.sticker?.packname || "Nova-AI",
      author: config.sticker?.author || "Bot",
    });

    await m.react("✅");
  } catch (error) {
    console.error("[SMEMEV2] Error:", error.message);
    await m.reply(claraWrap("smemev2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
