// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-menu-card.js
 * Helper untuk kirim menu dengan GAMBAR HEADER + TOMBOL NAVIGASI
 * yang benar-benar render di WhatsApp Android.
 *
 * KENAPA TIDAK PAKAI legacy `buttons` (type 1) + `contextInfo.externalAdReply`:
 * - WhatsApp Android sudah BLOKIR legacy template buttons (type 1) sejak
 *   pertengahan 2025. Cuma masih render di Web/iOS (bug/legacy behavior),
 *   TIDAK di Android — mayoritas user. Baileys/library lain sudah
 *   deprecate fitur ini karena WA sendiri yang matiin.
 * - `externalAdReply` diabaikan WhatsApp kalau ditaruh di dalam
 *   `interactiveMessage` (yang dipakai nativeFlowMessage/tombol modern).
 *
 * SOLUSI YANG BENAR-BENAR JALAN DI SEMUA PLATFORM (Android/iOS/Web):
 * - Gambar ditaruh di `interactiveMessage.header` sebagai media attachment
 *   ASLI (bukan link-preview card externalAdReply).
 * - Tombol pakai `nativeFlowMessage` dengan tipe `quick_reply` — ini
 *   format tombol yang MASIH didukung WhatsApp saat ini (dipakai juga di
 *   nova-nav-buttons.js untuk tombol Kembali/Tanya AI).
 * - Dikirim via `sock.relayMessage()`, bukan `sock.sendMessage()`.
 */

import fs from "fs";

let _mediaCache = new Map();

/**
 * Siapkan media header dari file gambar (dengan cache biar gak upload ulang tiap panggil)
 */
async function prepareHeaderMedia(sock, imagePath) {
  const cacheKey = imagePath;
  if (_mediaCache.has(cacheKey)) {
    const cached = _mediaCache.get(cacheKey);
    // Cache valid 10 menit (URL upload WA ada masa berlaku)
    if (Date.now() - cached.ts < 10 * 60 * 1000) {
      return cached.media;
    }
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
 * Kirim menu card: gambar header + teks + tombol navigasi (max 3)
 *
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Message object
 * @param {object} opts
 * @param {string} opts.text - Isi teks menu
 * @param {string} opts.footer - Footer text
 * @param {string} opts.thumbnailPath - Path absolut ke file gambar thumbnail
 * @param {Array<{id: string, text: string}>} opts.buttons - Max 3 tombol { id: buttonId/command, text: label }
 * @param {string} opts.title - Judul header (opsional)
 */
async function sendMenuCard(sock, m, { text, footer, thumbnailPath, buttons = [], title = "" }) {
  const { generateWAMessageFromContent } = await import("nova");

  try {
    const media = await prepareHeaderMedia(sock, thumbnailPath);

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
