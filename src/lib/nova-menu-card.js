// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-menu-card.js
 * Helper untuk kirim menu dengan TOMBOL NAVIGASI + THUMBNAIL PREVIEW.
 *
 * Strategi: kirim 2 pesan
 * 1. Pesan teks biasa dengan contextInfo.externalAdReply → thumbnail muncul
 *    sebagai link-preview card (TIDAK tersimpan ke galeri, karena itu
 *    bukan media attachment — cuma preview link)
 * 2. Pesan nativeFlowMessage dengan tombol quick_reply → tombol navigasi
 *    muncul di Android/iOS/Web
 *
 * Hasil: thumbnail ada, tombol ada, gak ada yang tersimpan ke galeri.
 */

import fs from "fs";
import path from "path";

let _thumbnailUrl = null;
let _thumbnailTs = 0;

/**
 * Upload thumbnail ke server WA sekali, cache URL-nya.
 */
async function getThumbnailUrl(sock, imagePath) {
  // Cache 1 jam
  if (_thumbnailUrl && Date.now() - _thumbnailTs < 60 * 60 * 1000) {
    return _thumbnailUrl;
  }

  if (!fs.existsSync(imagePath)) {
    console.error("[nova-menu-card] Thumbnail tidak ditemukan:", imagePath);
    return null;
  }

  try {
    const buffer = fs.readFileSync(imagePath);
    const result = await sock.waUploadToServer(buffer, { mediaType: "image" });
    _thumbnailUrl = result;
    _thumbnailTs = Date.now();
    return result;
  } catch (e) {
    console.error("[nova-menu-card] Gagal upload thumbnail:", e.message);
    return null;
  }
}

/**
 * Kirim menu dengan thumbnail (externalAdReply) + tombol navigasi.
 *
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Message object
 * @param {object} opts
 * @param {string} opts.text - Isi teks menu
 * @param {string} opts.footer - Footer text
 * @param {string} [opts.thumbnailPath] - Path ke file gambar thumbnail
 * @param {Array<{id: string, text: string}>} opts.buttons - Max 3 tombol
 * @param {string} [opts.title] - Judul untuk externalAdReply
 */
async function sendMenuCard(sock, m, { text, footer, thumbnailPath, buttons = [], title = "" }) {
  const { generateWAMessageFromContent } = await import("nova");

  try {
    const thumbPath = thumbnailPath || path.join(process.cwd(), "assets", "image", "menu.jpg");

    // === PESAN 1: Teks menu + externalAdReply (thumbnail preview, gak save ke galeri) ===
    const thumbnail = await getThumbnailUrl(sock, thumbPath);

    const contextInfo = {
      externalAdReply: {
        title: title || "Nova AI WhatsApp Bot",
        body: footer || "Nova AI WhatsApp Bot",
        thumbnail: thumbnail, // URL dari waUploadToServer (bukan buffer asli)
        sourceUrl: "https://wa.me/6285700440146",
        mediaType: 1,
        renderLargerThumbnail: true,
      },
    };

    await sock.sendMessage(m.chat, { text, contextInfo }, { quoted: m });

    // === PESAN 2: Tombol navigasi (nativeFlowMessage, tanpa gambar) ===
    if (buttons && buttons.length > 0) {
      const nativeButtons = buttons.slice(0, 3).map((btn) => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btn.text,
          id: btn.id,
        }),
      }));

      const interactiveContent = {
        body: { text: "Pilih navigasi di bawah 👇" },
        footer: { text: footer || "" },
        header: {
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
    }

    return true;
  } catch (e) {
    console.error("[nova-menu-card] sendMenuCard gagal, fallback ke text biasa:", e.message);
    try {
      await sock.sendMessage(m.chat, { text }, { quoted: m });
    } catch {}
    return false;
  }
}

export { sendMenuCard };
