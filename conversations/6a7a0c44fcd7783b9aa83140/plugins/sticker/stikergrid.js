import fs from "fs";
import path from "path";
import sharp from "sharp";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "stikergrid",
  alias: ["stickergrid", "sgrid", "gridstiker"],
  category: "sticker",
  desc: "Menggabungkan 2-4 foto menjadi satu stiker kolase/grid",
  usage: ".stikergrid (lalu kirim 2-4 foto)",
  example: ".stikergrid",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// ─── Session collector (in-memory) ───
const sessions = new Map();
const SESSION_TIMEOUT = 45000; // 45 detik
const MIN_PHOTOS = 2;
const MAX_PHOTOS = 4;

function createSession(chatJid, sender, sock, m) {
  const existing = sessions.get(chatJid);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const session = {
    images: [],
    sender,
    timer: null,
    startedAt: Date.now(),
  };

  session.timer = setTimeout(async () => {
    const s = sessions.get(chatJid);
    if (s && s.images.length > 0) {
      sessions.delete(chatJid);
      try {
        await sock.sendMessage(chatJid, {
          text: claraWrap(
            "Stiker Grid",
            `Sesi kolase kedaluwarsa.\nFoto terkumpul: ${s.images.length}/${MIN_PHOTOS}\n\nKirim ulang \`${config.command?.prefix || "."}stikergrid\` untuk mencoba lagi.`
          ),
        });
      } catch (_) {}
    } else {
      sessions.delete(chatJid);
    }
  }, SESSION_TIMEOUT);

  sessions.set(chatJid, session);
  return session;
}

// ─── Grid layout config ───
function getGridLayout(count) {
  // Output: 512x512, gap 10px, padding 10px
  const SIZE = 512;
  const GAP = 10;
  const PAD = 10;

  if (count === 2) {
    // Side by side: 2 kolom, 1 baris
    const cellSize = Math.floor((SIZE - PAD * 2 - GAP) / 2);
    return {
      count,
      cellSize,
      cells: [
        { x: PAD, y: PAD, w: cellSize, h: SIZE - PAD * 2 },
        { x: PAD + cellSize + GAP, y: PAD, w: cellSize, h: SIZE - PAD * 2 },
      ],
      canvasW: SIZE,
      canvasH: SIZE,
    };
  }

  if (count === 3) {
    // 2 atas, 1 bawah (lebar penuh)
    const cellSize = Math.floor((SIZE - PAD * 2 - GAP) / 2);
    const bottomH = SIZE - PAD * 2 - cellSize - GAP;
    return {
      count,
      cellSize,
      cells: [
        { x: PAD, y: PAD, w: cellSize, h: cellSize },
        { x: PAD + cellSize + GAP, y: PAD, w: cellSize, h: cellSize },
        { x: PAD, y: PAD + cellSize + GAP, w: SIZE - PAD * 2, h: bottomH },
      ],
      canvasW: SIZE,
      canvasH: SIZE,
    };
  }

  // count === 4: 2x2 grid
  const cellSize = Math.floor((SIZE - PAD * 2 - GAP) / 2);
  return {
    count,
    cellSize,
    cells: [
      { x: PAD, y: PAD, w: cellSize, h: cellSize },
      { x: PAD + cellSize + GAP, y: PAD, w: cellSize, h: cellSize },
      { x: PAD, y: PAD + cellSize + GAP, w: cellSize, h: cellSize },
      { x: PAD + cellSize + GAP, y: PAD + cellSize + GAP, w: cellSize, h: cellSize },
    ],
    canvasW: SIZE,
    canvasH: SIZE,
  };
}

