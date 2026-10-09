// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * rara-menu-card.js
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
 * Pattern PROVEN untuk tombol (dipakai di plugins/group/checkidgc.js):
 * - contextInfo diletakkan LANGSUNG di dalam interactiveMessage (bukan di
 *   messageContextInfo.contextInfo) via proto.Message.InteractiveMessage.fromObject().
 * - externalAdReply ditaruh di contextInfo YANG SAMA (proto InteractiveMessage
 *   punya field contextInfo sendiri) — jadi banner + tombol tetap satu pesan.
 * - nativeFlowMessage buttons: support quick_reply, cta_copy, single_select, dst.
 *   Max ~6 buttons per pesan (WhatsApp bisa nolak render kalau kebanyakan).
 */

import fs from "fs";
import path from "path";
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "rara";
import { buildCategoryButton, buildCategoryRows } from "./rara-category-list.js";
import { toSC } from "./rara-menu-style.js";
import { smallcapsText, formatGuard } from "./styler.js";
import { logger } from "./rara-logger.js";
import config from "../../config.js";
// Multi-language (fix 18 Sep 2026): menu card ikut ke-translate ke bahasa
// user — teks body, footer, title/description tombol, sebelum di-smallcaps.
import { translateUI, needsTranslation } from "./rara-i18n.js";
import { getDatabase } from "./rara-database.js";
// FIX 6 Okt 2026: chip branding WAJIB diisi begitu nativeFlowMessage dipasang
// (lihat rara-flow-chip.js) — tanpa ini WA render placeholder "Unknown
// (kode: undefined)" di atas header image usage card.
import { buildBrandFlowChip } from "./rara-flow-chip.js";
// REQUEST OWNER 6 Okt 2026: tiap thumbnail usage custom sendiri DI ASSET
// sesuai KATEGORI + NAMA fitur (bukan satu placeholder polos buat semua) —
// kategori di-resolve otomatis dari command name via getPlugin() (registry
// pluginConfig.category), gak perlu ubah 51+ titik call-site.
import { getPlugin } from "./rara-plugins.js";
// thumbnail usage bisa GAMBAR atau GIF/MP4 + ganti mode (.setusagethumb)
import { resolveThumbAsset, buildThumbHeader, getThumbMode } from "./rara-thumb-asset.js";

const _thumbnailCache = new Map();

/**
 * Baca thumbnail dari file, cache buffer-nya (raw, belum di-resize).
 */
