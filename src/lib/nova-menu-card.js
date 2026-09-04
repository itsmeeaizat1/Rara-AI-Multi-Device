// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-menu-card.js
 * Helper untuk kirim menu: BANNER LINK-PREVIEW (externalAdReply, TIDAK
 * kesimpen ke galeri) + TOMBOL (nativeFlowMessage).
 *
 * UPDATE 2026-09-04 (request owner — referensi bot "Raiden MD"):
 * Header sebelumnya pakai REAL image attachment (hasMediaAttachment:true)
 * yang konsekuensinya thumbnail BISA disave ke galeri penerima. Owner
 * sekarang minta gaya link-preview card: banner besar + baris kecil di
 * bawahnya (ikon tag otomatis dari WhatsApp + judul + subjudul), PERSIS
 * seperti render externalAdReply dengan renderLargerThumbnail:true —
 * dan gambar model ini TIDAK punya opsi "simpan ke galeri" di WhatsApp
 * (cuma link-preview, bukan attachment asli).
 *
 * Pattern PROVEN untuk tombol (dipakai di plugins/group/cekidgc.js):
 * - contextInfo diletakkan LANGSUNG di dalam interactiveMessage (bukan di
 *   messageContextInfo.contextInfo) via proto.Message.InteractiveMessage.fromObject().
 * - externalAdReply ditaruh di contextInfo YANG SAMA (proto InteractiveMessage
 *   punya field contextInfo sendiri) — jadi banner + tombol tetap satu pesan.
 * - nativeFlowMessage buttons: support quick_reply, cta_copy, single_select, dst.
 *   Max ~6 buttons per pesan (WhatsApp bisa nolak render kalau kebanyakan).
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { generateWAMessageFromContent, proto } from "nova";
import { getTimeGreeting } from "./nova-formatter.js";
import config from "../../config.js";

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
 * Kirim menu dengan banner link-preview (externalAdReply, gak kesimpen galeri)
 * + tombol (nativeFlowMessage) dalam SATU interactiveMessage.
 *
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Message object
 * @param {object} opts
 * @param {string} opts.text - Isi teks menu (body)
 * @param {string} opts.footer - Footer text
 * @param {string} [opts.thumbnailPath] - Path ke file gambar banner
 * @param {Array} opts.buttons - Max 6 tombol (lihat buildNativeButtons)
 * @param {string} [opts.title] - Nama bot, dipakai di subjudul "Kode: <title>"
 * @param {string} [opts.adTitle] - Override judul banner (default: greeting waktu, mis. "Selamat Pagi 🌅")
 */
async function sendMenuCard(sock, m, { text, footer, thumbnailPath, buttons = [], title = "", adTitle = "" }) {
  try {
    // WhatsApp Channel (saluran/newsletter) TIDAK support interactiveMessage/
    // nativeFlowMessage sama sekali — follower akan lihat "Anda menerima info
    // saluran, tetapi versi WhatsApp Anda tidak mendukungnya. Perbarui WhatsApp".
    // Fallback: kirim thumbnail sebagai image+caption biasa, tanpa tombol.
    if (m.chat && m.chat.endsWith("@newsletter")) {
      const thumbPath = thumbnailPath || path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
      const rawBuffer = getThumbnailBuffer(thumbPath);
      if (rawBuffer) {
        await sock.sendMessage(m.chat, { image: rawBuffer, caption: text });
      } else {
        await sock.sendMessage(m.chat, { text });
      }
      return true;
    }

    const thumbPath = thumbnailPath || path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
    const rawBuffer = getThumbnailBuffer(thumbPath);

    let adThumbnail = null;
    if (rawBuffer) {
      try {
        adThumbnail = await sharp(rawBuffer)
          .resize(640, 640, { fit: "cover" })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch (e) {
        console.error("[nova-menu-card] Gagal proses thumbnail:", e.message);
      }
    }

    const nativeButtons = buildNativeButtons(buttons);

    const externalAdReply = {
      title: adTitle || getTimeGreeting(),
      body: `Kode: ${title || config.bot?.name || "Nova AI"}`,
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: false,
      sourceUrl: config.info?.website || config.saluran?.link || "",
      ...(adThumbnail ? { thumbnail: adThumbnail } : {}),
    };

    const interactiveObj = {
      body: proto.Message.InteractiveMessage.Body.fromObject({ text }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || "" }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        buttons: nativeButtons,
      }),
      // Header TANPA media attachment — banner besar dihandle lewat
      // contextInfo.externalAdReply di bawah (link-preview, gak kesimpen galeri).
      header: proto.Message.InteractiveMessage.Header.fromObject({
        title: "",
        hasMediaAttachment: false,
      }),
      contextInfo: {
        mentionedJid: m.sender ? [m.sender] : [],
        forwardingScore: 0,
        isForwarded: false,
        externalAdReply,
      },
    };

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