// ─── Build collage ───
async function buildCollage(images) {
  const layout = getGridLayout(images.length);

  // Prepare each image: resize + crop to fit cell (cover mode)
  const composites = [];
  for (let i = 0; i < images.length; i++) {
    const cell = layout.cells[i];
    const img = images[i];

    // Resize to cover the cell dimensions, then crop to exact size
    const processed = await sharp(img)
      .resize(cell.w, cell.h, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();

    composites.push({
      input: processed,
      left: cell.x,
      top: cell.y,
    });
  }

  // Create blank canvas and composite all images
  const collage = await sharp({
    create: {
      width: layout.canvasW,
      height: layout.canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return collage;
}

// ─── Handler ───
async function handler(m, { sock, db }) {
  const prefix = config.command?.prefix || ".";
  const chatJid = m.chat;

  // Cek apakah ini image masuk saat sesi aktif
  const session = sessions.get(chatJid);
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  // ─── Mode: koleksi foto sedang aktif ───
  if (session && isImage && !m.text?.toLowerCase().includes("stikergrid")) {
    await m.react("🕐");

    try {
      let buffer;
      if (m.quoted && m.quoted.isMedia) {
        buffer = await m.quoted.download();
      } else if (m.isMedia) {
        buffer = await m.download();
      }

      if (!buffer) {
        await m.reply(claraWrap("Stiker Grid", "Gagal mengunduh foto. Coba kirim ulang."));
        return;
      }

      session.images.push(buffer);
      const count = session.images.length;

      if (count < MIN_PHOTOS) {
        await m.reply(
          claraWrap(
            "Stiker Grid",
            `Foto ${count}/${MIN_PHOTOS} terkumpul.\nKirim ${MIN_PHOTOS - count} foto lagi, atau kirim ${MAX_PHOTOS - count} foto maksimal.\n\nKetik *selesai* untuk langsung buat, atau *batal* untuk batalkan.`
          )
        );
        return;
      }

      // Sudah cukup MIN_PHOTOS - cek apakah user mau lanjut atau selesai
      if (count < MAX_PHOTOS) {
        // Beri pilihan: lanjut kirim atau sekarang
        await m.reply(
          claraWrap(
            "Stiker Grid",
            `Foto ${count} terkumpul.\n\nKirim ${MAX_PHOTOS - count} foto lagi untuk grid lebih penuh, atau ketik *selesai* untuk buat stiker sekarang.\nKetik *batal* untuk membatalkan.`
          )
        );
        return;
      }

      // Sudah MAX_PHOTOS - langsung proses
      await processCollage(session, chatJid, sock, m);
    } catch (err) {
      console.log("[StikerGrid] Error collecting:", err.message);
      await m.reply(claraWrap("Stiker Grid", "Terjadi error saat mengumpulkan foto."));
    }
    return;
  }

  // ─── Command text: .stikergrid ───
  const isCommand = m.text?.toLowerCase().includes("stikergrid") ||
    m.command === "stikergrid";

  if (!isCommand) return;

  // Cek text "selesai" atau "batal"
  if (m.text?.toLowerCase().trim() === "selesai" && session && session.images.length >= MIN_PHOTOS) {
    await processCollage(session, chatJid, sock, m);
    return;
  }

  if (m.text?.toLowerCase().trim() === "batal" && session) {
    clearTimeout(session.timer);
    sessions.delete(chatJid);
    await m.reply(claraWrap("Stiker Grid", "Sesi kolase dibatalkan."));
    return;
  }

  // ─── Mulai sesi baru ───
  await m.react("🕐");

  const newSession = createSession(chatJid, m.sender, sock, m);

  // Kalau command disertai image, langsung kumpul foto pertama
  if (isImage) {
    try {
      let buffer;
      if (m.quoted && m.quoted.isMedia) {
        buffer = await m.quoted.download();
      } else if (m.isMedia) {
        buffer = await m.download();
      }
      if (buffer) {
        newSession.images.push(buffer);
      }
    } catch (_) {}
  }

  const collected = newSession.images.length;

  await m.reply(
    claraWrap(
      "Stiker Grid",
      `Mode kolase stiker aktif.\n\nKirim ${MIN_PHOTOS}-${MAX_PHOTOS} foto untuk digabung jadi satu stiker grid.\n\nFoto terkumpul: ${collected}/${MIN_PHOTOS}\n\nKetik *selesai* untuk buat stiker (min ${MIN_PHOTOS} foto).\nKetik *batal* untuk membatalkan.\nSesi otomatis berakhir dalam 45 detik.`
    )
  );
  await m.react("✅");
}

// ─── Process collage & send sticker ───
async function processCollage(session, chatJid, sock, m) {
  try {
    if (session.images.length < MIN_PHOTOS) {
      await sock.sendMessage(chatJid, {
        text: claraWrap(
          "Stiker Grid",
          `Foto belum cukup. Minimal ${MIN_PHOTOS} foto, saat ini ${session.images.length}.`
        ),
      });
      return;
    }

    if (session.images.length > MAX_PHOTOS) {
      session.images = session.images.slice(0, MAX_PHOTOS);
    }

    await sock.sendMessage(chatJid, {
      text: claraWrap("Stiker Grid", `Membuat kolase dari ${session.images.length} foto...`),
    });

    // Build collage
    const collageBuffer = await buildCollage(session.images);

    // Clear session
    clearTimeout(session.timer);
    sessions.delete(chatJid);

    // Kirim sebagai stiker
    const packname = config.sticker?.packname || config.bot?.name || "Nova-AI";
    const author = config.sticker?.author || config.owner?.name || "Bot";

    await sock.sendImageAsSticker(chatJid, collageBuffer, m, { packname, author });

    // React ke pesan terakhir
    try {
      await sock.sendMessage(chatJid, {
        react: { text: "✅", key: m.key },
      });
    } catch (_) {}
  } catch (err) {
    console.log("[StikerGrid] Error:", err.message);
    clearTimeout(session?.timer);
    sessions.delete(chatJid);
    await sock.sendMessage(chatJid, {
      text: claraWrap("Stiker Grid", te(m.prefix || ".", "stikergrid", m.pushName || "User"), "error"),
    });
  }
}

export default { config: pluginConfig, handler };
