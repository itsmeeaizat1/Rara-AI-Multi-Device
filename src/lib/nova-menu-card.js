// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-menu-card.js
 * Helper untuk kirim menu dengan TOMBOL NAVIGASI yang render di WhatsApp Android.
 *
 * MODE 1 (default): Tanpa gambar header → tombol muncul, gak simpan ke galeri
 * MODE 2 (opsional): Dengan gambar header → tombol muncul, tapi gambar kesave ke galeri
 *
 * nativeFlowMessage dengan quick_reply buttons jalan di Android/iOS/Web.
 * Tanpa media attachment = gak ada yang tersimpan ke galeri HP penerima.
 */

import fs from "fs";

let _mediaCache = new Map();

async function prepareHeaderMedia(sock, imagePath) {
  const cacheKey = imagePath;
  if (_mediaCache.has(cacheKey)) {
    const cached = _mediaCache.get(cacheKey);
    if (Date.now() - cached.ts < 10 * 60 * 1000) return cached.media;
    _mediaCache.delete(cacheKey);
  }

  if (!fs.existsSync(imagePath)) {
    console.error("[nova-menu-card] Thumbnail tidak ditemukan:", imagePath);
    return null;
  }

  const { prepareWAMessageMedia } = await import("nova");
  const buffer = fs.readFileSync(imagePath);
  const media = await prepareWAMessageMedia(
    { image: buffer },
    { upload: sock.waUploadToServer }
  );

  _mediaCache.set(cacheKey, { media, ts: Date.now() });
  return media;
}

/**
 * Kirim menu card dengan tombol navigasi.
 *
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Message object
 * @param {object} opts
 * @param {string} opts.text - Isi teks menu
 * @param {string} opts.footer - Footer text
 * @param {string} [opts.thumbnailPath] - Path gambar (opsional, kalau mau pakai gambar)
 * @param {boolean} [opts.useImage] - Set true untuk pakai gambar header (default: false = tanpa gambar)
 * @param {Array<{id: string, text: string}>} opts.buttons - Max 3 tombol
 * @param {string} [opts.title] - Judul header text
 */
async function sendMenuCard(sock, m, { text, footer, thumbnailPath, useImage = false, buttons = [], title = "" }) {
  const { generateWAMessageFromContent } = await import("nova");

  try {
    let media = null;

    // Hanya upload gambar kalau useImage=true DAN thumbnailPath valid
    if (useImage && thumbnailPath) {
      try {
        media = await prepareHeaderMedia(sock, thumbnailPath);
      } catch (e) {
        console.error("[nova-menu-card] Gagal upload gambar, lanjut tanpa gambar:", e.message);
        media = null;
      }
    }

    const nativeButtons = buttons.slice(0, 3).map((btn) => ({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: btn.text,
        id: btn.id,
      }),
    }));

    const interactiveContent = {
      body: { text },
      footer: { text: footer || "" },
      header: media
        ? {
            title: title || "",
            hasMediaAttachment: true,
            ...media,
          }
        : {
            title: title || "",
            hasMediaAttachment: false,
          },
      nativeFlowMessage: {
        buttons: nativeButtons,
      },
    };

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: interactiveContent,
          },
        },
      },
      { quoted: m }
    );

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    return true;
  } catch (e) {
    console.error("[nova-menu-card] sendMenuCard gagal, fallback ke text biasa:", e.message);
    try {
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    } catch {}
    return false;
  }
}

export { sendMenuCard, prepareHeaderMedia };
