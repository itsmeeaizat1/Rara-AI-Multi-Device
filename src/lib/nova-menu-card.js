// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-menu-card.js
 * Helper untuk kirim menu: THUMBNAIL (real image attachment) + TOMBOL (nativeFlowMessage).
 *
 * Pattern PROVEN JALAN (dipakai di plugins/group/cekidgc.js):
 * - contextInfo diletakkan LANGSUNG di dalam interactiveMessage (bukan di
 *   messageContextInfo.contextInfo) via proto.Message.InteractiveMessage.fromObject().
 *   Nesting yang salah inilah yang bikin thumbnail muncul sebagai location pin.
 * - Header pakai REAL image attachment (prepareWAMessageMedia + hasMediaAttachment: true),
 *   bukan externalAdReply link-preview trick. Konsekuensinya thumbnail BISA tersimpan
 *   ke galeri penerima — trade-off yang disetujui demi tombol bisa muncul reliable.
 * - nativeFlowMessage buttons: support quick_reply, cta_copy, single_select, dst.
 *   Max ~6 buttons per pesan (WhatsApp bisa nolak render kalau kebanyakan).
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "nova";

let _thumbnailBuffer = null;

/**
 * Baca thumbnail dari file, cache buffer-nya (raw, belum di-resize).
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
 * Build array nativeFlowMessage buttons dari config sederhana.
 * @param {Array} buttons - Max 6 tombol. Tiap button:
 *   - { id, text } → quick_reply (default)
 *   - { type: "cta_copy", text, copyText } → tombol copy
 *   - { type: "single_select", text, title, sections } → popup list kategori
 */
function buildNativeButtons(buttons = []) {
  return buttons.slice(0, 6).map((btn) => {
    if (btn.type === "single_select") {
      return {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: btn.text,
          sections: btn.sections || [],
        }),
      };
    }
    if (btn.type === "cta_copy") {
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: btn.text,
          copy_code: btn.copyText || "",
        }),
      };
    }
    return {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: btn.text,
        id: btn.id,
      }),
    };
  });
}

/**
 * Kirim menu dengan thumbnail (real image header) + tombol (nativeFlowMessage)
 * dalam SATU interactiveMessage. Pattern sama dengan cekidgc.js yang proven jalan.
 *
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Message object
 * @param {object} opts
 * @param {string} opts.text - Isi teks menu (body)
 * @param {string} opts.footer - Footer text
 * @param {string} [opts.thumbnailPath] - Path ke file gambar thumbnail
 * @param {Array} opts.buttons - Max 6 tombol (lihat buildNativeButtons)
 * @param {string} [opts.title] - Judul header (opsional, biasanya kosong kalau ada image)
 */
async function sendMenuCard(sock, m, { text, footer, thumbnailPath, buttons = [], title = "" }) {
  try {
    const thumbPath = thumbnailPath || path.join(process.cwd(), "assets", "image", "menu.jpg");
    const rawBuffer = getThumbnailBuffer(thumbPath);

    let headerMedia = null;
    if (rawBuffer) {
      try {
        const resized = await sharp(rawBuffer)
          .resize(600, 600, { fit: "cover" })
          .jpeg({ quality: 85 })
          .toBuffer();
        headerMedia = await prepareWAMessageMedia(
          { image: resized },
          { upload: sock.waUploadToServer },
        );
      } catch (e) {
        console.error("[nova-menu-card] Gagal proses/upload thumbnail:", e.message);
      }
    }

    const nativeButtons = buildNativeButtons(buttons);

    const interactiveObj = {
      body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || "" }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        buttons: nativeButtons,
      }),
      contextInfo: {
        mentionedJid: m.sender ? [m.sender] : [],
        forwardingScore: 0,
        isForwarded: false,
      },
    };

    if (headerMedia) {
      interactiveObj.header = proto.Message.InteractiveMessage.Header.fromObject({
        title: title || "",
        hasMediaAttachment: true,
        ...headerMedia,
      });
    } else if (title) {
      interactiveObj.header = proto.Message.InteractiveMessage.Header.fromObject({
        title,
        hasMediaAttachment: false,
      });
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveObj),
          },
        },
      },
      { userJid: m.sender, quoted: m },
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