function getThumbnailBuffer(imagePath) {
  // cache PER-PATH (request owner 11 Sep "versi video" — jpg & mp4 beda buffer,
  // cache global lama bikin menu lain kebagian buffer file pertama)
  if (_thumbnailCache.has(imagePath)) return _thumbnailCache.get(imagePath);

  if (!fs.existsSync(imagePath)) {
    console.error("[rara-menu-card] Thumbnail tidak ditemukan:", imagePath);
    return null;
  }

  try {
    const buf = fs.readFileSync(imagePath);
    _thumbnailCache.set(imagePath, buf);
    return buf;
  } catch (e) {
    console.error("[rara-menu-card] Gagal baca thumbnail:", e.message);
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

// ── VARIAN THUMBNAIL MENU (request owner 11 Sep: "menu thumbnail versi video
// jadi varian 2, varian 1 bawaan thumbnail gambar bawaan"):
// V1 (default) = header gambar statis bawaan (jpg menu), V2 = header video
// yang gerak (assets/video/menu/menuthumbnail.mp4, ala script Elaina).
// Setting db: menuThumbVariant (1|2), diatur via .setallmenu / .setmenu.
function getMenuThumbVariant() {
  try {
    const db = getDatabase();
    const v = Number(db?.setting?.("menuThumbVariant"));
    return v === 2 ? 2 : 1;
  } catch {
    return 1;
  }
}

// Pilih thumbnail sesuai varian aktif — varian 1 pakai jpg diminta apa adanya
// (jalur video cuma aktif varian 2 ATAU caller eksplisit kasih path video).
function pickMenuThumb(requestedPath) {
  if (getMenuThumbVariant() === 2 || VIDEO_EXT_RE.test(requestedPath || "")) {
    return resolveMenuThumbnail(requestedPath);
  }
  return { path: requestedPath, isVideo: false };
}

/**
 * Set tombol nav standar (request owner 2026-09-04) — dipakai SEMUA command
 * ber-tombol: .menu, .allmenu, .allmenucategory, .sewa, .owner.
 *
 * 7 tombol (tambahan owner 2026-09-20):
 * 1. Menu          → quick_reply .menu
 * 2. Semua Menu    → quick_reply .allmenu
 * 3. Semua Kategori → single_select popup list kategori (buildCategoryButton)
 * 4. Penggunaan    → single_select popup: Rules / Tutorial (owner 20 Sep:
 *                    tombol SEBELUM Pilih Layanan, popup list Rules & Tutorial)
 * 5. Sewa          → single_select popup: Beli Premium / Sewa Bot
 * 6. Owner         → single_select popup: Laporkan Bug / Kirim Masukan
 * 7. Support       → single_select popup: Join Grup / Saluran Resmi / Donasi
 * 8. Beri Penilaian → single_select popup: 5 pilihan rating Sangat Baik ⭐⭐⭐⭐⭐
 *                    s/d Sangat Buruk ⭐ (owner 20 Sep: dipindah dari popup
 *                    Support jadi tombol nav sendiri — total 8 tombol)
 *
 * @param {object} m
 * @param {object} db
 * @param {string} [prefix="."]
 * @returns {Array} buttons siap dipakai di sendMenuCard
 */
function buildNavButtons(m, db, prefix = ".") {
  // Request owner 20 Sep 2026: tombol "Penggunaan" SEBELUM tombol Sewa
  // (Pilih Layanan) — pas diklik muncul popup list Rules & Tutorial.
  const penggunaanRows = [
    {
      header: "",
      title: "Rules",
      description: "Peraturan & ketentuan penggunaan bot",
      id: `${prefix}rules`,
    },
    {
      header: "",
      title: "Tutorial",
      description: "Cara pakai bot untuk pemula",
      id: `${prefix}tutorial`,
    },
  ];

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

  // 5 pilihan rating — popup LANGSUNG di tombol nav sendiri (request owner
  // 20 Sep 2026: "tombol beri penilaian gak muncul pilihan 5 pilihan kayak
  // dari sangat buruk sampai sangat baik, dipindahkan di depan setelah tombol
  // navigasi support, total 8 tombol"). Dulu cuma row di popup Support yang
  // ngirim .penilaian → kartu popup KEDUA — sekarang pilihan muncul instan
  // pas tombol nav diklik. Id sama kayak input manual (plugin parseRating).
  const ratingRows = [
    { header: "", title: "⭐⭐⭐⭐⭐ Sangat Baik", description: "Layanan bot luar biasa, keep it up!", id: `${prefix}penilaian 5` },
    { header: "", title: "⭐⭐⭐⭐ Baik", description: "Bot nyaman dan enak dipakai", id: `${prefix}penilaian 4` },
    { header: "", title: "⭐⭐⭐ Cukup", description: "Biasa aja, masih bisa lebih baik", id: `${prefix}penilaian 3` },
    { header: "", title: "⭐⭐ Buruk", description: "Banyak yang perlu dibenerin", id: `${prefix}penilaian 2` },
    { header: "", title: "⭐ Sangat Buruk", description: "Pengalaman pakai yang jelek", id: `${prefix}penilaian 1` },
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
      id: `${prefix}channelraraofficial`,
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
      text: toSC("Penggunaan"),
      title: toSC("Penggunaan Bot"),
      sections: [{ title: toSC("Ketentuan & Panduan"), rows: penggunaanRows }],
    },
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
    {
      type: "single_select",
      text: toSC("Beri Penilaian"),
      title: toSC("⭐ Pilih Penilaian"),
      sections: [{ title: toSC("Penilaian Kamu"), rows: ratingRows }],
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
      // rows normalize: `id` (format lama rara) → `rowId` (format WA native).
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
// ── Auto-resolve ID newsletter: SEKARANG SATU PINTU di rara-saluran.js ──
// (dulu resolver duplikat di sini — sama persis dengan yang bot.js butuhin,
//  tapi bot.js gak pernah makai → notif .bot off/on gak pernah nyampe saluran)
import { resolveNewsletterJid } from "./rara-saluran.js";

async function sendMenuCard(sock, m, { text, footer, thumbnailPath, buttons = [], title = "", adTitle = "", plain = false }) {
  try {
    // BRIDGE MULTI-PLATFORM (29 Sep): Telegram/Discord gak punya kartu interactive
    // WA — teks menu polos aja (kejut + antiarm), sama kayak jalur newsletter.
    if (sock && sock._bridgePlatform) {
      // Telegram/Discord: thumbnail menu (gambar/VIDEO) dikirim duluan sebagai
      // media + caption pendek (caption TG maks 1024 char), lalu teks menu
      // lengkap sebagai pesan terpisah.
      const _brThumb = pickMenuThumb(thumbnailPath || path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg"));
      const _brBuf = getThumbnailBuffer(_brThumb.path);
      const _brText = typeof text === "string" && text ? smallcapsText(text) : text;
      const _brCaption = String(title || "").slice(0, 900);
      if (_brBuf) {
        await sock.sendMessage(m.chat, _brThumb.isVideo
          ? { video: _brBuf, caption: _brCaption }
          : { image: _brBuf, caption: _brCaption });
      }
      await sock.sendMessage(m.chat, { text: _brText }, { quoted: m });
      return true;
    }

    // WhatsApp Channel (saluran/newsletter) TIDAK support interactiveMessage/
    // nativeFlowMessage sama sekali — follower akan lihat "Anda menerima info
    // saluran, tetapi versi WhatsApp Anda tidak mendukungnya. Perbarui WhatsApp".
    // Fallback: kirim thumbnail sebagai image+caption biasa, tanpa tombol.
    if (m.chat && m.chat.endsWith("@newsletter")) {
      const thumbPath = thumbnailPath || path.join(process.cwd(), "assets", "image", "menu", "menuthumbnail.jpg");
      const _nlThumb = pickMenuThumb(thumbPath);
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
    const _mThumb = pickMenuThumb(_mReqPath);
    const thumbPath = _mThumb.path;
    const _mIsVideo = _mThumb.isVideo;
    const rawBuffer = getThumbnailBuffer(thumbPath);
    // buffer GAMBAR untuk externalAdReply fallback (kalau mode video,
    // banner link-preview gak boleh dikasih bytes video — WA rendernya hangus)
    const _mImageBuf = _mIsVideo
      ? (getThumbnailBuffer(_mReqPath) || null)
      : rawBuffer;

    // ── Multi-language: translate teks menu SEBELUM smallcaps ──
    // (fix 18 Sep 2026 — menu card gak lewat m.reply, jadi wajib hook sendiri.
    //  Google gak kenali glyph smallcaps → translate HARUS duluan.)
    const _mlSender = m.sender || m.key?.participant || m.key?.remoteJid || "";
    // FIX 19 Sep 2026 (owner: "tombol menu ke translate tp tdk dgn menu dan
    // allmenu biasa"): dua label chip/popup ini SEBELUMNYA hardcoded bahasa
    // Indonesia, gak pernah lewat translateUI sama sekali (beda dari body/
    // footer/buttons di atas yang sudah ke-translate) — makanya popup kategori
    // & chip versi keliatan campur: isi baris translated, judul/tombolnya gak.
    let _mListTitle = "Pilih Kategori Menu";
    let _mButtonTitle = "Menu Selengkapnya";
    let _mVersiLabel = "Versi";
    if (needsTranslation(_mlSender)) {
      try {
        if (typeof text === "string" && text) text = await translateUI(text, _mlSender);
        if (typeof footer === "string" && footer) footer = await translateUI(footer, _mlSender);
        _mListTitle = await translateUI(_mListTitle, _mlSender);
        _mButtonTitle = await translateUI(_mButtonTitle, _mlSender);
        _mVersiLabel = await translateUI(_mVersiLabel, _mlSender);
        if (Array.isArray(buttons) && buttons.length) {
          buttons = await Promise.all(buttons.map(async (b) => {
            if (!b || typeof b !== "object") return b;
            const nb = { ...b };
            if (typeof nb.text === "string" && nb.text) nb.text = await translateUI(nb.text, _mlSender);
            if (typeof nb.title === "string" && nb.title) nb.title = await translateUI(nb.title, _mlSender);
            if (typeof nb.description === "string" && nb.description) nb.description = await translateUI(nb.description, _mlSender);
            if (Array.isArray(nb.sections) && nb.sections.length) {
              nb.sections = await Promise.all(nb.sections.map(async (sec) => {
                if (!sec || typeof sec !== "object") return sec;
                const ns = { ...sec };
                if (typeof ns.title === "string" && ns.title) ns.title = await translateUI(ns.title, _mlSender);
                if (Array.isArray(ns.rows) && ns.rows.length) {
                  ns.rows = await Promise.all(sec.rows.map(async (r) => {
                    if (!r || typeof r !== "object") return r;
                    const nr = { ...r };
                    if (typeof nr.title === "string" && nr.title) nr.title = await translateUI(nr.title, _mlSender);
                    if (typeof nr.description === "string" && nr.description) nr.description = await translateUI(nr.description, _mlSender);
                    return nr;
                  }));
                }
                return ns;
              }));
            }
            return nb;
          }));
        }
      } catch {}
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

    // Baris bawah kiri card = NAMA BOT + VERSI + MODE (prototype Elaina V3)
    const botName = title || config.bot?.name || "Rara AI";
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
    // OWNER 9 Okt 2026: hasMediaAttachment di-FALSE (eksperimen anti "simpan
    // ke galeri" — identik struktur Elaina tapi flag-nya false, media tetap
    // di-upload & nempel di header). Kalau header malah gak ke-render,
    // balikin ke true.
    let _mUploaded = false;
    if (rawBuffer) {
      try {
        const _mMediaPrep = await prepareWAMessageMedia(
          _mIsVideo ? { video: rawBuffer, gifPlayback: true } : { image: rawBuffer },
          { upload: sock.waUploadToServer }
        );
        if (_mIsVideo && _mMediaPrep?.videoMessage) {
          _mHeader = { hasMediaAttachment: false, videoMessage: _mMediaPrep.videoMessage };
          _mUploaded = true;
        } else if (_mMediaPrep?.imageMessage) {
          _mHeader = { hasMediaAttachment: false, imageMessage: _mMediaPrep.imageMessage };
          _mUploaded = true;
        }
      } catch (e) {
        console.error("[rara-menu-card] Upload banner header gagal, fallback link-preview:", e.message);
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
        text: `${toSC(botName)} • ${toSC(_mVersiLabel)} ${botVersion || "24.0.0"}`,
        url: sourceUrl,
        copy_code: _mTanggal,
      },
      bottom_sheet: {
        in_thread_buttons_limit: 2,
        divider_indices: [2, 3, 4, 5, 6, 999],
        list_title: toSC(_mListTitle),
        button_title: toSC(_mButtonTitle),
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
      ...(!_mUploaded && _mImageBuf ? { externalAdReply } : {}),
    };

    // GUARD SMALLCAPS BODY + FOOTER (owner 2026-09-07: "seluruh semua
    // teksnya smallcaps") — card dikirim via relayMessage, JALUR YANG GAK
    // LEWAT guard m.reply (rara-serialize), jadi teks cmd/menu yang masuk
    // body card di-smallcaps di sini. URL & isi code fence otomatis
    // dilindungi oleh smallcapsText (tetap persis).
    const _mBodyText = typeof text === "string" && text ? smallcapsText(text) : text;
    // REVISI OWNER 3 Okt 2026: footer kartu menu balik desain lama (✦ nama bot), tanpa hati.
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
    console.error("[rara-menu-card] sendMenuCard gagal, fallback ke text biasa:", e.message, "\nSTACK:", e.stack);
    try {
      const _errText = typeof text === "string" && text ? smallcapsText(text) : text;
      await sock.sendMessage(m.chat, { text: _errText }, { quoted: m });
    } catch {}
    return false;
  }
}

// ── sendUsageCard ── kartu usage bertumbnail HEADER IMAGE ASLI ala .menu
// (request owner 5 Okt: thumbnail semua pesan usage seperti menu; revisi
// 6 Okt: "gak muncul meski ada gambarnya" — externalAdReply.thumbnail bytes
// gak ke-render di client WA, jadi jalur utama kini upload header image
// persis sendMenuCard). Fallback m.reply V1 (bridge/newsletter/upload gagal)
// tetap jalan dengan externalAdReply contextInfo. Konvensi ASSET per-fitur:
//   assets/image/usage/<name>.jpg  → thumbnail khusus fitur itu
//   assets/image/usage/placeholder.jpg → fallback kosongan (owner ganti sendiri)
// <name> dikirim call-site via opts.name (nama command dari raraSalah).
// Sock gak dibutuhin; m.reply sendiri udah punya semua fallback
// (bridge/newsletter/relay gagal → plain text) — asersi suite tetap jalan.
export async function sendUsageCard(sock, m, text, opts = {}) {
  const _txt0 = text === null || text === undefined ? "" : String(text);
  if (!_txt0.trim()) return null;
  if (!m || typeof m.reply !== "function") return null;

  // ── resolve thumbnail ASSET: kategori/nama → nama flat → placeholder
  // kategori → placeholder global; tipe gambar ATAU gif/mp4 sesuai mode
  // (auto|image|video, setting usageThumbMode). Kategori dari registry plugin.
  let _asset = null;
  try {
    const _usageDir = path.join(process.cwd(), "assets", "image", "usage");
    const _name = String(opts.name || "").replace(/[^a-zA-Z0-9-]/g, "");
    const _pl = _name ? getPlugin(_name) : null;
    const _cat = opts.category || _pl?.config?.category || _pl?.category || "uncategorized";
    _asset = resolveThumbAsset({
      dir: _usageDir,
      name: _name,
      category: _cat,
      mode: getThumbMode("usage", getDatabase),
    });
  } catch {}

  // ── pipeline teks IDENTIK m.reply: formatGuard → translate → smallcaps
  // (jalur header gak lewat m.reply, jadi pipenya digandain di sini)
  let _txt = _txt0;
  try { _txt = formatGuard(_txt); } catch {}
  try { if (needsTranslation(m.sender)) _txt = await translateUI(_txt, m.sender); } catch {}
  try { _txt = smallcapsText(_txt); } catch {}

  // ── JALUR UTAMA (fix 6 Okt 2026, owner: "thumbnail gak muncul meski ada
  // gambarnya"): externalAdReply.thumbnail bytes TERBUKTI gak ke-render di
  // client WA — kartu .menu bisa muncul karena pakai HEADER IMAGE ASLI
  // (hasMediaAttachment:true + upload prepareWAMessageMedia ke server WA).
  // Kartu usage kini pakai jalur yang sama persis: gambar nempel di header,
  // teks usage di body — tampilan identik .menu.
  if (
    _asset &&
    sock &&
    typeof sock.relayMessage === "function" &&
    typeof sock.waUploadToServer === "function" &&
    !(m.chat && m.chat.endsWith("@newsletter")) &&
    !sock._bridgePlatform
  ) {
    try {
      const _hdr = await buildThumbHeader(sock, _asset);
      if (_hdr) {
        const _built = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                  // LEBAR PENUH ala .menu (request owner 6 Okt 2026: "biar
                  // lebar mirip seperti menu") — deviceListMetadata bikin
                  // kartu interactive render selebar pesan biasa.
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2,
                },
              interactiveMessage: {
                header: _hdr,
                body: { text: _txt },
                contextInfo: {
                  mentionedJid: m.sender ? [m.sender] : [],
                  isForwarded: false,
                },
                nativeFlowMessage: { messageParamsJson: buildBrandFlowChip(), buttons: [] },
              },
            },
          },
        }, { quoted: m, userJid: sock.user && sock.user.jid });
        await sock.relayMessage(m.chat, _built.message, { messageId: _built.key.id });
        return { key: _built.key };
      }
    } catch (e) {
      try {
        console.error(
          "[sendUsageCard] upload header gagal, fallback jalur m.reply:",
          (e && e.message ? e.message : String(e)).split("\n")[0]
        );
      } catch {}
    }
  }

  // ── FALLBACK (revisi owner 6 Okt 2026: "fallbacknya ke polos aja tanpa
  // thumbnail"): bridge/newsletter/upload header gagal → teks polos via
  // m.reply. Gak ada lagi externalAdReply thumbnail bytes — jalur itu
  // terbukti gak ke-render di client WA.
  try {
    return await m.reply(_txt0, { __noCard: true });
  } catch {
    // pesan keluar bot gak boleh mati senyap — last ditch plain text
    try {
      return await sock.sendMessage(m.chat, { text: _txt0 });
    } catch { return null; }
  }
}

export { sendMenuCard, buildNavButtons, resolveNewsletterJid };
