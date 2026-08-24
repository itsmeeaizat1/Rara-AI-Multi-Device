// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

let _canvas = null
async function getCanvas() {
  if (!_canvas) _canvas = await import('@napi-rs/canvas')
  return _canvas
}

const pluginConfig = {
  name: "watermark",
  aliases: ["watermark", "wmtext", "addwm", "watermarktext"],
  category: "maker",
  description: "Tambah watermark teks ke gambar - posisi, opacity, ukuran, warna custom",
  usage: ".watermark <teks> (reply gambar) | .watermark <teks>|<posisi>|<opacity>",
  example: ".watermark Nova AI|bottom-right|0.5",
  isGroupOnly: false,
};

const POSITIONS = {
  "center": { x: 0.5, y: 0.5 },
  "top-left": { x: 0.05, y: 0.08 },
  "top-right": { x: 0.95, y: 0.08 },
  "bottom-left": { x: 0.05, y: 0.92 },
  "bottom-right": { x: 0.95, y: 0.92 },
  "top": { x: 0.5, y: 0.05 },
  "bottom": { x: 0.5, y: 0.95 },
  "left": { x: 0.05, y: 0.5 },
  "right": { x: 0.95, y: 0.5 },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg = quoted?.imageMessage;
    if (!imageMsg) {
      return m.reply(claraWrap("Watermark Maker", "Reply gambar yang mau di-watermark."));
    }

    const input = text.trim();
    if (!input) {
      return m.reply(claraWrap("Watermark Maker", [
        "Tambah watermark teks ke gambar.",
        "",
        "Format: " + usedPrefix + "watermark <teks>|<posisi>|<opacity>",
        "atau: " + usedPrefix + "watermark <teks>",
        "",
        "Posisi: " + Object.keys(POSITIONS).join(", "),
        "Opacity: 0.1 - 1.0 (default 0.7)",
        "",
        "Contoh: " + usedPrefix + "watermark Nova AI|bottom-right|0.5",
      ].join("\n")));
    }

    const parts = input.split("|").map(s => s.trim());
    const wmText = parts[0];
    const posName = (parts[1] || "bottom-right").toLowerCase();
    const opacity = parseFloat(parts[2]) || 0.7;

    if (!POSITIONS[posName]) {
      return m.reply(claraWrap("Watermark Maker", "Posisi: " + Object.keys(POSITIONS).join(", ")));
    }
    if (opacity < 0.1 || opacity > 1.0) return m.reply("Opacity 0.1 - 1.0");
    if (wmText.length > 50) return m.reply("Teks maksimal 50 karakter.");

    const pos = POSITIONS[posName];
    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });

    const canvas = await getCanvas();
    const image = await canvas.loadImage(buffer);
    const W = image.width;
    const H = image.height;

    const cv = canvas.createCanvas(W, H);
    const ctx = cv.getContext('2d');
    ctx.drawImage(image, 0, 0, W, H);

    const fontSize = Math.max(16, Math.min(W, H) / 18);
    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    ctx.globalAlpha = opacity;

    const textWidth = ctx.measureText(wmText).width;
    const padX = fontSize * 0.5;
    const padY = fontSize * 0.3;
    const boxW = textWidth + padX * 2;
    const boxH = fontSize + padY * 2;

    let boxX, boxY;
    let textAlign = 'left';
    if (pos.x <= 0.1) { boxX = W * pos.x; textAlign = 'left'; }
    else if (pos.x >= 0.9) { boxX = W * pos.x - boxW; textAlign = 'left'; }
    else { boxX = W * pos.x - boxW / 2; textAlign = 'left'; }

    if (pos.y <= 0.1) boxY = H * pos.y;
    else if (pos.y >= 0.9) boxY = H * pos.y - boxH;
    else boxY = H * pos.y - boxH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(wmText, boxX + padX, boxY + boxH / 2);

    ctx.globalAlpha = 1.0;

    const outBuf = cv.toBuffer('image/png');
    await conn.sendMessage(m.key.remoteJid, {
      image: outBuf,
      caption: claraWrap("Watermark Maker", [
        "Berhasil!",
        "Teks: " + wmText,
        "Posisi: " + posName,
        "Opacity: " + opacity,
      ].join("\n")),
    });
  } catch (e) {
    console.error("watermark error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
