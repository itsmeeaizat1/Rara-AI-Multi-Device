// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-notif-card.js — SATU PINTU desain notifikasi sistem bot
// Request owner 19 Sep 2026: "rapihkan menu yg blm ke desain kyk desain skrg,
// cntoh notif bot doctor / notif fitur baru g pakai desain skrg kyk desain .play".
// Desain standar (= .play / anime notifier / bencana): pesan teks + BANNER PREVIEW
// CARD (contextInfo.externalAdReply) — thumbnail branding Nova renderLarger,
// judul + sub-label + link. Body teks NOTIFIKASI TETAP PLAIN (aturan owner
// 5 Sep: box/smallcaps cuma buat menu & reply command) — banner cuma nambah
// identitas visual, gak ngerubah isi.
import config from "../../config.js";
import sharp from "sharp";
import { getStaticThumbnail } from "./nova-asset-manager.js";

// cache thumbnail branding (640x360 jpeg) — asset "channel-banner" = banner
// Nova official; gagal load (panel fresh tanpa asset) → banner tanpa gambar,
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
// pakai canvas (pola sama kayak nova-level.js generateRpgCard): background
// warna beda per state + teks besar ON/OFF/MUTE, di-flatten JPEG (WA cuma
// render jpegThumbnail di externalAdReply — pelajaran fix level card 19 Sep).
// ══════════════════════════════════════════════════════════════════════════

// seam e2e — inject createCanvas fake biar test gak nyamber native canvas
let _canvasKitForTest = null;
export function _setStatusCardCanvasForTest(kit) {
  _canvasKitForTest = kit;
}

// background kartu status — SAMA wallpaper kayak kartu level (nova-level.js)
// biar satu keluarga desain. Di-CACHE module-level: fetch network cuma
// sekali per proses (gak boleh lambatin notif .bot off/on berikutnya).
let _bgImg = null;
let _bgTried = false;
const STATUS_BG_URL = "https://images.wallpapersden.com/image/download/anime-night-sky-scenery_bWlsZ26UmZqaraWkpJRmbmdlrWZnZWU.jpg";
async function _loadStatusBg(loadImage) {
  if (_bgTried) return _bgImg;
  _bgTried = true;
  try { _bgImg = await loadImage(STATUS_BG_URL); } catch { _bgImg = null; }
  return _bgImg;
}

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
  // gaya VISUAL disamain sama kartu level (nova-level.js generateRpgCard):
  // background anime night-sky + overlay gelap + border + footer branding.
  // (request owner 20 Sep: "thumbnail level jga sama thumbnailnya besar kyk
  // gini trus kegenerate status dihasil canvasnya" — kartu status harus
  // keliatan satu keluarga desain sama kartu level.)
  const { createCanvas, loadImage } = _canvasKitForTest || (await import("@napi-rs/canvas"));
  const width = 800;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(10, 10, width - 20, height - 20, 30);
  ctx.clip();
  const background = await _loadStatusBg(loadImage);
  if (background) {
    const ratio = Math.max(width / background.width, height / background.height);
    const x = (width - background.width * ratio) / 2;
    const y = (height - background.height * ratio) / 2;
    ctx.drawImage(background, x, y, background.width * ratio, background.height * ratio);
  } else {
    // offline / gagal load → gradient warna state (off merah / mute kuning / on hijau)
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, st.bg1);
    g.addColorStop(1, st.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // teks besar status — pusat kartu
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = st.accent;
  ctx.font = "bold 120px sans-serif";
  ctx.fillText(st.big, width / 2, height / 2 + 12);
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(st.label, width / 2, height / 2 + 66);

  // footer branding — sama kayak kartu level
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "12px sans-serif";
  ctx.fillText(config.bot?.name || "Nova AI", 30, height - 18);

  // letterbox ke 640x360 + JPEG — persis levelPreviewThumb (WA cuma render
  // jpegThumbnail di externalAdReply, pelajaran fix level card 19 Sep)
  const png = canvas.toBuffer("image/png");
  return await sharp(png)
    .resize(640, 360, { fit: "contain", background: "#0b0b14" })
    .flatten({ background: "#0b0b14" })
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
 * diisi teks bebas selain domain URL asli. Pola SAMA kayak nova-level.js
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
  const ext = {
    title: String(title || `Nova AI — ${st.label}`).substring(0, 60),
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
 * @param {object} opts
 * @param {string} opts.title - Judul card (max 60 char)
 * @param {string} [opts.body] - Sub-label card (max 45 char)
 * @param {string} [opts.sourceUrl] - Link sumber (default: link saluran official)
 * @param {boolean} [opts.renderLarger=true] - Banner besar (hero) kayak .play
 * @returns {Promise<object>} contextInfo siap dipasang di payload sendMessage
 */
export async function notifBanner({ title, body, sourceUrl, renderLarger = true } = {}) {
  const ext = {
    title: String(title || config.bot?.name || "Nova AI").substring(0, 60),
    body: String(body || "notifikasi otomatis nova").substring(0, 45),
    mediaType: 1,
    renderLargerThumbnail: !!renderLarger,
    showAdAttribution: false,
    sourceUrl: sourceUrl || config.saluran?.link || "https://whatsapp.com",
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
