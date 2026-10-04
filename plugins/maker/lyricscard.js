// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraBerhasil } from '../../src/lib/rara-menu-style.js'
import { mediaResultCard, probeBuffer } from '../../src/lib/rara-media-result.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

let _canvas = null
async function getCanvas() {
  if (!_canvas) _canvas = await import('@napi-rs/canvas')
  return _canvas
}

const pluginConfig = {
  name: "lyricscard",
  alias: ["lyricscard"],
  aliases: ["lyricscard", "lirikcard", "lirikmaker", "lyricsmaker"],
  category: "maker",
  description: "Buat card lirik lagu estetik - teks + judul + artis + background gradient",
  usage: ".lyricscard <lirik>|<judul>|<artis> | .lyricscard <lirik>|<judul>|<artis>|<bg>",
  example: ".lyricscard Dont stop believing|Don't Stop|Journey|dark",
  isGroupOnly: false,
};

const THEMES = {
  dark:    { c1: '#0a0a0f', c2: '#1a1a2e', text: '#e0e0e0', accent: '#64ffda', sub: '#888888' },
  night:   { c1: '#0f0c29', c2: '#302b63', text: '#ffffff', accent: '#a78bfa', sub: '#a0a0b0' },
  rose:    { c1: '#2d0a31', c2: '#5f0a40', text: '#ffffff', accent: '#ff6b9d', sub: '#caa0b0' },
  ocean:   { c1: '#0c4a6e', c2: '#075985', text: '#ffffff', accent: '#38bdf8', sub: '#a0c0d0' },
  golden:  { c1: '#1a1a1a', c2: '#3d2c1d', text: '#ffe0b2', accent: '#ffd700', sub: '#a08060' },
  mint:    { c1: '#0d2818', c2: '#1a4d2e', text: '#e0f0e0', accent: '#80ffaa', sub: '#80a090' },
};

async function handler(m, { conn, text, usedPrefix, command }) {
  try {
    const input = text.trim();
    if (!input || !input.includes("|")) {
      return m.reply(raraWrap("lyricscard", [
        "Buat card lirik lagu estetik.",
        "",
        "📌 Format: " + usedPrefix + "lyricscard <lirik>|<judul>|<artis>",
        "atau: " + usedPrefix + "lyricscard <lirik>|<judul>|<artis>|<bg>",
        "",
        "Theme: " + Object.keys(THEMES).join(", "),
        "",
        "💡 Contoh:",
        usedPrefix + "lyricscard Don't stop believing|Don't Stop|Journey|night",
      ].join("\n")));
    }

    const parts = input.split("|").map(s => s.trim());
    const lyrics = parts[0];
    const song = parts[1] || "Unknown";
    const artist = parts[2] || "Unknown";
    const themeName = (parts[3] || "dark").toLowerCase();
    const theme = THEMES[themeName] || THEMES.dark;

    if (lyrics.length > 300) return m.reply(raraWrap("lyricscard", "Lirik maksimal 300 karakter."));

    const canvas = await getCanvas();
    const W = 800, H = 600;
    const cv = canvas.createCanvas(W, H);
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.c1);
    grad.addColorStop(1, theme.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.globalAlpha = 1.0;

    ctx.font = 'italic 24px sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.fillText('~', W / 2, 80);

    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = W - 100;
    const lyricsLines = lyrics.split('\n');
    let allLines = [];
    for (const lyricLine of lyricsLines) {
      const words = lyricLine.split(' ');
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          allLines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) allLines.push(current);
      if (lyricsLines.indexOf(lyricLine) < lyricsLines.length - 1) allLines.push('');
    }

    const lineHeight = 34;
    const startY = H / 2 - (allLines.length * lineHeight) / 2 + 20;
    allLines.forEach((line, i) => {
      if (line) ctx.fillText(line, W / 2, startY + i * lineHeight);
    });

    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 100, H - 110);
    ctx.lineTo(W / 2 + 100, H - 110);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = theme.accent;
    ctx.fillText(song, W / 2, H - 80);

    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = theme.sub;
    ctx.fillText(artist, W / 2, H - 55);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = theme.sub + '80';
    ctx.textAlign = 'right';
    ctx.fillText('Rara AI', W - 30, H - 25);

    const outBuf = cv.toBuffer('image/png');

    let card = "";
    try {
      const info = await probeBuffer(outBuf);
      card = mediaResultCard({
        header: "lyricscard",
        type: "gambar",
        request: [
          ["Lirik", parts[0]],
          ["Judul", parts[1]],
          ["Artis", parts[2]],
          ["Tema", parts[3]],
        ],
        size: info.size,
        mime: info.mime,
        width: info.width,
        height: info.height,
      });
    } catch { /* best-effort */ }

    await m.react("🐣");
    await conn.sendMessage(m.key.remoteJid, {
      image: outBuf,
      caption: card || raraBerhasil(),
    });
  } catch (e) {
    console.error("lyricscard error:", e);
    return m.reply(raraWrap("lyricscard", "Gagal buat lyrics card. Coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
