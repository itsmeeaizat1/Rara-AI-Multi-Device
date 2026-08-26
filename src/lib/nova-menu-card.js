// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-menu-card.js
 * Helper untuk kirim menu: THUMBNAIL + TOMBOL dalam 1 pesan.
 *
 * Strategi: nativeFlowMessage (tombol) + contextInfo.externalAdReply
 * (thumbnail preview) di dalam messageContextInfo.
 *
 - externalAdReply = link-preview card, BUKAN media attachment
 * → thumbnail muncul tapi gak tersimpan ke galeri HP penerima.
 * - nativeFlowMessage = tombol quick_reply yang jalan di Android/iOS/Web.
 * - 1 pesan doang, gak perlu split 2 pesan.
 */

import fs from "fs";
import path from "path";

let _thumbnailBuffer = null;

/**
 * Baca thumbnail dari file, cache buffer-nya.
 */
function getThumbnailBuffer(imagePath) {
  if (_thumbnailBuffer) return _thumbnailBuffer;

  if (!fs.existsSync(imagePath)) {
    console.error("[nova-menu-card] Thumbnail tidak ditemukan:", imagePath);
    return null;
  }

  try {
    _thumbnailBuffer = fs.readFileSync(imagePath);
    return _thumbnailBuffer;
  } catch (e) {
    console.error("[nova-menu-card] Gagal baca thumbnail:", e.message);
    return null;
  }
}

/**
 * Kirim menu dengan thumbnail (externalAdReply) + tombol (nativeFlowMessage)
 * dalam SATU pesan interactiveMessage.
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
    const thumbBuffer = getThumbnailBuffer(thumbPath);

    const nativeButtons = buttons.slice(0, 3).map((btn) => ({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: btn.text,
        id: btn.id,
      }),
    }));

    // interactiveMessage dengan contextInfo.externalAdReply di messageContextInfo
    const interactiveContent = {
      body: { text },
      footer: { text: footer || "" },
      header: {
        title: title || "",
        hasMediaAttachment: false, // false = gak ada media asli = gak save galeri
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
            messageContextInfo: {
              // externalAdReply di sini = thumbnail sebagai link-preview card
              // BUKAN media attachment → gak tersimpan ke galeri
              contextInfo: {
                externalAdReply: {
                  title: title || "Nova AI WhatsApp Bot",
                  body: footer || "Nova AI WhatsApp Bot",
                  thumbnail: thumbBuffer, // buffer gambar kecil
                  sourceUrl: "https://wa.me/6285700440146",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                },
              },
            },
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

export { sendMenuCard };
