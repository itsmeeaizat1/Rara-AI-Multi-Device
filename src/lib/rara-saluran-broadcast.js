// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { getDatabase } from "./rara-database.js";
import { raraBox, toSC } from "./rara-menu-style.js";

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
  serverCreated: "Server Baru Dibuat",
  serverGuardOff: "Server Melebihi Limit",
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
  // DESAIN SALURAN 5 Okt FINAL: header saluran TETAP 「 ✦ Title ✦ 」 — raraBox
  // udah ganti ke 『 *Title* 』 (8 Okt), jadi baris pertama di-restore ke format lama.
  const body = raraBox(title, lines);
  const parts = body.split("\n");
  parts[0] = `「 ✦ ${toSC(String(title))} ✦ 」`;
  return parts.join("\n") + "\n\n" + CARD_CREDIT;
}

async function broadcastToSaluran(sock, message, options = {}, bannerTitle, thumbName = "") {
  // seam e2e — balikin sukses tanpa resolve/kirim apa pun
  if (_sendForTest === null) return { sent: false, reason: "Disabled (test)" };
  if (typeof _sendForTest === "function") {
    await _sendForTest(message, options, bannerTitle, thumbName);
    return { sent: true, saluranId: "test@newsletter" };
  }
  // REVISI OWNER 7 Okt 2026: notif yang sama juga ngalir ke grup & channel
  // Telegram (target di-set via .bridge notif) — jalan walau saluran WA belum
  // dikonfigurasi / resolve gagal; fire-and-forget biar gak nunda kirim WA.
  try {
    const { broadcastToTelegramTargets } = await import("./rara-telegram-notify.js");
    broadcastToTelegramTargets(message).catch(() => {});
  } catch {}
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
      // thumbnail custom per-event dari assets/image/saluran/<thumbName>.*
      // (owner 6 Okt: "thumbnailnya custom juga, jangan generate canvas,
      // di assets/image/saluran/ masing-masing"); gak ada file → placeholder
      // folder itu → banner branding statis. Tanpa canvas.
      thumbName,
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

// REVISI OWNER 5 Okt 2026: kartu pengguna wajib ada "👤 Nama" SEBELUM nomor.
// Nama di-resolve best-effort dari db user (regName) → contacts store;
// kalau bener-bener gak ketemu, baris nama dilewati (kartu tetap rapi).
function resolveUserName(phoneNumber) {
  const num = String(phoneNumber || "").replace(/\D/g, "");
  if (!num) return "";
  const jid = num + "@s.whatsapp.net";
  let db = null;
  try { db = getDatabase(); } catch { return ""; }
  try {
    const u = db.data?.users?.[jid];
    const nm = u?.regName || u?.name;
    if (nm) return String(nm);
  } catch {}
  try {
    const c = db.setting?.("contacts")?.[jid];
    if (c?.name) return String(c.name);
  } catch {}
  return "";
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
    `💰 Harga: ${data.price || "-"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `⏸ Status: Menunggu persetujuan owner`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pendaftaran Sewa Baru", "sewaRegister");
}

// Sewa approved
async function notifySewaApproved(sock, data) {
  if (!isNotifyEnabled("sewaApproved")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Sewa Disetujui", [
    `👤 Nama: ${data.name || "-"}`,
    `💬 Grup: ${data.groupName}`,
    `📱 Nomor: ${data.phoneNumber}`,
    `⏳ Durasi: ${data.duration}`,
    `⌛ Berakhir: ${data.expiredStr}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `💠 Total grup sewa: ${data.totalGroups}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Sewa Disetujui", "sewaApproved");
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
  return broadcastToSaluran(sock, msg, {}, "Sewa Ditolak", "sewaRejected");
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
  return broadcastToSaluran(sock, msg, {}, "Sewa Berakhir", "sewaExpired");
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
    `⌛ Berakhir: ${data.expiredStr || "-"}`,
    `🏷 Tipe: ${data.isLifetime ? "Selamanya" : "Sewa"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `💠 Total grup sewa: ${data.totalGroups || 1}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Sewa Bot", "sewaBot");
}

// User baru jadibot
async function notifyJadibotConnect(sock, data) {
  if (!isNotifyEnabled("jadibotConnect")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Baru Jadibot", [
    `📱 Nomor: ${data.phoneNumber}`,
    `🕒 Waktu: ${formatTime()}`,
    `🟢 Status: Aktif`,
    "",
    `💠 Total jadibot aktif: ${data.totalActive}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Jadibot", "jadibotConnect");
}

// User dibanned
async function notifyUserBanned(sock, data) {
  if (!isNotifyEnabled("userBanned")) return { sent: false, reason: "Toggle off" };
  const nama = resolveUserName(data.phoneNumber);
  const lines = [];
  if (nama) lines.push(`👤 Nama: ${nama}`);
  lines.push(`📱 Nomor: ${data.phoneNumber}`, `❓ Alasan: ${data.reason || "Tidak disebutkan"}`, `🕒 Waktu: ${formatTime()}`, "", `🚫 Total diblokir: ${data.totalBanned}`);
  const msg = saluranCard("Pengguna Diblokir", lines);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Diblokir", "userBanned");
}

// User diblokir
async function notifyUserBlocked(sock, data) {
  if (!isNotifyEnabled("userBlocked")) return { sent: false, reason: "Toggle off" };
  const nama = resolveUserName(data.phoneNumber);
  const lines = [];
  if (nama) lines.push(`👤 Nama: ${nama}`);
  lines.push(`📱 Nomor: ${data.phoneNumber}`, `🕒 Waktu: ${formatTime()}`, "", `🚫 Total nomor diblokir: ${data.totalBlocked || "-"}`);
  const msg = saluranCard("Nomor Diblokir", lines);
  return broadcastToSaluran(sock, msg, {}, "Nomor Diblokir", "userBlocked");
}

// User dikick dari grup
async function notifyUserKicked(sock, data) {
  if (!isNotifyEnabled("userKicked")) return { sent: false, reason: "Toggle off" };
  const nama = resolveUserName(data.phoneNumber);
  const lines = [];
  if (nama) lines.push(`👤 Nama: ${nama}`);
  lines.push(`📱 Nomor: ${data.phoneNumber}`, `💬 Grup: ${data.groupName}`, `❓ Alasan: ${data.reason || "Melanggar aturan"}`, `🕒 Waktu: ${formatTime()}`);
  const msg = saluranCard("Pengguna Dikeluarkan", lines);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Dikeluarkan", "userKicked");
}

// User baru premium
async function notifyPremiumAdd(sock, data) {
  if (!isNotifyEnabled("premiumAdd")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Pengguna Baru Premium", [
    `👤 Nama: ${data.name || "-"}`,
    `📱 Nomor: ${data.phoneNumber}`,
    `⏳ Durasi: ${data.days || 30} hari`,
    `💰 Harga: ${data.price || "-"}`,
    `⌛ Berakhir: ${data.expiredStr || "-"}`,
    `🏷 Tipe: ${data.isExtend ? "Perpanjang" : "Premium Baru"}`,
    `🕒 Waktu: ${formatTime()}`,
    "",
    `💎 Total pengguna premium: ${data.totalPremium || "-"}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Premium", "premiumAdd");
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
    `🚻 Jenis Kelamin: ${data.gender || "Tidak disebutkan"}`,
    `📱 Nomor: ${data.phoneNumber || "-"}`,
    `📅 Tanggal: ${dateStr}`,
    `🕒 Waktu: ${timeStr} WIB`,
    `🔑 Serial: ${data.serial || "-"}`,
    "",
    `💠 Total pengguna: ${data.totalUsers || "-"}`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Pengguna Baru Terdaftar", "userRegister");
}

// Anti-spam detect
async function notifySpamDetected(sock, data) {
  if (!isNotifyEnabled("spamDetected")) return { sent: false, reason: "Toggle off" };
  const namaSpam = resolveUserName(data.phoneNumber);
  const lines = [];
  if (namaSpam) lines.push(`👤 Nama: ${namaSpam}`);
  lines.push(`📱 Nomor: ${data.phoneNumber}`, `💬 Grup: ${data.groupName || "Pribadi"}`, `🏷 Tipe: ${data.type || "Spam"}`, `📝 Detail: ${data.detail || "-"}`, `🕒 Waktu: ${formatTime()}`);
  if (data.action) lines.push("", `⚔ Aksi: ${data.action}`);
  const msg = saluranCard("Spam Terdeteksi", lines);
  return broadcastToSaluran(sock, msg, {}, "Spam Terdeteksi", "spamDetected");
}

// Warning diberikan
async function notifyWarningGiven(sock, data) {
  if (!isNotifyEnabled("warningGiven")) return { sent: false, reason: "Toggle off" };
  const nama = resolveUserName(data.phoneNumber);
  const lines = [];
  if (nama) lines.push(`👤 Nama: ${nama}`);
  lines.push(`📱 Nomor: ${data.phoneNumber}`, `💬 Grup: ${data.groupName || "Pribadi"}`, `❗ Pelanggaran: ${data.violation}`, `⚠ Peringatan: ${data.warnCount}/${data.maxWarn}`, `🕒 Waktu: ${formatTime()}`);
  const msg = saluranCard("Peringatan Pengguna", lines);
  return broadcastToSaluran(sock, msg, {}, "Peringatan Pengguna", "warningGiven");
}

// Daily limit reset notification
async function notifyDailyLimitReset(sock, data) {
  if (!isNotifyEnabled("dailyLimitReset")) return { sent: false, reason: "Toggle off" };
  const msg = saluranCard("Reset Limit Harian", [
    `♻️ Limit semua user telah direset!`,
    "",
    `🆓 Pengguna gratis: ${data.defaultLimit} limit`,
    `💎 Pengguna premium: ${data.premiumLimit} limit`,
    `👥 Total pengguna: ${data.resetCount}`,
    "",
    `⏰ Reset otomatis setiap hari jam 00:00 WIB`,
  ]);
  return broadcastToSaluran(sock, msg, {}, "Reset Limit Harian", "dailyLimitReset");
}

// Server panel baru dibuat (request owner 6 Okt 2026: info "user ini telah
// membuat server" dikirim ke saluran yang udah diset). Data dari createserver.js.
async function notifyServerCreated(sock, data) {
  if (!isNotifyEnabled("serverCreated")) return { sent: false, reason: "Toggle off" };
  const nama = resolveUserName(data.phoneNumber);
  const lines = [];
  if (nama) lines.push(`👤 Nama: ${nama}`);
  lines.push(`📱 Nomor: ${data.phoneNumber || "-"}`);
  if (data.tipe) lines.push(`🛡 Tipe Akun: ${data.tipe}`);
  lines.push(
    `🏷 Username: ${data.username || "-"}`,
    `🖥 Server: ${data.server || "-"}`,
    `💾 RAM: ${data.ram || "-"}`,
    `⚙️ CPU: ${data.cpu || "-"}`,
    `📁 Storage: ${data.disk || "-"}`,
    `🆔 Server ID: ${data.serverId || "-"}`,
    `🕒 Waktu: ${formatTime()}`,
  );
  const total = data.totalServers;
  if (total !== undefined && total !== null && total !== "") {
    lines.push("", `🧩 Total server terbuat: ${total}`);
  }
  const msg = saluranCard("Server Baru Dibuat", lines);
  return broadcastToSaluran(sock, msg, {}, "Server Baru Dibuat", "serverCreated");
}

// RESOURCE GUARD (owner 7 Okt 2026): server nekat batas cpu/ram/disk → dimatikan
// otomatis sama rara-cpanel-guard.js. Notif cuma terkirim kalau toggle saluran
// event ini aktif (.autobroadcastchannel serverGuardOff on — default OFF).
async function notifyServerGuardOff(sock, data) {
  if (!isNotifyEnabled("serverGuardOff")) return { sent: false, reason: "Toggle off" };
  const nama = resolveUserName(data.phoneNumber);
  const lines = [];
  if (nama) lines.push(`👤 Nama: ${nama}`);
  lines.push(`📱 Nomor: ${data.phoneNumber || "-"}`);
  if (data.username) lines.push(`🏷 Username: ${data.username}`);
  lines.push(
    `🖥 Server: ${data.server || "-"}`,
    `⚠️ Pelanggaran: ${data.kind || "Resource"}`,
    `📊 Pemakaian: ${data.meter || "-"}`,
    `🛑 Aksi: Dimatikan otomatis (${data.action || "Kill"})`,
    `🆔 Server ID: ${data.serverId || "-"}`,
    `🕒 Waktu: ${formatTime()}`,
  );
  const msg = saluranCard("Server Melebihi Limit", lines);
  return broadcastToSaluran(sock, msg, {}, "Server Melebihi Limit", "serverGuardOff");
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
  notifyServerCreated,
  notifyServerGuardOff,
};
