// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "./nova-database.js";

/**
 * Broadcast ke Saluran WA - Sistem terpusat
 * Kirim notifikasi ke saluran resmi untuk berbagai event.
 * Toggle on/off per event via .autobroadcastchannel
 */

// Event types yang bisa di-toggle
const NOTIFY_EVENTS = {
  sewaRegister: "Pendaftaran Sewa",
  sewaApproved: "Sewa Approved",
  sewaRejected: "Sewa Ditolak",
  sewaExpired: "Sewa Expired",
  sewaBot: "User Baru Sewa Bot",
  jadibotConnect: "User Baru Jadibot",
  userBanned: "User Dibanned",
  userBlocked: "User Diblokir",
  userKicked: "User Dikick Grup",
  premiumAdd: "User Baru Premium",
  dailyLimitReset: "Reset Limit Harian",
  userRegister: "User Baru Daftar",
  spamDetected: "Spam Terdeteksi",
  warningGiven: "Peringatan User",
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

async function broadcastToSaluran(sock, message, options = {}) {
  const saluranId = config.saluran?.id || "";
  if (!saluranId || !saluranId.includes("@newsletter") || saluranId === "@newsletter") {
    return { sent: false, reason: "Saluran ID belum dikonfigurasi" };
  }
  try {
    // REQUEST OWNER 14 Sep 2026: pesan ke saluran AUTO-CONVERT tanpa tombol —
    // semua payload lewat nova-saluran-safe (tombol/interaktif/quoted dibuang,
    // gagal → retry versi polos) biar follower gak pernah lihat
    // "Pesan WhatsApp tidak didukung".
    const { sendSaluranSafe } = await import("./nova-saluran-safe.js");
    const msgPayload = { text: message, ...options };
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
  let msg = `*PENDAFTARAN SEWA BARU*\n\n`;
  msg += `Nama: ${data.name || "-"}\n`;
  msg += `Umur: ${data.age || "-"} tahun\n`;
  msg += `Asal: ${data.origin || "-"}\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Grup: ${data.groupName}\n`;
  msg += `Durasi: ${data.duration}\n`;
  msg += `Harga: ${data.price || "N/A"}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Status: Menunggu approve owner`;
  return broadcastToSaluran(sock, msg);
}

// Sewa approved
async function notifySewaApproved(sock, data) {
  if (!isNotifyEnabled("sewaApproved")) return { sent: false, reason: "Toggle off" };
  let msg = `*SEWA DIAPPROVE*\n\n`;
  msg += `Nama: ${data.name || "-"}\n`;
  msg += `Grup: ${data.groupName}\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Durasi: ${data.duration}\n`;
  msg += `Expired: ${data.expiredStr}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Total grup sewa: ${data.totalGroups}`;
  return broadcastToSaluran(sock, msg);
}

// Sewa rejected
async function notifySewaRejected(sock, data) {
  if (!isNotifyEnabled("sewaRejected")) return { sent: false, reason: "Toggle off" };
  let msg = `*SEWA DITOLAK*\n\n`;
  msg += `Nama: ${data.name || "-"}\n`;
  msg += `Grup: ${data.groupName}\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Alasan: ${data.reason}\n`;
  msg += `Waktu: ${formatTime()}`;
  return broadcastToSaluran(sock, msg);
}

// Sewa expired
async function notifySewaExpired(sock, data) {
  if (!isNotifyEnabled("sewaExpired")) return { sent: false, reason: "Toggle off" };
  let msg = `*SEWA EXPIRED*\n\n`;
  msg += `Grup: ${data.groupName}\n`;
  msg += `Nomor: ${data.phone || "-"}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Bot telah keluar dari grup.`;
  return broadcastToSaluran(sock, msg);
}

// User baru sewa bot - rincian durasi + harga
async function notifySewaBot(sock, data) {
  if (!isNotifyEnabled("sewaBot")) return { sent: false, reason: "Toggle off" };
  let msg = `*USER BARU SEWA BOT*\n\n`;
  msg += `Nama: ${data.name || "-"}\n`;
  msg += `Nomor: ${data.phoneNumber || "-"}\n`;
  msg += `Grup: ${data.groupName || "-"}\n`;
  msg += `Durasi: ${data.duration || "-"}\n`;
  msg += `Harga: ${data.price || "-"}\n`;
  msg += `Expired: ${data.expiredStr || "-"}\n`;
  msg += `Tipe: ${data.isLifetime ? "Lifetime" : "Sewa"}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Total grup sewa: ${data.totalGroups || 1}`;
  return broadcastToSaluran(sock, msg);
}

// User baru jadibot
async function notifyJadibotConnect(sock, data) {
  if (!isNotifyEnabled("jadibotConnect")) return { sent: false, reason: "Toggle off" };
  let msg = `*USER BARU JADIBOT*\n\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Waktu: ${formatTime()}\n`;
  msg += `Status: Online\n\n`;
  msg += `Total jadibot aktif: ${data.totalActive}`;
  return broadcastToSaluran(sock, msg);
}

// User dibanned
async function notifyUserBanned(sock, data) {
  if (!isNotifyEnabled("userBanned")) return { sent: false, reason: "Toggle off" };
  let msg = `*USER DIBANNED*\n\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Alasan: ${data.reason || "Tidak disebutkan"}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Total banned: ${data.totalBanned}`;
  return broadcastToSaluran(sock, msg);
}

// User diblokir
async function notifyUserBlocked(sock, data) {
  if (!isNotifyEnabled("userBlocked")) return { sent: false, reason: "Toggle off" };
  let msg = `*USER DIBLOKIR*\n\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Total blocked: ${data.totalBlocked || "-"}`;
  return broadcastToSaluran(sock, msg);
}

// User dikick dari grup
async function notifyUserKicked(sock, data) {
  if (!isNotifyEnabled("userKicked")) return { sent: false, reason: "Toggle off" };
  let msg = `*USER DIKICK*\n\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Grup: ${data.groupName}\n`;
  msg += `Alasan: ${data.reason || "Melanggar aturan"}\n`;
  msg += `Waktu: ${formatTime()}`;
  return broadcastToSaluran(sock, msg);
}

// User baru premium
async function notifyPremiumAdd(sock, data) {
  if (!isNotifyEnabled("premiumAdd")) return { sent: false, reason: "Toggle off" };
  let msg = `*USER BARU PREMIUM*\n\n`;
  msg += `Nama: ${data.name || "-"}\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Durasi: ${data.days || 30} hari\n`;
  msg += `Harga: ${data.price || "N/A"}\n`;
  msg += `Expired: ${data.expiredStr || "-"}\n`;
  msg += `Tipe: ${data.isExtend ? "Perpanjang" : "Premium Baru"}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  msg += `Total premium: ${data.totalPremium || "-"}`;
  return broadcastToSaluran(sock, msg);
}


// User baru daftar
async function notifyUserRegister(sock, data) {
  if (!isNotifyEnabled("userRegister")) return { sent: false, reason: "Toggle off" };
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
  const timeStr = now.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
  let msg = `*USER BARU DAFTAR*\n\n`;
  msg += `Nama: ${data.name || "-"}\n`;
  msg += `Umur: ${data.age || "-"} tahun\n`;
  msg += `Gender: ${data.gender || "Tidak disebutkan"}\n`;
  msg += `Nomor: ${data.phoneNumber || "-"}\n`;
  msg += `Tanggal: ${dateStr}\n`;
  msg += `Waktu: ${timeStr} WIB\n`;
  msg += `Serial: ${data.serial || "-"}\n\n`;
  msg += `Total user: ${data.totalUsers || "-"}`;
  return broadcastToSaluran(sock, msg);
}

// Anti-spam detect
async function notifySpamDetected(sock, data) {
  if (!isNotifyEnabled("spamDetected")) return { sent: false, reason: "Toggle off" };
  let msg = `*SPAM TERDETEKSI*\n\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Grup: ${data.groupName || "Private"}\n`;
  msg += `Tipe: ${data.type || "Spam"}\n`;
  msg += `Detail: ${data.detail || "-"}\n`;
  msg += `Waktu: ${formatTime()}\n\n`;
  if (data.action) msg += `Aksi: ${data.action}`;
  return broadcastToSaluran(sock, msg);
}

// Warning diberikan
async function notifyWarningGiven(sock, data) {
  if (!isNotifyEnabled("warningGiven")) return { sent: false, reason: "Toggle off" };
  let msg = `*PERINGATAN USER*\n\n`;
  msg += `Nomor: ${data.phoneNumber}\n`;
  msg += `Grup: ${data.groupName || "Private"}\n`;
  msg += `Pelanggaran: ${data.violation}\n`;
  msg += `Warning: ${data.warnCount}/${data.maxWarn}\n`;
  msg += `Waktu: ${formatTime()}`;
  return broadcastToSaluran(sock, msg);
}

// Daily limit reset notification
async function notifyDailyLimitReset(sock, data) {
  if (!isNotifyEnabled("dailyLimitReset")) return { sent: false, reason: "Toggle off" };
  let msg = `\u267B\uFE0F *RESET LIMIT HARIAN*\n\n`;
  msg += `Limit semua user telah direset!\n`;
  msg += `\u2022 User gratis: ${data.defaultLimit} limit\n`;
  msg += `\u2022 User premium: ${data.premiumLimit} limit\n`;
  msg += `\u2022 Total user: ${data.resetCount} user\n\n`;
  msg += `Reset otomatis setiap hari jam 00:00 WIB`;
  return broadcastToSaluran(sock, msg);
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
