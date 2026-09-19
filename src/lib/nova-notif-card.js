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
