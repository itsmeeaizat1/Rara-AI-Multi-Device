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
  name: "certmaker",
  aliases: ["certmaker", "certificate", "buatsertifikat", "sertifikat"],
  category: "maker",
  description: "Buat sertifikat custom - nama, judul, tanggal, pemberi",
  usage: ".certmaker <nama>|<judul>|<pemberi>|<tanggal>",
  example: ".certmaker Budi Santoso|Siswa Terbaik|Kepala Sekolah|2026-08-18",
  isGroupOnly: false,
};

async function handler(m, { conn, text, usedPrefix, command }) {
  try {
    const input = text.trim();
    if (!input || !input.includes("|")) {
      return m.reply(claraWrap("Certificate Maker", [
        "Buat sertifikat custom.",
        "",
        "Format: " + usedPrefix + "certmaker <nama>|<judul>|<pemberi>|<tanggal>",
        "",
        "Contoh:",
        usedPrefix + "certmaker Budi Santoso|Siswa Terbaik|Kepala Sekolah|18 Agustus 2026",
      ].join("\n")));
    }

    const parts = input.split("|").map(s => s.trim());
    const name = parts[0] || "Nama";
    const title = parts[1] || "Certificate of Achievement";
    const issuer = parts[2] || "Nova AI";
    const date = parts[3] || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    if (name.length > 40) return m.reply(claraWrap("Certificate Maker", "Nama maksimal 40 karakter."));

    const canvas = await getCanvas();
    const W = 1000, H = 700;
    const cv = canvas.createCanvas(W, H);
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 6;
    ctx.strokeRect(25, 25, W - 50, H - 50);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.fillText('SERTIFIKAT', W / 2, 120);

    ctx.font = 'italic 20px serif';
    ctx.fillStyle = '#555555';
    ctx.fillText('Certificate of Achievement', W / 2, 155);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, 175);
    ctx.lineTo(W / 2 + 120, 175);
    ctx.stroke();

    ctx.font = '18px serif';
    ctx.fillStyle = '#444444';
    ctx.fillText('Diberikan kepada:', W / 2, 220);

    ctx.font = 'bold 36px serif';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillText(name, W / 2, 275);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 150, 295);
    ctx.lineTo(W / 2 + 150, 295);
    ctx.stroke();

    ctx.font = '20px serif';
    ctx.fillStyle = '#444444';
    const titleLines = wrapText(ctx, title, W - 200);
    let titleY = 340;
    titleLines.forEach(line => {
      ctx.fillText(line, W / 2, titleY);
      titleY += 28;
    });

    ctx.font = '16px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Tanggal: ' + date, W / 2, 480);

    ctx.textAlign = 'left';
    ctx.font = 'bold 18px serif';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillText(issuer, 120, 600);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 610);
    ctx.lineTo(300, 610);
    ctx.stroke();
    ctx.font = '14px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Pemberi Sertifikat', 120, 630);

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px serif';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillText('Nova AI', W - 120, 600);
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(W - 300, 610);
    ctx.lineTo(W - 120, 610);
    ctx.stroke();
    ctx.font = '14px serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Otomatis', W - 120, 630);

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#c9a227';
    ctx.fillText('Nova AI Bot', W / 2, H - 45);

    const tmpDir = path.join(os.tmpdir(), 'nova-certmaker');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, 'cert_' + Date.now() + '.png');
    const buf = cv.toBuffer('image/png');
    fs.writeFileSync(outPath, buf);

    await conn.sendMessage(m.key.remoteJid, {
      image: buf,
      caption: claraWrap("Certificate Maker", [
        "Sertifikat berhasil dibuat!",
        "Nama: " + name,
        "Judul: " + title,
        "Pemberi: " + issuer,
        "Tanggal: " + date,
      ].join("\n")),
    });

    fs.unlinkSync(outPath);
  } catch (e) {
    console.error("certmaker error:", e);
    return m.reply("Error: " + e.message);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default { pluginConfig, handler };
