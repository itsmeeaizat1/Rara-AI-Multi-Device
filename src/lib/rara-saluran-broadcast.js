// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "./rara-database.js";
import { raraBox } from "./rara-menu-style.js";

/**
 * Broadcast ke Saluran WA - Sistem terpusat
 * Kirim notifikasi ke saluran resmi untuk berbagai event.
 * Toggle on/off per event via .autobroadcastchannel
 *
 * REDESIGN 5 Okt 2026 (owner: "menu yg auto broadcast ke channel tampilan
 * bagus modern sprti desain skrg") — semua notif saluran sekarang pakai
 * kartu desain modern 3 Okt ala menu: header 「 ✦ JUDUL ✦ 」, field
 * berlabel + icon per data, footer credit watermark Rara AI. Semua FIELD
 * data lama dipertahankan utuh (nama/nomor/grup/durasi/dst) — cuma layout
 * yang berubah. Banner preview card (externalAdReply) tetap nempel via
 * broadcastToSaluran (sanitizer saluran nge-keep contextInfo).
 */

// Event types yang bisa di-toggle
const NOTIFY_EVENTS = {
  sewaRegister: "Pendaftaran Sewa",
  sewaApproved: "Sewa Disetujui",
  sewaRejected: "Sewa Ditolak",
  sewaExpired: "Sewa Berakhir",
  sewaBot: "Pengguna Baru Sewa Bot",
  jadibotConnect: "Pengguna Baru Jadibot",
  userBanned: "Pengguna Diblokir",
  userBlocked: "Nomor Diblokir",
  userKicked: "Pengguna Dikeluarkan",
  premiumAdd: "Pengguna Baru Premium",
  dailyLimitReset: "Reset Limit Harian",
  userRegister: "Pengguna Baru Terdaftar",
  spamDetected: "Spam Terdeteksi",
  warningGiven: "Peringatan Pengguna",
};

// Cek apakah event ini enabled (default: OFF)
function isNotifyEnabled(eventType) {
  try {
    const db = getDatabase();
    const key = "saluranNotify_" + eventType;
    const val = db.setting(key);
    // Default: OFF — owner harus manual toggle on via .autobroadcastchannel
    return val === true;
  } catch {
    return false;
  }
}

// Set toggle
function setNotifyEnabled(eventType, enabled) {
  const db = getDatabase();
  const key = "saluranNotify_" + eventType;
  db.setting(key, enabled);
  db.save();
  return enabled;
}

// Get all toggle statuses
function getAllNotifyStatus() {
  const db = getDatabase();
  const result = {};
  for (const [key, label] of Object.entries(NOTIFY_EVENTS)) {
    const val = db.setting("saluranNotify_" + key);
    result[key] = { label, enabled: val === true };
  }
  return result;
}

// seam e2e: function = mock (nangkap pesan tanpa nyentuh saluran),
// null = DISABLED (gak kirim apa-apa), undefined = asli
let _sendForTest = undefined;
export function _setBroadcastSendForTest(fn) { _sendForTest = fn; }
export function _resetBroadcastSendForTest() { _sendForTest = undefined; }

// ── kartu notif desain modern 3 Okt (ala menu) ──
const CARD_CREDIT = "Powered by Rara AI - Multi Device";
function saluranCard(title, lines) {
  return raraBox(title, lines) + "\n\n" + CARD_CREDIT;
}

