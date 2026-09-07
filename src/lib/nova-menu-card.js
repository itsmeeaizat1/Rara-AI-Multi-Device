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
import { buildCategoryButton } from "./nova-category-list.js";
import { toSC } from "./nova-menu-style.js";
import { logger } from "./nova-logger.js";
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
 * Set tombol nav standar (request owner 2026-09-04) — dipakai SEMUA command
 * ber-tombol: .menu, .allmenu, .allmenucategory, .sewa, .owner.
 *
 * 6 tombol (revisi owner 2026-09-04):
 * 1. Menu          → quick_reply .menu
 * 2. Semua Menu    → quick_reply .allmenu
 * 3. Semua Kategori → single_select popup list kategori (buildCategoryButton)
 * 4. Sewa          → single_select popup: Beli Premium / Sewa Bot
 * 5. Owner         → single_select popup: Laporkan Bug / Kirim Masukan
 * 6. Support       → single_select popup: Join Grup Resmi / Ikuti Saluran
 *                    Resmi / Donasi
 *
 * @param {object} m
 * @param {object} db
 * @param {string} [prefix="."]
 * @returns {Array} buttons siap dipakai di sendMenuCard
 */
function buildNavButtons(m, db, prefix = ".") {
  const sewaRows = [
    {
      header: "",
      title: "Beli Premium",
      description: "Buka semua fitur premium bot",
      id: `${prefix}premium`,
    },
    {
      header: "",
      title: "Sewa Bot",
      description: "Masukkan bot ke grup kamu",
      id: `${prefix}sewa`,
    },
  ];

  const ownerRows = [
    {
      header: "",
      title: "Laporkan Bug",
      description: "Laporkan error/bug ke owner",
      id: `${prefix}bugreport`,
    },
    {
      header: "",
      title: "Kirim Masukan",
      description: "Kirim saran/ide fitur ke owner",
      id: `${prefix}masukan`,
    },
  ];

  const supportRows = [
    {
      header: "",
      title: "Join Grup Resmi",
      description: "Gabung grup resmi bot",
      id: `${prefix}gcbot`,
    },
    {
      header: "",
      title: "Ikuti Saluran Resmi",
      description: "Update info bot langsung",
      id: `${prefix}channelnovaofficial`,
    },
    {
      header: "",
      title: "Donasi",
      description: "Dukung bot dengan donasi",
      id: `${prefix}donasi`,
    },
  ];

  return [
    { id: `${prefix}menu`, text: toSC("Menu") },
    { id: `${prefix}allmenu`, text: toSC("Semua Menu") },
    buildCategoryButton(m, db, prefix, toSC("Semua Kategori")),
    {
      type: "single_select",
      text: toSC("Sewa"),
      title: toSC("Pilih Layanan"),
      sections: [{ title: toSC("Layanan Bot"), rows: sewaRows }],
    },
    {
      type: "single_select",
      text: toSC("Owner"),
      title: toSC("Owner Bot"),
      sections: [{ title: toSC("Hubungi Owner"), rows: ownerRows }],
    },
    {
      type: "single_select",
      text: toSC("Support"),
      title: toSC("Support Bot"),
      sections: [{ title: toSC("Dukung Bot"), rows: supportRows }],
    },
  ];
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
// ── Auto-resolve ID newsletter dari link invite ──
// config.saluran.id sering placeholder (@newsletter) — owner cukup kasih
// LINK channel, ID numerik (120363xxx@newsletter) di-resolve sekali via
// sock.newsletterMetadata("invite", kode) lalu di-cache.
let _cachedNewsletterJid = null;
async function resolveNewsletterJid(sock) {
  const saluranId = config.saluran?.id || "";
  if (/^\d+@newsletter$/.test(saluranId)) return saluranId;
  if (_cachedNewsletterJid) return _cachedNewsletterJid;
  try {
    const link = config.saluran?.link || "";
    const m = /^https:\/\/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/.exec(link);
    if (m && sock?.newsletterMetadata) {
      const meta = await sock.newsletterMetadata("invite", m[1]);
      if (meta?.id && /^\d+@newsletter$/.test(meta.id)) {
        _cachedNewsletterJid = meta.id;
        logger.info?.("[nova-menu-card] Saluran auto-resolve:", meta.id);
        return meta.id;
      }
    }
  } catch (e) {
    console.error("[nova-menu-card] Auto-resolve saluran gagal:", e.message);
  }
  return "120363404849776664@newsletter"; // fallback sama dengan .ptvch
}

async function sendMenuCard(sock, m, { text, footer, thumbnailPath, buttons = [], title = "", adTitle = "", plain = false }) {
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

    // sourceUrl WAJIB URL https valid — link rusak bikin WA gak ngerender
    // card preview sama sekali. Prioritas: link saluran asli → website
    // valid → fallback whatsapp.com.
    const saluranLink = config.saluran?.link || "";
    const website = config.info?.website || "";
    const channelLinkOk = /^https:\/\/whatsapp\.com\/channel\/[A-Za-z0-9_-]+/.test(saluranLink);
    const urlOk = (u) => {
      try { const x = new URL(u); return x.protocol.startsWith("http") && !x.hostname.includes("_"); }
      catch { return false; }
    };
    const sourceUrl = (channelLinkOk && saluranLink) || (urlOk(website) && website) || "https://www.whatsapp.com/";

    // Baris bawah kiri card = logo kecil (auto dari thumbnail) + NAMA BOT +
    // VERSI BOT.
    const botName = title || config.bot?.name || "Nova AI";
    const botVersion = config.bot?.version || "";
    const externalAdReply = {
      title: adTitle || botName,
      body: botVersion ? `v${botVersion}` : botName,
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: false,
      sourceUrl,
      ...(adThumbnail ? { thumbnail: adThumbnail } : {}),
    };

    // ── REVERT OWNER 2026-09-07 (final): BALIK KE LINK-PREVIEW CARD, TANPA
    // TAG SALURAN & TANPA "DITERUSKAN BERKALI-KALI" ──
    // Report owner: eksperimen header-media/video/vcard-quote ala Elaina V3
    // gagal semua (jadi media biasa / gak ada tombol / malah muncul badge
    // "Diteruskan berkali-kali" + pill "Nova AI Official" di atas thumbnail
    // yang gak diinginkan). Balik ke versi stabil: banner via
    // contextInfo.externalAdReply (link-preview, gak kesimpen galeri),
    // forwardingScore 0 + isForwarded false (TIDAK ada badge forward), dan
    // forwardedNewsletterMessageInfo DIHAPUS (TIDAK ada pill saluran di atas
    // thumbnail). Tombol nativeFlow (buildNavButtons, 5-6 tombol) tetap ada.
    const contextInfo = {
      mentionedJid: m.sender ? [m.sender] : [],
      forwardingScore: 0,
      isForwarded: false,
      externalAdReply,
    };

    if (plain) {
      await sock.sendMessage(m.chat, { text, contextInfo }, { quoted: m });
      return true;
    }

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
      contextInfo,
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

export { sendMenuCard, buildNavButtons, resolveNewsletterJid };
