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
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "nova";
import { buildCategoryButton, buildCategoryRows } from "./nova-category-list.js";
import { toSC } from "./nova-menu-style.js";
import { smallcapsText } from "./styler.js";
import { logger } from "./nova-logger.js";
import config from "../../config.js";

const _thumbnailCache = new Map();

/**
 * Baca thumbnail dari file, cache buffer-nya (raw, belum di-resize).
 */
function getThumbnailBuffer(imagePath) {
  // cache PER-PATH (request owner 11 Sep "versi video" — jpg & mp4 beda buffer,
  // cache global lama bikin menu lain kebagian buffer file pertama)
  if (_thumbnailCache.has(imagePath)) return _thumbnailCache.get(imagePath);

  if (!fs.existsSync(imagePath)) {
    console.error("[nova-menu-card] Thumbnail tidak ditemukan:", imagePath);
    return null;
  }

  try {
    const buf = fs.readFileSync(imagePath);
    _thumbnailCache.set(imagePath, buf);
    return buf;
  } catch (e) {
    console.error("[nova-menu-card] Gagal baca thumbnail:", e.message);
    return null;
  }
}

// ── THUMBNAIL MENU VERSI VIDEO (request owner 11 Sep 2026: "kyk gaya
// thumbnail gambar saat ini cn versi video kyk sc elaina" + script Elaina V3
// _mIsGif/menuGif): kalau ada file .mp4 saudara dari thumbnail jpg yang
// diminta (atau menuthumbnail.mp4 kanonik), header card jadi VIDEO
// (video+gifPlayback, upload prepareWAMessageMedia — persis menu Elaina),
// bukan gambar statis. Gagal upload → fallback gambar → fallback link-preview.
const VIDEO_EXT_RE = /\.(mp4|gif|webm)$/i;
function resolveMenuThumbnail(thumbPath) {
  // .gif/.mp4 eksplisit dipakai langsung (jalur lama tetap jalan)
  if (VIDEO_EXT_RE.test(thumbPath || "") && fs.existsSync(thumbPath)) {
    return { path: thumbPath, isVideo: true };
  }
  // jpg/png/webp → cari .mp4 saudara, lalu menuthumbnail.mp4 kanonik
  if (/\.(jpe?g|png|webp)$/i.test(thumbPath || "")) {
    const sibling = thumbPath.replace(/\.(jpe?g|png|webp)$/i, ".mp4");
    if (fs.existsSync(sibling)) return { path: sibling, isVideo: true };
    // kandidat canonical: se-folder dengan jpg, lalu folder video menu asli bot
    // (owner 11 Sep: "klo video hrsnya di folder video jgn image" — file video
    // menu nenggam di assets/video/menu/, bukan di assets/image/)
    for (const dir of [path.dirname(thumbPath), path.join(process.cwd(), "assets", "video", "menu")]) {
      const canonical = path.join(dir, "menuthumbnail.mp4");
      if (fs.existsSync(canonical)) return { path: canonical, isVideo: true };
    }
  }
  return { path: thumbPath, isVideo: false };
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
  const native = buttons.slice(0, 10).map((btn) => {
    if (btn.type === "placeholder_single") {
      return {
        name: "single_select",
        buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }),
      };
    }
    if (btn.type === "placeholder_call") {
      return {
        name: "call_permission_request",
        buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }),
      };
    }
    if (btn.type === "single_select") {
      // rows normalize: `id` (format lama nova) → `rowId` (format WA native).
      // GUARD SMALLCAPS (owner 2026-09-07: "seluruh semua teksnya smallcaps"):
      // semua teks yang KELIATAN (title popup, section, row title/description,
      // highlight label) di-smallcaps di titik ini — id/rowId tetap plain
      // supaya command tetap jalan pas di-tap. toSC idempotent, jadi teks yang
      // udah smallcaps aman dilewatin lagi.
      const sections = (btn.sections || []).map((sec) => ({
        ...sec,
        ...(sec.highlightLabel ? { highlight_label: toSC(sec.highlightLabel) } : {}),
        ...(sec.title ? { title: toSC(sec.title) } : {}),
        rows: (sec.rows || []).map((r) => ({
          ...r,
          ...(r.header ? { header: toSC(r.header) } : {}),
          ...(r.title ? { title: toSC(r.title) } : {}),
          ...(r.description ? { description: toSC(r.description) } : {}),
          ...(r.id && !r.rowId ? { rowId: r.id } : {}),
        })),
      }));
      const params = { title: toSC(btn.title || btn.text || ""), sections };
      if (btn.multiSelect) params.has_multiple_buttons = true;
      return {
        name: "single_select",
        buttonParamsJson: JSON.stringify(params),
      };
    }
    if (btn.type === "cta_url") {
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: toSC(btn.text || ""),
          url: btn.url,
          merchant_url: btn.merchantUrl || btn.url,
        }),
      };
    }
    if (btn.type === "cta_copy") {
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: toSC(btn.text || ""),
          copy_code: btn.copyText || "",
        }),
      };
    }
    return {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: toSC(btn.text || ""),
        id: btn.id,
      }),
    };
  });

  // ── TRIK ELAINA V3: 2 placeholder unlock di urutan pertama —
  // single_select + call_permission_request kosong (has_multiple_buttons)
  // bikin WhatsApp client mau render 6+ tombol di satu pesan ──
  return [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }),
    },
    {
      name: "call_permission_request",
      buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }),
    },
    ...native,
  ];
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
      const _nlThumb = resolveMenuThumbnail(thumbPath);
      const rawBuffer = getThumbnailBuffer(_nlThumb.path);
      // guard smallcaps juga di jalur newsletter (bypass m.reply)
      const _nlText = typeof text === "string" && text ? smallcapsText(text) : text;
      if (rawBuffer) {
        // video → kirim sebagai video (gifPlayback) — newsletter gak support
        // interactiveMessage, tapi video biasa aman
        await sock.sendMessage(m.chat, _nlThumb.isVideo
          ? { video: rawBuffer, gifPlayback: true, caption: _nlText }
          : { image: rawBuffer, caption: _nlText });
      } else {
        await sock.sendMessage(m.chat, { text: _nlText });
      }
      return true;
    }

    const _mReqPath = thumbnailPath || path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
    const _mThumb = resolveMenuThumbnail(_mReqPath);
    const thumbPath = _mThumb.path;
    const _mIsVideo = _mThumb.isVideo;
    const rawBuffer = getThumbnailBuffer(thumbPath);
    // buffer GAMBAR untuk externalAdReply fallback (kalau mode video,
    // banner link-preview gak boleh dikasih bytes video — WA rendernya hangus)
    const _mImageBuf = _mIsVideo
      ? (getThumbnailBuffer(_mReqPath) || null)
      : rawBuffer;

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

    // Baris bawah kiri card = NAMA BOT + VERSI + MODE (prototype Elaina V3)
    const botName = title || config.bot?.name || "Nova AI";
    const botVersion = config.bot?.version || "";
    const botMode = (config.mode === "self" ? "SELF" : "PUBLIC");
    const externalAdReply = {
      title: botName,
      body: `v${botVersion || "1.0"} \u2022 ${botMode}`,
      mediaType: 1,
      showAdAttribution: false,
      renderLargerThumbnail: true,
      ...(_mImageBuf ? { thumbnail: _mImageBuf } : {}),
      sourceUrl,
    };

    if (plain) {
      // fallback plain ikut guard smallcaps (jalur ini lewat sock.sendMessage,
      // gak lewat m.reply) — owner: "seluruh semua teksnya smallcaps".
      const _plainText = typeof text === "string" && text ? smallcapsText(text) : text;
      await sock.sendMessage(m.chat, { text: _plainText, contextInfo: {
        mentionedJid: m.sender ? [m.sender] : [],
        forwardingScore: 0,
        isForwarded: false,
        externalAdReply,
      } }, { quoted: m });
      return true;
    }

    // fakeQuoted vcard — pesan di-quote ke kontak bot (status@broadcast)
    // biar muncul header nama bot di atas pesan. TANPA metadata forwarding
    // (owner 2026-09-07: "aku g mau ada forwadingnya").
    const _mQuoted = {
      key: {
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
      },
      message: {
        contactMessage: {
          displayName: `\u{1FAB8} ${botName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nitem1.TEL;waid=0:+0\nEND:VCARD`,
          sendEphemeral: true,
        },
      },
    };

    // ── KODE MENU ELAINA YANG BENERAN DIPAKAI (2026-09-07, owner kirim
    // source asli): thumbnail = MEDIA ATTACHMENT di header (upload ke server
    // WA via prepareWAMessageMedia — image, atau GIF via video+gifPlayback),
    // externalAdReply CUMA jadi fallback kalau upload header gagal. ContextInfo
    // proto: pill newsletter saja — TANPA forwarding (owner larang). ──
    let _mHeader = { title: "", hasMediaAttachment: false };
    if (rawBuffer) {
      try {
        const _mMediaPrep = await prepareWAMessageMedia(
          _mIsVideo ? { video: rawBuffer, gifPlayback: true } : { image: rawBuffer },
          { upload: sock.waUploadToServer }
        );
        if (_mIsVideo && _mMediaPrep?.videoMessage) {
          _mHeader = { hasMediaAttachment: true, videoMessage: _mMediaPrep.videoMessage };
        } else if (_mMediaPrep?.imageMessage) {
          _mHeader = { hasMediaAttachment: true, imageMessage: _mMediaPrep.imageMessage };
        }
      } catch (e) {
        console.error("[nova-menu-card] Upload banner header gagal, fallback link-preview:", e.message);
      }
    }

    // limited_time_offer + bottom_sheet — chip versi bot & konfigurasi popup
    // list kategori (messageParamsJson nativeFlowMessage, pola Elaina).
    // REQUEST OWNER 2026-09-07: chip yang dulu nampilin "berakhir 22 Nov"
    // (expiration_time Date.now()*999 ala Elaina = overflow tanggal) diganti
    // jadi VERSI BOT — expiration_time dibuang total biar WA gak nampilin
    // tanggal kadaluarsa apa pun. Versi dibaca dari config.bot.version biar
    // otomatis ke-update tiap rilis.
    // REQUEST OWNER 2026-09-07: slot "kode" di chip diganti TANGGAL
    // (format Indonesia: "Sen, 7 Sep 2026") — dinamis dari waktu kirim,
    // otomatis ganti tiap hari.
    const _mHari = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const _mBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const _mNow = new Date();
    const _mTanggal = `${_mHari[_mNow.getDay()]}, ${_mNow.getDate()} ${_mBulan[_mNow.getMonth()]} ${_mNow.getFullYear()}`;

    const _mFlowParams = JSON.stringify({
      limited_time_offer: {
        text: `${toSC(botName)} • ${toSC("Versi")} ${botVersion || "24.0.0"}`,
        url: sourceUrl,
        copy_code: _mTanggal,
      },
      bottom_sheet: {
        in_thread_buttons_limit: 2,
        divider_indices: [2, 3, 4, 5, 6, 999],
        list_title: toSC("Pilih Kategori Menu"),
        button_title: toSC("Menu Selengkapnya"),
      },
    });

    // FORWARDING DIHAPUS TOTAL (request owner 2026-09-07: "aku g mau ada
    // forwadingnya") — tanpa forwardingScore/isForwarded, WA gak nampilin
    // label "Diteruskan" di menu card.
    const _mCtx = {
      mentionedJid: m.sender ? [m.sender] : [],
      forwardedNewsletterMessageInfo: {
        newsletterJid: await resolveNewsletterJid(sock),
        newsletterName: config.saluran?.name || botName,
        serverMessageId: 127,
      },
      // banner fallback HANYA kalau media header gagal di-upload
      ...(!_mHeader.hasMediaAttachment && _mImageBuf ? { externalAdReply } : {}),
    };

    // GUARD SMALLCAPS BODY + FOOTER (owner 2026-09-07: "seluruh semua
    // teksnya smallcaps") — card dikirim via relayMessage, JALUR YANG GAK
    // LEWAT guard m.reply (nova-serialize), jadi teks cmd/menu yang masuk
    // body card di-smallcaps di sini. URL & isi code fence otomatis
    // dilindungi oleh smallcapsText (tetap persis).
    const _mBodyText = typeof text === "string" && text ? smallcapsText(text) : text;
    const _mFooter = toSC(footer || `\u2726 ${botName}`);

    const interactiveObj = {
      body: proto.Message.InteractiveMessage.Body.fromObject({ text: _mBodyText }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({
        text: _mFooter,
      }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        messageParamsJson: _mFlowParams,
        buttons: nativeButtons,
      }),
      header: proto.Message.InteractiveMessage.Header.fromObject(_mHeader),
      contextInfo: _mCtx,
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
      { userJid: m.sender, quoted: _mQuoted },
    );

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    return true;
  } catch (e) {
    console.error("[nova-menu-card] sendMenuCard gagal, fallback ke text biasa:", e.message, "\nSTACK:", e.stack);
    try {
      const _errText = typeof text === "string" && text ? smallcapsText(text) : text;
      await sock.sendMessage(m.chat, { text: _errText }, { quoted: m });
    } catch {}
    return false;
  }
}

export { sendMenuCard, buildNavButtons, resolveNewsletterJid };
