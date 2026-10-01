// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap, raraBerhasil } from '../../src/lib/rara-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

let _canvas = null
async function getCanvas() {
  if (!_canvas) _canvas = await import('@napi-rs/canvas')
  return _canvas
}

const pluginConfig = {
  name: "quotemaker",
  alias: ["quotemaker"],
  aliases: ["quotemaker", "quotecard", "quoteimg", "buatquote"],
  category: "maker",
  description: "Buat quote card estetik dari teks sendiri dengan gradient background",
  usage: ".quotemaker <teks> | .quotemaker <teks> | <author> | .quotemaker <teks> | <author> | <bg>",
  example: ".quotemaker Hidup itu singkat, jadi buatlah berarti | Aizat | dark",
  isGroupOnly: false,
};

const BG_PRESETS = {
  dark:    { c1: '#0f0f1a', c2: '#1a1a2e', text: '#ffffff', accent: '#64ffda' },
  light:   { c1: '#f5f5f5', c2: '#e0e0e0', text: '#1a1a1a', accent: '#0066cc' },
  sunset:  { c1: '#ff6e7f', c2: '#bfe9ff', text: '#ffffff', accent: '#ffd700' },
  ocean:   { c1: '#2E0249', c2: '#580389', text: '#ffffff', accent: '#00e5ff' },
  forest:  { c1: '#134E5E', c2: '#71B280', text: '#ffffff', accent: '#a8e6cf' },
  purple:  { c1: '#41295a', c2: '#2F0743', text: '#ffffff', accent: '#e0aaff' },
  fire:    { c1: '#f12711', c2: '#f5af19', text: '#ffffff', accent: '#ffe0b2' },
  mono:    { c1: '#000000', c2: '#333333', text: '#ffffff', accent: '#ffffff' },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();
    if (!input) {
      return m.reply(raraWrap("quotemaker", [
        "Buat quote card dari teks sendiri.",
        "",
        "📌 Format: " + usedPrefix + "quotemaker <teks> | <author> | <bg>",
        "atau: " + usedPrefix + "quotemaker <teks> | <author>",
        "atau: " + usedPrefix + "quotemaker <teks>",
        "",
        "Background: " + Object.keys(BG_PRESETS).join(", "),
        "",
        "💡 Contoh: " + usedPrefix + "quotemaker Hidup itu singkat | Aizat | sunset",
      ].join("\n")));
    }

    const parts = input.split("|").map(s => s.trim());
    const quoteText = parts[0];
    const author = parts[1] || "";
    const bgName = (parts[2] || "dark").toLowerCase();
    const bg = BG_PRESETS[bgName] || BG_PRESETS.dark;

    if (quoteText.length > 200) {
      return m.reply(raraWrap("quotemaker", "Teks maksimal 200 karakter."));
    }

    const canvas = await getCanvas();
    const W = 800, H = 600;
    const cv = canvas.createCanvas(W, H);
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bg.c1);
    grad.addColorStop(1, bg.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = bg.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    ctx.font = 'bold 60px sans-serif';
    ctx.fillStyle = bg.accent + '40';
    ctx.textAlign = 'center';
    ctx.fillText('"', W / 2, 120);

    ctx.font = 'italic 28px sans-serif';
    ctx.fillStyle = bg.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = W - 100;
    const words = quoteText.split(' ');
    let lines = [];
    let currentLine = '';
    for (const word of words) {
      const test = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 38;
    const startY = H / 2 - (lines.length * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, startY + i * lineHeight);
    });

    if (author) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = bg.accent;
      ctx.fillText('- ' + author, W / 2, H - 80);
    }

    ctx.font = '14px sans-serif';
    ctx.fillStyle = bg.text + '60';
    ctx.textAlign = 'right';
    ctx.fillText('Rara AI', W - 35, H - 30);

    const tmpDir = path.join(os.tmpdir(), 'rara-quotemaker');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, 'quote_' + Date.now() + '.png');
    const buf = cv.toBuffer('image/png');
    fs.writeFileSync(outPath, buf);

    await m.react("🐣");
    await conn.sendMessage(m.key.remoteJid, {
      image: buf,
      caption: raraBerhasil(),
    });

    fs.unlinkSync(outPath);
  } catch (e) {
    console.error("quotemaker error:", e);
    return m.reply(raraWrap("quotemaker", "Gagal buat quote. Coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
