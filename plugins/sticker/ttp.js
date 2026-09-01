// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ttp.js — Text to PNG sticker (local canvas, no API)
// Ported from Alice's generateTtp to @napi-rs/canvas
import { createCanvas } from "@napi-rs/canvas";
import config from "../../config.js";
import { addExifToWebp } from "../../src/lib/nova-exif.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ttp",
  alias: ["ttp"],
  category: "sticker",
  description: "Membuat sticker teks (lokal canvas)",
  usage: ".ttp <teks>",
  example: ".ttp Hai Cantik",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

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

async function generateTtp(text, color = "white") {
  const width = 512;
  const height = 512;
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

async function handler(m, { sock }) {
  const text = m.args?.join(" ") || m.text?.trim();

  if (!text) {
    return m.reply(claraWrap("ttp", `Masukkan teks untuk sticker!\n\nContoh: ${m.prefix}ttp Hai Cantik`, "guide"));
  }

  try {
    await m.react("🕒");
    const pngBuffer = await generateTtp(text);

    let stickerBuffer = pngBuffer;
    try {
      stickerBuffer = await addExifToWebp(pngBuffer, {
        packname: config.sticker?.packname || "Nova AI",
        author: config.sticker?.author || "Aizat",
      });
    } catch (e) {
      console.log("[ttp] exif error:", e.message);
    }

    await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("[TTP]", err);
    await m.react("❌");
    m.reply(claraWrap("ttp", "Gagal membuat sticker. Coba lagi nanti!", "error"));
  }
}

export { pluginConfig as config, handler };
