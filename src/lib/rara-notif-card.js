// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-notif-card.js — SATU PINTU desain notifikasi sistem bot
// Request owner 19 Sep 2026: "rapihkan menu yg blm ke desain kyk desain skrg,
// cntoh notif bot doctor / notif fitur baru g pakai desain skrg kyk desain .play".
// Desain standar (= .play / anime notifier / bencana): pesan teks + BANNER PREVIEW
// CARD (contextInfo.externalAdReply) — thumbnail branding Rara renderLarger,
// judul + sub-label + link. Body teks NOTIFIKASI TETAP PLAIN (aturan owner
// 5 Sep: box/smallcaps cuma buat menu & reply command) — banner cuma nambah
// identitas visual, gak ngerubah isi.
import config from "../../config.js";
import sharp from "sharp";
import { getStaticThumbnail } from "./rara-asset-manager.js";

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
