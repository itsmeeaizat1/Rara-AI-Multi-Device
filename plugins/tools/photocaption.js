// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Caption — Tambah caption text di atas/bawah gambar (local via sharp + SVG, no API)
import sharp from "sharp";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "photocaption",
  alias: ["photocaption"],
  category: "tools",
  description: "Photo Caption — Tambah caption text di atas/bawah gambar (local, no API)",
  usage: ".photocaption <posisi> | <text> (reply gambar)\n.photocaption list — Lihat posisi",
  example: ".photocaption top | Halo Dunia (reply gambar)\n.photocaption bottom | Nova AI",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const POSITIONS = {
  top: "Atas",
  bottom: "Bawah",
  center: "Tengah",
};

const STYLES = {
  classic: { bg: "rgba(0,0,0,0.6)", color: "#ffffff", font: "Arial", weight: "bold" },
  meme: { bg: "rgba(0,0,0,0.7)", color: "#ffffff", font: "Impact, Arial Black, sans-serif", weight: "normal" },
  modern: { bg: "rgba(255,255,255,0.85)", color: "#000000", font: "Arial", weight: "bold" },
  neon: { bg: "rgba(0,0,0,0.5)", color: "#00ffff", font: "Arial", weight: "bold" },
  banner: { bg: "rgba(100,50,200,0.8)", color: "#ffffff", font: "Arial", weight: "bold" },
};

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text, maxWidth, fontSize, ctx) {
  // Simple word wrap
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (test.length * fontSize * 0.55 > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildCaptionSVG(text, width, height, position, style) {
  const s = STYLES[style] || STYLES.classic;
  const fontSize = Math.max(20, Math.round(Math.min(width, height) * 0.06));
  const padding = Math.round(fontSize * 0.4);
  const maxTextWidth = width - padding * 2;

  const lines = wrapText(text, maxTextWidth, fontSize);
  const totalTextHeight = lines.length * fontSize * 1.3;
  const barHeight = totalTextHeight + padding * 2;

  let barY = 0;
  if (position === "top") barY = 0;
  else if (position === "bottom") barY = height - barHeight;
  else barY = (height - barHeight) / 2;

  // Build text elements
  let textElements = "";
  for (let i = 0; i < lines.length; i++) {
    const y = barY + padding + fontSize + i * fontSize * 1.3;
    textElements += `<text x="${width / 2}" y="${y}" font-family="${s.font}" font-size="${fontSize}" font-weight="${s.weight}" fill="${s.color}" text-anchor="middle">${escapeXml(lines[i])}</text>`;
  }

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${barY}" width="${width}" height="${barHeight}" fill="${s.bg}" rx="0"/>
      ${textElements}
    </svg>
  `);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();

    if (!input || input.toLowerCase() === "help" || input.toLowerCase() === "list") {
      const lines = [
        "PHOTO CAPTION (Local, no API)",
        "Tambah text caption di gambar",
        "",
        "POSISI:",
        "1. top - Text di atas gambar",
        "2. bottom - Text di bawah gambar",
        "3. center - Text di tengah gambar",
        "",
        "STYLE:",
        "1. classic - Hitam transparan, putih bold",
        "2. meme - Style meme (Impact font)",
        "3. modern - Putih transparan, hitam",
        "4. neon - Hitam, cyan glow",
        "5. banner - Ungu, putih bold",
        "",
        "CARA PAKAI:",
        usedPrefix + "photocaption <posisi> | <text> (reply gambar)",
        usedPrefix + "photocaption <posisi> | <style> | <text> (reply gambar)",
        "",
        "Contoh:",
        usedPrefix + "photocaption top | Halo Dunia",
        usedPrefix + "photocaption bottom | meme | Nova AI Bot",
      ];
      return m.reply(claraWrap("Photo Caption", lines, "info"));
    }

    // Parse: posisi | text  OR  posisi | style | text
    const parts = input.split("|").map((s) => s.trim());
    let position = "bottom";
    let style = "classic";
    let captionText = "";

    if (parts.length >= 2) {
      const posKey = parts[0].toLowerCase();
      if (POSITIONS[posKey]) position = posKey;

      // Check if second part is a style
      if (parts.length >= 3 && STYLES[parts[1].toLowerCase()]) {
        style = parts[1].toLowerCase();
        captionText = parts.slice(2).join(" | ").trim();
      } else {
        captionText = parts.slice(1).join(" | ").trim();
      }
    }

    if (!captionText) {
      return m.reply(claraWrap("Photo Caption", [
        "Text caption tidak boleh kosong",
        "",
        "Format: " + usedPrefix + "photocaption <posisi> | <text>",
        "Contoh: " + usedPrefix + "photocaption top | Halo Dunia",
      ], "warn"));
    }

    if (captionText.length > 200) {
      return m.reply(claraWrap("Photo Caption", "Text terlalu panjang (max 200 karakter)", "warn"));
    }

    // Get image
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("Photo Caption", [
        "Reply gambar dulu, lalu ketik:",
        usedPrefix + "photocaption " + input,
      ], "warn"));
    }

    m.reply(claraWrap("Photo Caption", "Menambahkan caption..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(claraWrap("Photo Caption", "Gagal download gambar.", "warn"));
    }

    const meta = await sharp(imgBuffer).metadata();
    const width = meta.width || 1024;
    const height = meta.height || 1024;

    const svgOverlay = buildCaptionSVG(captionText, width, height, position, style);

    const result = await sharp(imgBuffer, { failOn: "none" })
      .composite([{ input: svgOverlay, blend: "over" }])
      .png({ quality: 90 })
      .toBuffer();

    if (!result || result.length === 0) {
      return m.reply(claraWrap("Photo Caption", "Gagal processing caption.", "warn"));
    }

    await conn.sendMessage(
      m.key.remoteJid,
      {
        image: result,
        caption: claraWrap("Photo Caption", [
          "Text: " + captionText,
          "Posisi: " + (POSITIONS[position] || position),
          "Style: " + style,
          "Powered by sharp (local)",
        ], "info"),
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("[PhotoCaption]", e);
    m.reply(claraWrap("Photo Caption", [
      "Error: " + e.message,
      "",
      "Ketik " + usedPrefix + "photocaption list untuk bantuan",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
