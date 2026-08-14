import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Temp store for collecting images per user ───
const TEMP_DIR = path.join(process.cwd(), "temp", "stikergrid");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// { userId: { images: [buffer1, buffer2, ...], timestamp, groupId } }
const gridSessions = new Map();

// Auto-cleanup after 60 seconds
function getSession(userId, groupId) {
  const key = `${userId}:${groupId}`;
  return gridSessions.get(key);
}

function setSession(userId, groupId, data) {
  const key = `${userId}:${groupId}`;
  data.timestamp = Date.now();
  gridSessions.set(key, data);
  // Auto-expire after 60s
  setTimeout(() => {
    if (gridSessions.get(key) === data) {
      gridSessions.delete(key);
    }
  }, 60000);
}

function clearSession(userId, groupId) {
  const key = `${userId}:${groupId}`;
  gridSessions.delete(key);
}

// ─── Grid layout using sharp ───
async function createGridCollage(images, options = {}) {
  const sharp = (await import("sharp")).default;

  const gap = options.gap || 10;
  const bg = options.background || { r: 255, g: 255, b: 255, alpha: 1 };
  const cellSize = options.cellSize || 480;
  const padding = options.padding || 15;

  let cols, rows;
  const count = images.length;

  if (count === 2) {
    cols = 2; rows = 1;
  } else if (count === 3) {
    cols = 3; rows = 1;
  } else if (count === 4) {
    cols = 2; rows = 2;
  } else {
    throw new Error("Jumlah foto harus 2-4");
  }

  const totalWidth = cols * cellSize + (cols - 1) * gap + padding * 2;
  const totalHeight = rows * cellSize + (rows - 1) * gap + padding * 2;

  // Process each image: resize to cell, cover mode
  const processedImages = [];
  for (let i = 0; i < images.length; i++) {
    const img = await sharp(images[i])
      .resize(cellSize, cellSize, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();
    processedImages.push(img);
  }

  // Create composite using sharp
  const composites = [];
  for (let i = 0; i < processedImages.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = padding + col * (cellSize + gap);
    const top = padding + row * (cellSize + gap);
    composites.push({
      input: processedImages[i],
      left,
      top,
    });
  }

  const result = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: bg,
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return result;
}

// ─── Convert to sticker (webp) ───
async function imageToSticker(buffer, packname, author) {
  const sharp = (await import("sharp")).default;

  let webpBuffer = await sharp(buffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90 })
    .toBuffer();

  return webpBuffer;
}

// ─── Check owner ───
function checkOwner(botConfig, m) {
  const ownerJid = botConfig?.owner?.[0] || botConfig?.ownerNumber || "";
  const sender = m.sender || m.key?.participant || "";
  if (!ownerJid) return false;
  const cleanOwner = ownerJid.replace(/[^0-9]/g, "");
  const cleanSender = sender.replace(/[^0-9]/g, "");
  return cleanOwner === cleanSender;
}

