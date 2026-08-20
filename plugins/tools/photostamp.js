// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Stamp — Tambah timestamp/date stamp ke foto (local via sharp + SVG, no API)
import sharp from "sharp";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "photostamp",
  alias: ["fotostamp", "timestamp", "tandatanggal", "datestamp", "stempelwaktu"],
  category: "tools",
  description: "Photo Stamp — Tambah timestamp/tanggal ke foto (local, no API)",
  usage: ".photostamp (reply gambar)\n.photostamp <posisi> (reply gambar)\n.photostamp custom <text> (reply gambar)",
  example: ".photostamp (reply gambar)\n.photostamp top-right (reply gambar)\n.photostamp custom Nova AI 2026 (reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const POSITIONS = {
  "top-left": { x: 0, y: 0, anchor: "start", baseline: "hanging" },
  "top-right": { x: 1, y: 0, anchor: "end", baseline: "hanging" },
  "bottom-left": { x: 0, y: 1, anchor: "start", baseline: "auto" },
  "bottom-right": { x: 1, y: 1, anchor: "end", baseline: "auto" },
};

const STYLES = {
  clean: { bg: "rgba(0,0,0,0.55)", color: "#ffffff", font: "Arial", weight: "bold", rx: 8 },
  modern: { bg: "rgba(255,255,255,0.8)", color: "#000000", font: "Arial", weight: "bold", rx: 8 },
  neon: { bg: "rgba(0,0,0,0.5)", color: "#00ff88", font: "Arial", weight: "bold", rx: 4 },
  stamp: { bg: "rgba(200,30,30,0.8)", color: "#ffffff", font: "Arial", weight: "bold", rx: 2 },
  glass: { bg: "rgba(100,100,100,0.35)", color: "#ffffff", font: "Arial", weight: "bold", rx: 16 },
};

function formatDate(date, format) {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthsFull = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  switch (format) {
    case "short":
      return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
    case "full":
      return days[date.getDay()] + ", " + date.getDate() + " " + monthsFull[date.getMonth()] + " " + date.getFullYear();
    case "time":
      return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear() + " " + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    case "iso":
      return date.toISOString().split("T")[0];
    case "datetime":
      return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    default:
      return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
  }
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildStampSVG(text, width, height, position, style) {
  const s = STYLES[style] || STYLES.clean;
  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.035));
  const padding = Math.round(fontSize * 0.4);
  const pos = POSITIONS[position] || POSITIONS["bottom-right"];

  // Measure approximate text width
  const textWidth = text.length * fontSize * 0.55;
  const boxW = textWidth + padding * 2;
  const boxH = fontSize + padding * 2;

  // Calculate box position
  let boxX, boxY;
  if (pos.x === 0) boxX = padding;
  else boxX = width - boxW - padding;

  if (pos.y === 0) boxY = padding;
  else boxY = height - boxH - padding;

  const textX = boxX + boxW / 2;
  const textY = boxY + fontSize + padding * 0.5;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="${s.bg}" rx="${s.rx}" ry="${s.rx}"/>
      <text x="${textX}" y="${textY}"
        font-family="${s.font}, sans-serif"
        font-size="${fontSize}"
        font-weight="${s.weight}"
        fill="${s.color}"
        text-anchor="middle"
        dominant-baseline="middle">${escapeXml(text)}</text>
    </svg>
  `);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();

    if (input.toLowerCase() === "help" || input.toLowerCase() === "list") {
      const lines = [
        "PHOTO STAMP (Local, no API)",
        "Tambah timestamp/tanggal ke foto",
        "",
        "POSISI:",
        "1. top-left - Atas kiri",
        "2. top-right - Atas kanan",
        "3. bottom-left - Bawah kiri",
        "4. bottom-right - Bawah kanan (default)",
        "",
        "STYLE:",
        "1. clean - Hitam transparan, putih",
        "2. modern - Putih transparan, hitam",
        "3. neon - Hitam, hijau neon",
        "4. stamp - Merah, putih (seperti stempel)",
        "5. glass - Abu transparan, putih",
        "",
        "FORMAT TANGGAL:",
        "1. short - 20 Agu 2026 (default)",
        "2. full - Kamis, 20 Agustus 2026",
        "3. time - 20 Agu 2026 07:30",
        "4. iso - 2026-08-20",
        "5. datetime - 20 Agu 2026 07.30",
        "",
        "CARA PAKAI:",
        usedPrefix + "photostamp (reply gambar) - Default bottom-right, clean",
        usedPrefix + "photostamp <posisi> (reply gambar)",
        usedPrefix + "photostamp <posisi> | <style> | <format> (reply gambar)",
        usedPrefix + 'photostamp custom <text> (reply gambar) - Text sendiri',
        "",
        "Contoh:",
        usedPrefix + "photostamp top-right",
        usedPrefix + "photostamp bottom-left | neon | full",
        usedPrefix + "photostamp custom Nova AI - 20 Agu 2026",
      ];
      return m.reply(claraWrap("Photo Stamp", lines, "info"));
    }

    // Parse input
    let position = "bottom-right";
    let style = "clean";
    let format = "short";
    let customText = null;

    if (input.toLowerCase().startsWith("custom ")) {
      customText = input.substring(7).trim();
      if (!customText) {
        return m.reply(claraWrap("Photo Stamp", "Text custom tidak boleh kosong", "warn"));
      }
    } else if (input) {
      const parts = input.split("|").map((s) => s.trim());
      if (parts[0] && POSITIONS[parts[0].toLowerCase()]) position = parts[0].toLowerCase();
      if (parts[1] && STYLES[parts[1].toLowerCase()]) style = parts[1].toLowerCase();
      if (parts[2]) format = parts[2].toLowerCase();
    }

    // Generate stamp text
    const stampText = customText || formatDate(new Date(), format);

    if (stampText.length > 80) {
      return m.reply(claraWrap("Photo Stamp", "Text terlalu panjang (max 80 karakter)", "warn"));
    }

    // Get image
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("Photo Stamp", [
        "Reply gambar dulu, lalu ketik:",
        usedPrefix + "photostamp",
      ], "warn"));
    }

    m.reply(claraWrap("Photo Stamp", "Menambahkan timestamp..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(claraWrap("Photo Stamp", "Gagal download gambar.", "warn"));
    }

    const meta = await sharp(imgBuffer).metadata();
    const width = meta.width || 1024;
    const height = meta.height || 1024;

    const svgOverlay = buildStampSVG(stampText, width, height, position, style);

    const result = await sharp(imgBuffer, { failOn: "none" })
      .composite([{ input: svgOverlay, blend: "over" }])
      .png({ quality: 90 })
      .toBuffer();

    if (!result || result.length === 0) {
      return m.reply(claraWrap("Photo Stamp", "Gagal processing stamp.", "warn"));
    }

    await conn.sendMessage(
      m.key.remoteJid,
      {
        image: result,
        caption: claraWrap("Photo Stamp", [
          "Stamp: " + stampText,
          "Posisi: " + position,
          "Style: " + style,
          "Powered by sharp (local)",
        ], "info"),
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("[PhotoStamp]", e);
    m.reply(claraWrap("Photo Stamp", [
      "Error: " + e.message,
      "",
      "Ketik " + usedPrefix + "photostamp list untuk bantuan",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
