// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Collage — Gabung 2-4 foto jadi satu grid (local via sharp, no API)
import sharp from "sharp";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "photocollage",
  alias: ["photocollage"],
  category: "tools",
  description: "Photo Collage — Gabung 2-4 foto jadi satu grid foto (local, no API)",
  usage: ".photocollage <layout> (reply 2-4 gambar)\n.photocollage list — Lihat semua layout",
  example: ".photocollage 2h (reply 2 gambar)\n.photocollage 2v (reply 2 gambar)\n.photocollage 4grid (reply 4 gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const LAYOUTS = {
  "2h": { label: "2 Horizontal", count: 2, desc: "2 foto berdampingan horizontal" },
  "2v": { label: "2 Vertical", count: 2, desc: "2 foto atas-bawah vertical" },
  "3h": { label: "3 Horizontal", count: 3, desc: "3 foto berdampingan horizontal" },
  "3v": { label: "3 Vertical", count: 3, desc: "3 foto atas-bawah vertical" },
  "4grid": { label: "4 Grid 2x2", count: 4, desc: "4 foto grid 2x2" },
  "4h": { label: "4 Horizontal", count: 4, desc: "4 foto berdampingan horizontal" },
};

const GAP = 10;
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function resizeToFit(buffer, targetW, targetH) {
  return await sharp(buffer, { failOn: "none" })
    .resize({ width: targetW, height: targetH, fit: "cover", position: "center" })
    .png()
    .toBuffer();
}

async function makeCollage(images, layout) {
  const CELL = 600;
  const gap = GAP;

  let totalW, totalH;
  const positions = [];

  switch (layout) {
    case "2h":
      totalW = CELL * 2 + gap;
      totalH = CELL;
      positions.push({ x: 0, y: 0, w: CELL, h: CELL });
      positions.push({ x: CELL + gap, y: 0, w: CELL, h: CELL });
      break;
    case "2v":
      totalW = CELL;
      totalH = CELL * 2 + gap;
      positions.push({ x: 0, y: 0, w: CELL, h: CELL });
      positions.push({ x: 0, y: CELL + gap, w: CELL, h: CELL });
      break;
    case "3h":
      totalW = CELL * 3 + gap * 2;
      totalH = CELL;
      for (let i = 0; i < 3; i++) positions.push({ x: i * (CELL + gap), y: 0, w: CELL, h: CELL });
      break;
    case "3v":
      totalW = CELL;
      totalH = CELL * 3 + gap * 2;
      for (let i = 0; i < 3; i++) positions.push({ x: 0, y: i * (CELL + gap), w: CELL, h: CELL });
      break;
    case "4grid":
      totalW = CELL * 2 + gap;
      totalH = CELL * 2 + gap;
      positions.push({ x: 0, y: 0, w: CELL, h: CELL });
      positions.push({ x: CELL + gap, y: 0, w: CELL, h: CELL });
      positions.push({ x: 0, y: CELL + gap, w: CELL, h: CELL });
      positions.push({ x: CELL + gap, y: CELL + gap, w: CELL, h: CELL });
      break;
    case "4h":
      totalW = CELL * 4 + gap * 3;
      totalH = CELL;
      for (let i = 0; i < 4; i++) positions.push({ x: i * (CELL + gap), y: 0, w: CELL, h: CELL });
      break;
    default:
      throw new Error("Layout tidak ditemukan: " + layout);
  }

  // Create base canvas
  const composites = [];
  for (let i = 0; i < positions.length && i < images.length; i++) {
    const resized = await resizeToFit(images[i], positions[i].w, positions[i].h);
    composites.push({ input: resized, left: positions[i].x, top: positions[i].y });
  }

  const result = await sharp({
    create: { width: totalW, height: totalH, channels: 4, background: BG },
  })
    .composite(composites)
    .png({ quality: 90 })
    .toBuffer();

  return result;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const layout = (args[0] || "").toLowerCase().trim();

    if (!layout || layout === "list" || layout === "help") {
      const lines = [
        "PHOTO COLLAGE (Local, no API)",
        "Gabung 2-4 foto jadi satu grid",
        "",
        "LAYOUT TERSEDIA:",
      ];
      let i = 1;
      for (const [key, info] of Object.entries(LAYOUTS)) {
        lines.push(i + ". " + key + " - " + info.label + " (" + info.count + " foto)");
        lines.push("   " + info.desc);
        i++;
      }
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push("1. Reply " + usedPrefix + "photocollage <layout> pada gambar pertama");
      lines.push("2. Bot akan minta gambar selanjutnya");
      lines.push("");
      lines.push("Atau kirim semua gambar sekaligus lalu reply salah satu:");
      lines.push(usedPrefix + "photocollage 2h");
      lines.push("");
      lines.push("Contoh:");
      lines.push(usedPrefix + "photocollage 2h (butuh 2 foto)");
      lines.push(usedPrefix + "photocollage 4grid (butuh 4 foto)");
      return m.reply(novaWrap("Photo Collage", lines, "info"));
    }

    if (!LAYOUTS[layout]) {
      const available = Object.keys(LAYOUTS).join(", ");
      return m.reply(novaWrap("Photo Collage", [
        "Layout tidak ditemukan: " + layout,
        "",
        "Tersedia: " + available,
        "",
        "Ketik " + usedPrefix + "photocollage list",
      ], "warn"));
    }

    const needed = LAYOUTS[layout].count;

    // Collect images: check quoted message for album/multiple images
    const quoted = m.quoted;
    let images = [];

    // Check if quoted message has multiple images (album)
    if (quoted && quoted.message) {
      const msg = quoted.message;
      // Single image
      if (msg.imageMessage) {
        const buf = await quoted.download();
        if (buf) images.push(buf);
      }
      // Album/multiple messages
      if (msg.albumMessage) {
        const album = msg.albumMessage;
        for (const item of album.messages || []) {
          if (item.message?.imageMessage) {
            try {
              const buf = await conn.downloadMediaMessage(item);
              if (buf) images.push(buf);
            } catch (e) { /* skip */ }
          }
        }
      }
    }

    // If not enough from quoted, try current message
    if (images.length < needed && m.message?.imageMessage) {
      const buf = await m.download();
      if (buf) images.push(buf);
    }

    if (images.length < needed) {
      return m.reply(novaWrap("Photo Collage", [
        "Butuh " + needed + " foto untuk layout " + layout,
        "Diterima: " + images.length + " foto",
        "",
        "Cara pakai:",
        "1. Kirim " + needed + " foto (sebagai album/reply)",
        "2. Reply salah satu foto dengan:",
        "   " + usedPrefix + "photocollage " + layout,
      ], "warn"));
    }

    await m.react("🕒");

    const result = await makeCollage(images.slice(0, needed), layout);

    if (!result || result.length === 0) {
      return m.reply(novaWrap("Photo Collage", "Gagal bikin nih collage.", "warn"));
    }

    await conn.sendMessage(
      m.key.remoteJid,
      {
        image: result,
        caption: novaWrap("Photo Collage", [
          "Layout: " + LAYOUTS[layout].label,
          "Foto: " + needed + " gambar",
          "Powered by sharp (local)",
        ], "info"),
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("[PhotoCollage]", e);
    m.reply(novaWrap("Photo Collage", [
      "Error: " + e.message,
      "",
      "Ketik " + usedPrefix + "photocollage list untuk bantuan",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