// ─── Plugin ───
export default {
  name: "stikergrid",
  alias: ["sg", "stikergrip", "gridstiker", "kolasestiker", "collagestiker"],
  category: "sticker",
  desc: "Stiker Kolase - Gabungkan 2-4 foto jadi 1 stiker grid. Kirim foto dengan caption .stikergrid untuk mulai mengumpulkan.",
  usage: ".stikergrid - Mulai/mode bantuan\nKirim 2-4 foto dengan caption .stikergrid untuk langsung jadi kolase\n.stikergrid selesai - Buat kolase dari foto terkumpul\n.stikergrid batal - Batalkan sesi\n.stikergrid status - Lihat foto terkumpul",
  example: ".stikergrid (lalu kirim 2-4 foto dengan caption yang sama)\n.stikergrid selesai",
  wait: "🕐",
  error: "❌",

  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const groupId = m.key?.remoteJid || m.chat || "";
    const sender = m.sender || m.key?.participant || "";
    const senderName = m.pushName || sender.split("@")[0];
    const raw = m.text?.trim() || "";
    const packname = botConfig?.sticker?.packname || botConfig?.bot?.name || "Nova-AI";
    const author = botConfig?.sticker?.author || "Bot";

    // ─── Check if this is an image with caption ───
    const isImageMsg = m.isImage || (m.msg?.imageMessage != null);
    const hasCaption = raw.toLowerCase().startsWith(`${prefix}stikergrid`) ||
                       raw.toLowerCase().startsWith(`${prefix}sg`) ||
                       raw.toLowerCase().startsWith(`${prefix}stikergrip`) ||
                       raw.toLowerCase().startsWith(`${prefix}gridstiker`) ||
                       raw.toLowerCase().startsWith(`${prefix}kolasestiker`) ||
                       raw.toLowerCase().startsWith(`${prefix}collagestiker`);

    // ─── Image with .stikergrid caption → collect ───
    if (isImageMsg && hasCaption) {
      await m.react("🕐");

      let buffer;
      try {
        buffer = await m.download();
      } catch (e) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Gagal mengunduh foto.`,
          `╎ Coba kirim ulang ya.`,
        ].join("\n")));
        await m.react("❌");
        return { handled: true };
      }

      if (!buffer || buffer.length === 0) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Foto kosong, coba ulangi.`,
        ].join("\n")));
        await m.react("❌");
        return { handled: true };
      }

      let session = getSession(sender, groupId) || { images: [], started: true };

      if (session.images.length >= 4) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Sudah ada 4 foto! Maksimal 4 ya.`,
          `╎ Ketik *${prefix}stikergrid selesai* untuk buat kolase.`,
          `╎ Atau *${prefix}stikergrid batal* untuk ulang.`,
        ].join("\n")));
        return { handled: true };
      }

      session.images.push(buffer);
      setSession(sender, groupId, session);

      const count = session.images.length;
      const remaining = 4 - count;

      if (count < 2) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Foto ${count} tersimpan!`,
          ``,
          `╎ Kumpulkan minimal 2 foto.`,
          `╎ Sisa: *${remaining - 1}* foto lagi buat maksimal`,
          `╎ Atau ketik *${prefix}stikergrid selesai* kalau udah cukup (min 2).`,
        ].join("\n")));
        await m.react("✅");
        return { handled: true };
      } else if (count === 2 || count === 3) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Foto ${count} tersimpan!`,
          ``,
          `╎ Sisa: *${remaining}* slot lagi (maksimal 4).`,
          `╎ Ketik *${prefix}stikergrid selesai* untuk buat kolase sekarang.`,
          `╎ Atau kirim foto lagi dengan caption *${prefix}stikergrid*.`,
        ].join("\n")));
        await m.react("✅");
        return { handled: true };
      } else if (count === 4) {
        // Auto-generate when 4 reached
        await m.reply(claraWrap("StikerGrid", [
          `╎ 4 foto terkumpul! Membuat kolase...`,
        ].join("\n")));
        await m.react("🕐");

        try {
          const collage = await createGridCollage(session.images);
          const sticker = await imageToSticker(collage, packname, author);
          await sock.sendMessage(groupId, {
            sticker,
            isAiSticker: true,
            isAvatar: true,
            contextInfo: { isForwarded: true, forwardingScore: 1, premium: 1 },
          }, { quoted: m });
          clearSession(sender, groupId);
          await m.react("✅");
        } catch (e) {
          await m.reply(claraWrap("StikerGrid", [
            `╎ Gagal membuat kolase: ${e.message}`,
            `╎ Coba *${prefix}stikergrid selesai* lagi ya.`,
          ].join("\n")));
          await m.react("❌");
        }
        return { handled: true };
      }
    }

    // ─── Text commands ───
    const subMatch = raw.toLowerCase().match(
      new RegExp(`^${prefix}(stikergrid|sg|stikergrip|gridstiker|kolasestiker|collagestiker)\\s*(selesai|batal|status|bantu|help)?`, "i")
    );

    if (!subMatch) {
      // Not an image and not a recognized command
      return { handled: false };
    }

    const subCmd = subMatch[1]?.toLowerCase() || "";
    const action = subMatch[2]?.toLowerCase() || "";

    // ─── Help ───
    if (action === "help" || action === "bantu" || (!action && !isImageMsg)) {
      await m.reply(claraWrap("StikerGrid - Bantuan", [
        `╎ Stiker Kolase / Multi-Foto`,
        ``,
        `╎ Cara Pakai:`,
        `╎ 1. Kirim 2-4 foto dengan caption *${prefix}stikergrid*`,
        `╎ 2. Bot otomatis kumpulkan fotonya`,
        `╎ 3. Setelah cukup, ketik *${prefix}stikergrid selesai*`,
        `╎ 4. Bot gabungkan jadi 1 stiker kolase!`,
        ``,
        `╎ Command lain:`,
        `╎    *${prefix}stikergrid status* - Lihat foto terkumpul`,
        `╎    *${prefix}stikergrid batal* - Batalkan sesi`,
        `╎    *${prefix}stikergrid selesai* - Buat kolase (min 2 foto)`,
        ``,
        `╎ Layout otomatis:`,
        `╎    2 foto = side by side (2x1)`,
        `╎    3 foto = 3 kolom (3x1)`,
        `╎    4 foto = grid 2x2`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Status ───
    if (action === "status") {
      const session = getSession(sender, groupId);
      if (!session || session.images.length === 0) {
        await m.reply(claraWrap("StikerGrid - Status", [
          `╎ Belum ada foto terkumpul.`,
          `╎ Kirim foto dengan caption *${prefix}stikergrid* untuk mulai.`,
        ].join("\n")));
        await m.react("✅");
        return { handled: true };
      }

      await m.reply(claraWrap("StikerGrid - Status", [
        `╎ Foto terkumpul: *${session.images.length}*`,
        ``,
        `╎ Sisa slot: *${4 - session.images.length}*`,
        `╎ Ketik *${prefix}stikergrid selesai* untuk buat kolase.`,
        `╎ Ketik *${prefix}stikergrid batal* untuk ulang.`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Cancel ───
    if (action === "batal") {
      clearSession(sender, groupId);
      await m.reply(claraWrap("StikerGrid", [
        `╎ Sesi dibatalkan.`,
        `╎ Semua foto terkumpul dihapus.`,
        `╎ Kirim foto baru dengan caption *${prefix}stikergrid* untuk mulai lagi.`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Selesai: generate collage ───
    if (action === "selesai") {
      const session = getSession(sender, groupId);
      if (!session || session.images.length < 2) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Belum cukup foto!`,
          ``,
          `╎ Minimal 2 foto untuk buat kolase.`,
          `╎ Foto terkumpul: *${session ? session.images.length : 0}*`,
          `╎ Kirim foto dengan caption *${prefix}stikergrid* untuk menambah.`,
        ].join("\n")));
        await m.react("❌");
        return { handled: true };
      }

      await m.react("🕐");

      try {
        const collage = await createGridCollage(session.images);
        const sticker = await imageToSticker(collage, packname, author);

        // Also send preview image (optional)
        await sock.sendMessage(groupId, {
          sticker,
          isAiSticker: true,
          isAvatar: true,
          contextInfo: { isForwarded: true, forwardingScore: 1, premium: 1 },
        }, { quoted: m });

        clearSession(sender, groupId);
        await m.react("✅");
      } catch (e) {
        await m.reply(claraWrap("StikerGrid", [
          `╎ Gagal membuat kolase: ${e.message}`,
          `╎ Coba kirim ulang fotonya.`,
        ].join("\n")));
        await m.react("❌");
      }
      return { handled: true };
    }

    return { handled: false };
  },
};