async function broadcastToSaluran(sock, message, options = {}, bannerTitle) {
  // seam e2e — balikin sukses tanpa resolve/kirim apa pun
  if (_sendForTest === null) return { sent: false, reason: "Disabled (test)" };
  if (typeof _sendForTest === "function") {
    await _sendForTest(message, options, bannerTitle);
    return { sent: true, saluranId: "test@newsletter" };
  }
  // FIX 19 Sep 2026 (owner: "notif ke saluran rara official sama sekali gak terkirim"):
  // dulu gerbang `saluranId === "@newsletter" → return "belum dikonfigurasi"` — padahal
  // config default adalah placeholder persis itu → SEMUA notif (sewa/premium/ban/block/
  // daftar/jadibot/scheduler) gagal senyap dari dulu. Sekarang ID di-RESOLVE otomatis
  // dari link invite config.saluran.link (satu pintu rara-saluran.js).
  const { resolveNewsletterJid } = await import("./rara-saluran.js");
  let saluranId = "";
  try {
    saluranId = await resolveNewsletterJid(sock);
  } catch (e) {
    return { sent: false, reason: "Gagal resolve ID saluran: " + (e?.message || e) };
  }
  if (!/^\d+@newsletter$/.test(saluranId)) {
    return { sent: false, reason: "Saluran ID belum dikonfigurasi" };
  }
  try {
    // REQUEST OWNER 14 Sep 2026: pesan ke saluran AUTO-CONVERT tanpa tombol —
    // semua payload lewat rara-saluran-safe (tombol/interaktif/quoted dibuang,
    // gagal → retry versi polos) biar follower gak pernah lihat
    // "Pesan WhatsApp tidak didukung".
    // DESAIN 19 Sep 2026: notif ke saluran sekarang pakai banner preview card
    // branding Rara (externalAdReply di-keep sanitizer) — REDesign 5 Okt 2026:
    // judul banner per-event (bannerTitle) biar preview makin informatif.
    const { sendSaluranSafe } = await import("./rara-saluran-safe.js");
    const { notifBanner } = await import("./rara-notif-card.js");
    const banner = await notifBanner({
      title: bannerTitle || "Rara AI Official",
    });
    const msgPayload = { text: message, contextInfo: banner, ...options };
    await sendSaluranSafe(sock, saluranId, msgPayload);
    return { sent: true, saluranId };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

function formatTime() {
  return new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

// User daftar sewa - dengan data diri
async function notifySewaRegister(sock, data) {
  if (!isNotifyEnabled("sewaRegister")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pendaftaran Sewa Baru", [
    `👤 Nama: ${data.name || "-"}`,
    `🎂 Umur: ${data.age || "-"} tahun`,
    `📍 Asal: ${data.origin || "-"}`,
    `📱 Nomor: ${data.phoneNumber}`,
    `💬 Grup: ${data.groupName}`,
    `⏳ Durasi: ${data.duration}`,
    `💰 Harga: ${data.price || "N/A"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `⏸ Status: Menunggu approve owner`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pendaftaran Sewa Baru");
}

// Sewa approved
async function notifySewaApproved(sock, data) {
  if (!isNotifyEnabled("sewaApproved")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Sewa Disetujui", [
    `👤 Nama: ${data.name || "-"}`,
    `💬 Grup: ${data.groupName}`,
    `📱 Nomor: ${data.phoneNumber}`,
    `⏳ Durasi: ${data.duration}`,
    `⌛ Expired: ${data.expiredStr}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `💠 Total grup sewa: ${data.totalGroups}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Sewa Disetujui");
}

// Sewa rejected
async function notifySewaRejected(sock, data) {
  if (!isNotifyEnabled("sewaRejected")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Sewa Ditolak", [
    `👤 Nama: ${data.name || "-"}`,
    `💬 Grup: ${data.groupName}`,
    `📱 Nomor: ${data.phoneNumber}`,
    `❓ Alasan: ${data.reason}`,
    `🕒 Waktu: ${formatTime()}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Sewa Ditolak");
}

// Sewa expired
async function notifySewaExpired(sock, data) {
  if (!isNotifyEnabled("sewaExpired")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Sewa Berakhir", [
    `💬 Grup: ${data.groupName}`,
    `📱 Nomor: ${data.phone || "-"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `🚪 Bot telah keluar dari grup.`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Sewa Berakhir");
}

// User baru sewa bot - rincian durasi + harga
async function notifySewaBot(sock, data) {
  if (!isNotifyEnabled("sewaBot")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Baru Sewa Bot", [
    `👤 Nama: ${data.name || "-"}`,
    `📱 Nomor: ${data.phoneNumber || "-"}`,
    `💬 Grup: ${data.groupName || "-"}`,
    `⏳ Durasi: ${data.duration || "-"}`,
    `💰 Harga: ${data.price || "-"}`,
    `⌛ Expired: ${data.expiredStr || "-"}`,
    `🏷 Tipe: ${data.isLifetime ? "Lifetime" : "Sewa"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `💠 Total grup sewa: ${data.totalGroups || 1}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Sewa Bot");
}

// User baru jadibot
async function notifyJadibotConnect(sock, data) {
  if (!isNotifyEnabled("jadibotConnect")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Baru Jadibot", [
    `📱 Nomor: ${data.phoneNumber}`,
    `🕒 Waktu: ${formatTime()}`,
    `🟢 Status: Online`,
    "",
    `💠 Total jadibot aktif: ${data.totalActive}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Jadibot");
}

// User dibanned
async function notifyUserBanned(sock, data) {
  if (!isNotifyEnabled("userBanned")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Diblokir", [
    `📱 Nomor: ${data.phoneNumber}`,
    `❓ Alasan: ${data.reason || "Tidak disebutkan"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `🚫 Total banned: ${data.totalBanned}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Diblokir");
}

// User diblokir
async function notifyUserBlocked(sock, data) {
  if (!isNotifyEnabled("userBlocked")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Nomor Diblokir", [
    `📱 Nomor: ${data.phoneNumber}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `🚫 Total blocked: ${data.totalBlocked || "-"}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Nomor Diblokir");
}

// User dikick dari grup
async function notifyUserKicked(sock, data) {
  if (!isNotifyEnabled("userKicked")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Dikeluarkan", [
    `📱 Nomor: ${data.phoneNumber}`,
    `💬 Grup: ${data.groupName}`,
    `❓ Alasan: ${data.reason || "Melanggar aturan"}`,
    `🕒 Waktu: ${formatTime()}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Dikeluarkan");
}

// User baru premium
async function notifyPremiumAdd(sock, data) {
  if (!isNotifyEnabled("premiumAdd")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Baru Premium", [
    `👤 Nama: ${data.name || "-"}`,
    `📱 Nomor: ${data.phoneNumber}`,
    `⏳ Durasi: ${data.days || 30} hari`,
    `💰 Harga: ${data.price || "N/A"}`,
    `⌛ Expired: ${data.expiredStr || "-"}`,
    `🏷 Tipe: ${data.isExtend ? "Perpanjang" : "Premium Baru"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `💎 Total premium: ${data.totalPremium || "-"}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Premium");
}

// User baru daftar
async function notifyUserRegister(sock, data) {
  if (!isNotifyEnabled("userRegister")) return { sent: false, reason: "Toggle off" };
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
  const timeStr = now.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
  const msg = saluranCard("Pengguna Baru Terdaftar", [
    `👤 Nama: ${data.name || "-"}`,
    `🎂 Umur: ${data.age || "-"} tahun`,
    `🚻 Gender: ${data.gender || "Tidak disebutkan"}`,
    `📱 Nomor: ${data.phoneNumber || "-"}`,
    `📅 Tanggal: ${dateStr}`,
    `🕒 Waktu: ${timeStr} WIB`,
    `🔑 Serial: ${data.serial || "-"}`,
    "",
    `💠 Total user: ${data.totalUsers || "-"}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Terdaftar");
}

// Anti-spam detect
async function notifySpamDetected(sock, data) {
  if (!isNotifyEnabled("spamDetected")) return { sent: false, reason: "Toggle off" };
  const lines = [
    `📱 Nomor: ${data.phoneNumber}`,
    `💬 Grup: ${data.groupName || "Private"}`,
    `🏷 Tipe: ${data.type || "Spam"}`,
    `📝 Detail: ${data.detail || "-"}`,
    `🕒 Waktu: ${formatTime()}`,
  ];
  if (data.action) lines.push("", `⚔ Aksi: ${data.action}`);
  const msg = saluranCard("Spam Terdeteksi", lines);
  return broadcastToSaluran(sock, msg, {}, "Spam Terdeteksi");
}

// Warning diberikan
async function notifyWarningGiven(sock, data) {
  if (!isNotifyEnabled("warningGiven")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Peringatan Pengguna", [
    `📱 Nomor: ${data.phoneNumber}`,
    `💬 Grup: ${data.groupName || "Private"}`,
    `❗ Pelanggaran: ${data.violation}`,
    `⚠ Warning: ${data.warnCount}/${data.maxWarn}`,
    `🕒 Waktu: ${formatTime()}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Peringatan Pengguna");
}

// Daily limit reset notification
async function notifyDailyLimitReset(sock, data) {
  if (!isNotifyEnabled("dailyLimitReset")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Reset Limit Harian", [
    `♻️ Limit semua user telah direset!`,
    "",
    `🆓 User gratis: ${data.defaultLimit} limit`,
    `💎 User premium: ${data.premiumLimit} limit`,
    `👥 Total user: ${data.resetCount} user`,
    "",
    `⏰ Reset otomatis setiap hari jam 00:00 WIB`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Reset Limit Harian");
}

export {
  NOTIFY_EVENTS,
  broadcastToSaluran,
  isNotifyEnabled,
  setNotifyEnabled,
  getAllNotifyStatus,
  notifySewaRegister,
  notifySewaApproved,
  notifySewaRejected,
  notifySewaExpired,
  notifySewaBot,
  notifyJadibotConnect,
  notifyUserBanned,
  notifyUserBlocked,
  notifySpamDetected,
  notifyWarningGiven,
  notifyUserKicked,
  notifyPremiumAdd,
  notifyDailyLimitReset,
  notifyUserRegister,
};
