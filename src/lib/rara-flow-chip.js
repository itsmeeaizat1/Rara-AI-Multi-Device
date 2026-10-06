// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-flow-chip.js — SATU PINTU chip branding "limited_time_offer" buat
// nativeFlowMessage.messageParamsJson.
//
// AKAR BUG 6 Okt 2026 (owner screenshot: teks italic "Unknown(kode:undefined)"
// nongol DI ATAS header image kartu Boot Doctor/notif/usage, padahal .menu &
// .allmenu bersih dan malah ada "tag" chip kecil (nama bot • versi + tanggal)
// di bawah header). AKAR: sendNotifCard (rara-notif-card.js) & sendUsageCard
// (rara-menu-card.js) build interactiveMessage dengan nativeFlowMessage
// TANPA messageParamsJson (cuma `{ buttons: [] }`). Begitu nativeFlowMessage
// dipasang, klien WA MENGHARAPKAN chip data (limited_time_offer) — kalau
// kosong klien fallback ke placeholder generik "Unknown (kode: undefined)"
// yang dirender di atas header. sendMenuCard (.menu/.allmenu) SELAMAT dari
// bug ini karena SELALU mengisi messageParamsJson (chip + bottom_sheet).
//
// FIX: semua pemanggil nativeFlowMessage (termasuk yang buttons:[] kosong)
// WAJIB isi messageParamsJson — build via buildBrandFlowChip() di sini,
// dipakai bareng oleh rara-notif-card.js & rara-menu-card.js (sendUsageCard).
import config from "../../config.js";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function urlOk(u) {
  try {
    const x = new URL(u);
    return x.protocol.startsWith("http") && !x.hostname.includes("_");
  } catch {
    return false;
  }
}

/**
 * Build messageParamsJson chip branding "RARA AI - MULTI DEVICE • Versi x.x.x"
 * + tanggal hari ini (aturan owner: watermark/credit header pakai
 * "RARA AI - MULTI DEVICE"). Dipasang di SEMUA nativeFlowMessage — termasuk
 * yang buttons:[] kosong — biar WA render tag branding, bukan placeholder
 * "Unknown (kode: undefined)".
 * @returns {string} JSON string siap pakai di nativeFlowMessage.messageParamsJson
 */
export function buildBrandFlowChip() {
  const botVersion = config.bot?.version || "24.0.0";
  const now = new Date();
  const tanggal = `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
  const saluranLink = config.saluran?.link || "";
  const website = config.info?.website || "";
  const channelLinkOk = /^https:\/\/whatsapp\.com\/channel\/[A-Za-z0-9_-]+/.test(saluranLink);
  // sourceUrl WAJIB https valid — url rusak bikin chip gak kerender (sama
  // aturan sourceUrl di sendMenuCard).
  const sourceUrl = (channelLinkOk && saluranLink) || (urlOk(website) && website) || "https://www.whatsapp.com/";
  return JSON.stringify({
    limited_time_offer: {
      text: `RARA AI - MULTI DEVICE \u2022 Versi ${botVersion}`,
      url: sourceUrl,
      copy_code: tanggal,
    },
  });
}
