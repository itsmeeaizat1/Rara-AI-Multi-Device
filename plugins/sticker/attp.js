// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// attp.js — Animated text sticker (local canvas + ffmpeg, no API)
// Ported from Alice's generate-attp.js to @napi-rs/canvas
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import config from "../../config.js";
import { addExifToWebp } from "../../src/lib/nova-exif.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const execFileAsync = promisify(execFile);

const pluginConfig = {
  name: "attp",
  alias: ["attp"],
  category: "sticker",
  description: "Membuat sticker animated text (lokal canvas)",
  usage: ".attp <teks>",
  example: ".attp Hello World",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const COLORS = ["#FF5733", "#33FF57", "#3357FF", "#FFD700", "#FF1493", "#00CED1"];

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

async function createFrame(text, color, width = 512, height = 512) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);

  let fsize = 80;
  if (text.length > 10) fsize = 60;
  if (text.length > 20) fsize = 40;

  ctx.font = `bold ${fsize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, text, width - 40);
  const totalHeight = lines.length * fsize;
  let startY = (height - totalHeight) / 2 + fsize / 2;

  lines.forEach((line) => {
    ctx.fillText(line, width / 2, startY);
    startY += fsize;
  });

  return canvas.toBuffer("image/png");
}

async function generateAttp(text) {
  const tmpDir = path.join(os.tmpdir(), `attp_${Date.now()}`);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const framePaths = [];
  for (let i = 0; i < COLORS.length; i++) {
    const buf = await createFrame(text, COLORS[i]);
    const fpath = path.join(tmpDir, `frame_${i}.png`);
    fs.writeFileSync(fpath, buf);
    framePaths.push(fpath);
  }

  const outputPath = path.join(tmpDir, "attp.gif");

  // ffmpeg: PNG frames → GIF
  await execFileAsync("ffmpeg", [
    "-y", "-framerate", "10",
    "-i", path.join(tmpDir, "frame_%d.png"),
    "-vf", "scale=512:512:flags=lanczos",
    outputPath,
  ]);

  const gifBuffer = fs.readFileSync(outputPath);

  // Cleanup
  framePaths.forEach((f) => { try { fs.unlinkSync(f); } catch {} });
  try { fs.unlinkSync(outputPath); } catch {}
  try { fs.rmdirSync(tmpDir); } catch {}

  return gifBuffer;
}

async function handler(m, { sock }) {
  let text = m.text?.trim();
  if (!text && m.quoted?.text) {
    text = m.quoted.text.trim();
  }
  if (!text) {
    return m.reply(claraWrap("attp", `Masukkan teks untuk sticker!\n\nContoh: ${m.prefix}attp Hello World`, "guide"));
  }
  if (text.length > 100) {
    return m.reply(claraWrap("attp", "Teks terlalu panjang! Maksimal 100 karakter.", "error"));
  }

  try {
    await m.react("🕒");
    const gifBuffer = await generateAttp(text);

    // Convert GIF to WebP sticker
    let stickerBuffer = gifBuffer;
    try {
      stickerBuffer = await addExifToWebp(gifBuffer, {
        packname: config.sticker?.packname || "Nova AI",
        author: config.sticker?.author || "Aizat",
      });
    } catch (e) {
      console.log("[attp] exif error:", e.message);
    }

    await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
    await m.react("🐣");
    await m.reply(novaBerhasil("attp"));
  } catch (err) {
    console.error("[ATTP]", err);
    await m.react("❌");
    m.reply(claraWrap("attp", "Gagal membuat sticker. Coba lagi nanti!", "error"));
  }
}

export { pluginConfig as config, handler };
