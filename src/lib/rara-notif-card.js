// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-notif-card.js — SATU PINTU desain notifikasi sistem bot
// Request owner 19 Sep 2026: "rapihkan menu yg blm ke desain kyk desain skrg,
// cntoh notif bot doctor / notif fitur baru g pakai desain skrg kyk desain .play".
// Desain standar (= .play / anime notifier / bencana): pesan teks + BANNER PREVIEW
// CARD (contextInfo.externalAdReply) — thumbnail branding Rara renderLarger,
// judul + sub-label + link. Body teks NOTIFIKASI TETAP PLAIN (aturan owner
// 5 Sep: box/smallcaps cuma buat menu & reply command) — banner cuma nambah
// identitas visual, gak ngerubah isi.
import fs from "fs";
import path from "path";
import config from "../../config.js";
import sharp from "sharp";
import { getStaticThumbnail } from "./rara-asset-manager.js";
import { generateWAMessageFromContent, prepareWAMessageMedia } from "rara";
import { resolveThumbAsset, buildThumbHeader, getThumbMode } from "./rara-thumb-asset.js";
import { getDatabase } from "./rara-database.js";
// FIX 6 Okt 2026: chip branding WAJIB diisi begitu nativeFlowMessage dipasang
// (lihat rara-flow-chip.js) — tanpa ini WA render placeholder "Unknown
// (kode: undefined)" di atas header image.
import { buildBrandFlowChip } from "./rara-flow-chip.js";

// cache thumbnail branding (640x360 jpeg) — asset "channel-banner" = banner
// Rara official; gagal load (panel fresh tanpa asset) → banner tanpa gambar,
// teks tetap kekirim.
let _brandThumb = null;
let _brandThumbTried = false;

export async function getBrandThumb() {
  if (_brandThumbTried) return _brandThumb;
  _brandThumbTried = true;
  try {
    _brandThumb = await getStaticThumbnail("channel-banner");
  } catch {
    _brandThumb = null;
  }
  return _brandThumb;
}

// seam buat e2e: function = mock, null = DISABLED (gak kirim apa-apa), undefined = asli
let _sendForTest = undefined;

export function _setNotifSendForTest(fn) {
  _sendForTest = fn;
}

// ══════════════════════════════════════════════════════════════════════════
// KARTU STATUS BOT (canvas dinamis) — request owner 20 Sep 2026: "kan blank
// hitam aku kira bakal ada tulisan huruf OFF/BOT DIMATIKAN gt... jd kyk
// generate canvas didalam preview stiap status ganti generate canvasnya jga
// ganti". Sebelumnya thumbnail .bot off/on/mute pakai getBrandThumb() —
// asset branding STATIS (sama persis buat ON/OFF/MUTE), makanya keliatan
// blank/gak ada tulisan ON/OFF. Sekarang thumbnail digambar LIVE per status
// pakai canvas (pola sama kayak rara-level.js generateRpgCard): background
// warna beda per state + teks besar ON/OFF/MUTE, di-flatten JPEG (WA cuma
// render jpegThumbnail di externalAdReply — pelajaran fix level card 19 Sep).
// ══════════════════════════════════════════════════════════════════════════

// seam e2e — inject createCanvas fake biar test gak nyamber native canvas
let _canvasKitForTest = null;
export function _setStatusCardCanvasForTest(kit) {
  _canvasKitForTest = kit;
}

// REVISI OWNER 20 Sep: "thumbnail bot dimatikan backgroundnya hitam aja
// trus teksnya putih jgn ada nama botnya didalam thumbnail" — background
// anime night-sky + footer branding DIGUANG, ganti background HITAM POLOS
// + teks PUTIH, TANPA nama bot di dalam thumbnail.
const STATUS_STYLE = {
  off: { bg1: "#3a0d0d", bg2: "#7a1414", accent: "#ff4d4d", big: "OFF", label: "BOT DIMATIKAN" },
  mute: { bg1: "#3a2b00", bg2: "#7a5c00", accent: "#ffc93c", big: "MUTE", label: "BOT DIJEDA" },
  on: { bg1: "#0d3a1a", bg2: "#14802e", accent: "#3cffa0", big: "ON", label: "BOT DIHIDUPKAN" },
};

