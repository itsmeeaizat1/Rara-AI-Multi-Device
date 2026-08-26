// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Watermark — Tambah watermark text ke gambar (local via sharp, no API)
import sharp from "sharp";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "photowatermark",
  alias: ["photowatermark", "watermarkfoto", "fotowatermark", "stempel", "tandawater", "wmfoto"],
  category: "tools",
  description: "Photo Watermark — Tambah text watermark ke gambar (local, no API)",
  usage: ".photowatermark <text> (reply gambar)\n.photowatermark <pos> | <text> (reply gambar)",
  example: ".photowatermark Nova AI (reply gambar)\n.photowatermark bottom-right | @NovaAI (reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const POSITIONS = {
  "top-left": { gravity: "northwest" },
  "top-center": { gravity: "north" },
  "top-right": { gravity: "northeast" },
  "center": { gravity: "center" },
  "bottom-left": { gravity: "southwest" },
  "bottom-center": { gravity: "south" },
  "bottom-right": { gravity: "southeast" },
};

function buildSVG(text, width, height, position) {
  const fontSize = Math.max(24, Math.round(Math.min(width, height) * 0.05));
  const padding = Math.round(fontSize * 0.3);
  const gravity = POSITIONS[position] || POSITIONS["bottom-right"];

  // Calculate position
  let x, y, anchor;
  if (gravity.gravity.includes("north")) y = padding + fontSize;
  else if (gravity.gravity.includes("south")) y = height - padding;
  else y = height / 2;

  if (gravity.gravity.includes("west")) { x = padding; anchor = "start"; }
  else if (gravity.gravity.includes("east")) { x = width - padding; anchor = "end"; }
  else { x = width / 2; anchor = "middle"; }

  // Escape text for SVG
  const escText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Shadow + main text
  const shadowOffset = Math.max(2, Math.round(fontSize * 0.05));

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="${shadowOffset}" dy="${shadowOffset}" stdDeviation="${shadowOffset}" flood-color="#000000" flood-opacity="0.7"/>
        </filter>
      </defs>
      <text x="${x}" y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="rgba(255,255,255,0.9)"
        text-anchor="${anchor}"
        dominant-baseline="${gravity.gravity.includes("north") ? "hanging" : gravity.gravity.includes("south") ? "auto" : "middle"}"
        filter="url(#shadow)">${escText}</text>
    </svg>
  `);
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();

    if (!input || input.toLowerCase() === "help" || input.toLowerCase() === "list") {
      const lines = [
        "PHOTO WATERMARK (Local, no API)",
        "Tambah text watermark ke gambar",
        "",
        "POSISI WATERMARK:",
        "1. top-left - Atas kiri",
        "2. top-center - Atas tengah",
        "3. top-right - Atas kanan",
        "4. center - Tengah",
        "5. bottom-left - Bawah kiri",
        "6. bottom-center - Bawah tengah",
        "7. bottom-right - Bawah kanan (default)",
        "",
        "CARA PAKAI:",
        usedPrefix + "photowatermark <text> (reply gambar)",
        usedPrefix + "photowatermark <posisi> | <text> (reply gambar)",
        "",
        "Contoh:",
        usedPrefix + "photowatermark Nova AI",
        usedPrefix + "photowatermark top-right | Nova AI",
      ];
      return m.reply(claraWrap("Photo Watermark", lines, "info"));
    }

    // Parse: position | text  OR  just text
    let position = "bottom-right";
    let wmText = input;

    if (input.includes("|")) {
      const parts = input.split("|").map((s) => s.trim());
      const posKey = parts[0].toLowerCase();
      if (POSITIONS[posKey]) {
        position = posKey;
        wmText = parts.slice(1).join(" | ").trim();
      }
    }

    if (!wmText) {
      return m.reply(claraWrap("Photo Watermark", [
        "Text watermark tidak boleh kosong",
        "",
        "Format: " + usedPrefix + "photowatermark <text>",
        "Contoh: " + usedPrefix + 'photowatermark Nova AI',
      ], "warn"));
    }

    if (wmText.length > 100) {
      return m.reply(claraWrap("Photo Watermark", "Text terlalu panjang (max 100 karakter)", "warn"));
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("Photo Watermark", [
        "Reply gambar dulu, lalu ketik:",
        usedPrefix + "photowatermark " + input,
      ], "warn"));
    }

    m.reply(claraWrap("Photo Watermark", "Menambahkan watermark..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(claraWrap("Photo Watermark", "Gagal download gambar.", "warn"));
    }

    const meta = await sharp(imgBuffer).metadata();
    const width = meta.width || 1024;
    const height = meta.height || 1024;

    const svgOverlay = buildSVG(wmText, width, height, position);

    const result = await sharp(imgBuffer, { failOn: "none" })
      .composite([{ input: svgOverlay, blend: "over" }])
      .png({ quality: 90 })
      .toBuffer();

    if (!result || result.length === 0) {
      return m.reply(claraWrap("Photo Watermark", "Gagal processing watermark.", "warn"));
    }

    await conn.sendMessage(
      m.key.remoteJid,
      {
        image: result,
        caption: claraWrap("Photo Watermark", [
          "Text: " + wmText,
          "Posisi: " + position,
          "Powered by sharp (local)",
        ], "info"),
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("[PhotoWatermark]", e);
    m.reply(claraWrap("Photo Watermark", [
      "Error: " + e.message,
      "",
      "Ketik " + usedPrefix + "photowatermark list untuk bantuan",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