/**
 * Gambar kartu status bot (640x360) — background gradient warna per state +
 * teks besar ON/OFF/MUTE. Dikembalikan sebagai JPEG buffer siap jadi thumbnail.
 * @param {"off"|"mute"|"on"} state
 */
export async function generateStatusCard(state) {
  const st = STATUS_STYLE[state] || STATUS_STYLE.on;
  // REVISI OWNER 20 Sep: background HITAM POLOS + teks PUTIH + TANPA nama bot.
  // (sebelumnya: anime night-sky + overlay + footer "Rara AI".)
  const { createCanvas } = _canvasKitForTest || (await import("@napi-rs/canvas"));
  const width = 800;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // background hitam polos
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // teks status PUTIH — pusat kartu (tanpa nama bot di dalam thumbnail)
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px sans-serif";
  ctx.fillText(st.big, width / 2, height / 2 + 12);
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(st.label, width / 2, height / 2 + 66);

  // letterbox ke 640x360 + JPEG — persis levelPreviewThumb (WA cuma render
  // jpegThumbnail di externalAdReply, pelajaran fix level card 19 Sep)
  const png = canvas.toBuffer("image/png");
  return await sharp(png)
    .resize(640, 360, { fit: "contain", background: "#000000" })
    .flatten({ background: "#000000" })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * Banner status bot (contextInfo.externalAdReply) — thumbnail canvas DINAMIS
 * per state (ganti bareng .bot off/mute/on), bukan asset branding statis.
 * Gagal gambar canvas → fallback ke getBrandThumb() biar notif tetap kekirim.
 *
 * REVISI 20 Sep 2026 (owner: "dibagian thumbnail preview status state fitur
 * bagian ini jgn link whatsapp tp waktu aja sama tanggal" — nunjuk baris
 * "🔗 whatsapp.com" di bawah kartu preview): sourceUrl DIBUANG total — baris
 * link/domain itu murni WA render otomatis dari field sourceUrl (protobuf
 * ContextInfo.ExternalAdReplyInfo.sourceUrl, optional string), gak bisa
 * diisi teks bebas selain domain URL asli. Pola SAMA kayak rara-level.js
 * replyWithCardPreview() — externalAdReply TANPA sourceUrl, sudah verified
 * live kartu RPG level render sempurna (thumbnail+title+body) tanpa baris
 * link sama sekali. body diganti nunjukin WAKTU+TANGGAL (bukan link) sesuai
 * request; format Asia/Jakarta biar konsisten sama zona waktu bot.
 * @param {"off"|"mute"|"on"} state
 * @param {object} opts - { title, body, renderLarger }
 */
export async function statusBanner(state, { title, body, renderLarger = true } = {}) {
  const st = STATUS_STYLE[state] || STATUS_STYLE.on;
  const nowStr = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
  // REVISI 20 Sep 2026 (owner: "bagian ini ubah jadi teks status misal klo
  // bot dihidupkan jadi teks statusnya: BOT DIHIDUPKAN" — nunjuk baris judul
  // kartu, dulu generik "Rara AI — Status Bot"): title kartu SEKARANG teks
  // status murni per state (BOT DIMATIKAN/BOT DIJEDA/BOT DIHIDUPKAN), gak
  // dibungkus embel-embel nama bot lagi — biar langsung kebaca statusnya.
  const ext = {
    title: String(title || st.label).substring(0, 60),
    body: String(body || nowStr).substring(0, 45),
    mediaType: 1,
    renderLargerThumbnail: !!renderLarger,
    showAdAttribution: false,
  };
  try {
    ext.thumbnail = await generateStatusCard(state);
  } catch {
    const fallback = await getBrandThumb();
    if (fallback) ext.thumbnail = fallback;
  }
  return { externalAdReply: ext };
}

/**
 * Bangun contextInfo banner (externalAdReply) ala desain .play / anime notifier.
 * REVISI 20 Sep 2026 (owner, screenshot boot doctor & bot online: "bagian
 * link whatsapp.com ini ubah jd waktu, gayanya kayak gaya bot dimatikan
 * tadi"): sourceUrl DIBUANG TOTAL (WhatsApp render chip "🔗 whatsapp.com"
 * dari field ini — sama akar kayak fix statusBanner 20 Sep) — body kini
 * SELALU waktu+tanggal Asia/Jakarta, sama gaya kartu status off/mute/on.
 * @param {object} opts
 * @param {string} opts.title - Judul card (max 60 char)
 * @param {boolean} [opts.renderLarger=true] - Banner besar (hero) kayak .play
 * @returns {Promise<object>} contextInfo siap dipasang di payload sendMessage
 */
export async function notifBanner({ title, renderLarger = true } = {}) {
  const nowStr = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const ext = {
    title: String(title || config.bot?.name || "Rara AI").substring(0, 60),
    body: nowStr.substring(0, 45),
    mediaType: 1,
    renderLargerThumbnail: !!renderLarger,
    showAdAttribution: false,
  };
  const thumb = await getBrandThumb();
  if (thumb) ext.thumbnail = thumb;
  return { externalAdReply: ext };
}

/**
 * Kirim notifikasi sistem dengan desain banner (satu pintu).
 * Body teks utuh; cuma nambahin contextInfo banner.
 * @param {object} sock - koneksi WhatsApp
 * @param {string} jid - tujuan (DM owner / grup / saluran)
 * @param {string} text - isi notif (plain text — aturan owner 5 Sep)
 * @param {object} [opts] - sama kayak notifBanner { title, body, sourceUrl, renderLarger }
 */
export async function sendNotif(sock, jid, text, opts = {}) {
  const contextInfo = await notifBanner(opts);
  const payload = { text, contextInfo };
  if (typeof _sendForTest === "function") return _sendForTest(jid, payload);
  if (_sendForTest === null) return { skipped: true }; // disabled (e2e)
  return sock.sendMessage(jid, payload);
}

// ══════════════════════════════════════════════════════════════════════════
// KARTU NOTIF HEADER IMAGE ALA .MENU (fix 6 Okt 2026, owner: "ubah fitur yg
// pakai thumbnail jenis ini ke jenis thumbnail yg di .menu biar bisa
// dicustom gambar dari asset dan thumbnailnya gak kebesaran kayak gini" —
// nunjuk screenshot Boot Doctor kotak hitam gede). Desain lama
// (externalAdReply renderLarger di text message) bikin WA render preview
// card GEDE; kartu .menu tampil rapi karena pakai HEADER IMAGE ASLI
// (hasMediaAttachment:true + upload prepareWAMessageMedia — gambar nempel
// di header interactiveMessage, ukuran wajar kayak .menu).
//
// Urutan thumbnail: asset assets/image/notif/<name>.jpg (custom owner)
// → opts.image (canvas dinamis, mis. status ON/OFF) → placeholder.jpg
// → fallback teks polos (aturan owner 6 Okt: fallback polos tanpa thumbnail).
//
// CATATAN SALURAN: WhatsApp Channel TIDAK support interactiveMessage —
// notif ke saluran TETAP pakai notifBanner (externalAdReply) via
// sendSaluranSafe di caller. sendNotifCard cuma buat chat/grup biasa.
// ══════════════════════════════════════════════════════════════════════════

// seam e2e — function = mock, null = DISABLED (gak kirim apa-apa), undefined = asli
let _notifCardSendForTest = undefined;
export function _setNotifCardSendForTest(fn) {
  _notifCardSendForTest = fn;
}

// REQUEST OWNER 6 Okt 2026: tiap thumbnail notif custom sendiri DI ASSET
// sesuai KATEGORI + NAMA fitur. Notif sistem (Boot Doctor, Bot Online,
// status .bot) bukan command terdaftar di registry plugin — kategori fixed
// "system", folder assets/image/notif/system/<name>.jpg. Fallback: nama
// flat (back-compat) → placeholder kategori → placeholder global.
const NOTIF_ASSET_CATEGORY = "system";

// asset custom (kategori system) bisa gambar ATAU gif/mp4, sesuai mode
// notifThumbMode (auto|image|video). Placeholder ikut di-resolve.
function _notifAsset(name) {
  try {
    return resolveThumbAsset({
      dir: path.join(process.cwd(), "assets", "image", "notif"),
      name,
      category: NOTIF_ASSET_CATEGORY,
      mode: getThumbMode("notif", getDatabase),
    });
  } catch {
    return null;
  }
}

/**
 * Kirim notifikasi sistem dengan kartu HEADER IMAGE ala .menu (satu pintu
 * untuk chat/grup biasa). Teks utuh di body kartu; gambar nempel di header
 * (ukuran wajar, bisa dicustom owner per-fitur lewat asset).
 * @param {object} sock - koneksi WhatsApp
 * @param {string} jid - tujuan (DM / grup — BUKAN saluran)
 * @param {string} text - isi notif (plain text)
 * @param {object} [opts]
 * @param {string} [opts.name] - nama asset custom: assets/image/notif/<name>.jpg
 * @param {Buffer} [opts.image] - buffer gambar dinamis (canvas status dsb) —
 *   kalah lawan asset <name>.jpg, menang lawan placeholder
 */
export async function sendNotifCard(sock, jid, text, opts = {}) {
  const txt = text === null || text === undefined ? "" : String(text);
  if (!txt.trim() || !sock || !jid) return null;
  if (typeof _notifCardSendForTest === "function") return _notifCardSendForTest(jid, { text: txt, ...opts });
  if (_notifCardSendForTest === null) return { skipped: true };

  // saluran / bridge / socket gak mampu → fallback polos (aturan owner 6 Okt)
  const _plain = async () => {
    try { return await sock.sendMessage(jid, { text: txt }); } catch { return null; }
  };
  if (
    String(jid).endsWith("@newsletter") ||
    sock._bridgePlatform ||
    typeof sock.relayMessage !== "function" ||
    typeof sock.waUploadToServer !== "function"
  ) {
    return _plain();
  }

  // resolve header: asset custom (gambar/gif/mp4) → gambar dinamis (opts.image,
  // mis. canvas) → placeholder. Asset NAMA FITUR menang atas canvas dinamis.
  let asset = null;
  try {
    const named = _notifAsset(opts.name);
    const isPlaceholder = named && /placeholder\.[a-z0-9]+$/i.test(named.path);
    if (named && !isPlaceholder) asset = named;
    else if (!(opts.image && Buffer.isBuffer(opts.image))) asset = named; // placeholder cuma kalau gak ada canvas
  } catch {}

  try {
    let header = null;
    if (asset) header = await buildThumbHeader(sock, asset);
    else if (opts.image && Buffer.isBuffer(opts.image)) {
      const prep = await prepareWAMessageMedia({ image: opts.image }, { upload: sock.waUploadToServer });
      if (prep && prep.imageMessage) header = { hasMediaAttachment: true, imageMessage: prep.imageMessage };
    }
    if (header) {
      const built = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header,
              body: { text: txt },
              contextInfo: { mentionedJid: [], isForwarded: false },
              nativeFlowMessage: { messageParamsJson: buildBrandFlowChip(), buttons: [] },
            },
          },
        },
      }, { userJid: sock.user && sock.user.jid });
      await sock.relayMessage(jid, built.message, { messageId: built.key.id });
      return { key: built.key };
    }
  } catch (e) {
    try {
      console.error(
        "[rara-notif-card] upload header gagal, fallback polos:",
        String(e && e.message ? e.message : e).split("\n")[0]
      );
    } catch {}
  }
  return _plain();
}
