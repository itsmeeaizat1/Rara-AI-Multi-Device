// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import config from '../../config.js'
import * as timeHelper from './nova-time.js'
/**
 * @typedef {Object} DashboardData
 * @property {string} userName - Nama user
 * @property {string} userStatus - Status user (Owner/Premium/Free)
 * @property {string} mode - Mode bot (Public/Self)
 * @property {number} totalUsers - Total pengguna bot
 * @property {number} userLimit - Limit user
 */

/**
 * @typedef {Object} BotInfoData
 * @property {string} botName - Nama bot
 * @property {string} developer - Nama developer
 * @property {string} version - Versi bot
 * @property {string} uptime - Uptime bot
 * @property {number} totalFeatures - Total fitur
 * @property {string} mode - Mode bot
 * @property {string} platform - Platform bot
 */

/**
 * @typedef {Object} UserProfileData
 * @property {string} name - Nama user
 * @property {string} number - Nomor user
 * @property {string} status - Status (Owner/Premium/Free)
 * @property {number} limit - Limit tersisa
 * @property {string} registeredAt - Tanggal registrasi
 */

/**
 * @typedef {Object} MenuCategory
 * @property {string} name - Nama kategori
 * @property {string} emoji - Emoji kategori
 * @property {string} description - Deskripsi kategori
 * @property {string[]} commands - Array command dalam kategori
 */

/**
 * Karakter untuk styling menu
 * @constant
 */
const CHARS = {
 cornerTopLeft: "╭",
 cornerTopRight: "─",
 cornerBottomLeft: "╰",
 cornerBottomRight: "",
 horizontal: "─",
 vertical: "│",
 arrow: "•",
 bullet: "•",
 star: "",
 diamond: "◇",
 dot: "•",
 check: "",
 cross: "✗",
 line: "─",
};

/**
 * Emoji untuk berbagai kebutuhan
 * @constant
 */
const EMOJIS = {
 dashboard: "📊",
 info: "ℹ️",
 user: "👤",
 bot: "🤖",
 owner: "👑",
 premium: "💎",
 free: "🆓",
 public: "🌐",
 self: "🔒",
 commands: "🖥️",
 utilities: "🔧",
 fun: "🎮",
 group: "👥",
 time: "⏰",
 uptime: "⏱️",
 version: "📌",
 speed: "⚡",
 limit: "📊",
 status: "📋",
 mode: "🔄",
 name: "📝",
 number: "📱",
 developer: "👨‍💻",
 total: "📈",
 tip: "💡",
 warning: "⚠️",
 success: "✅",
 error: "❌",
 loading: "🕕",
};

/**
 * Format uptime menjadi string yang mudah dibaca
 * @param {number} ms - Uptime dalam milliseconds
 * @returns {string} Formatted uptime string
 * @example
 * formatUptime(3661000); // "1h 1m 1s"
 * formatUptime(86400000); // "1d 0h 0m"
 */
function formatUptime(ms) {
 const seconds = Math.floor((ms / 1000) % 60);
 const minutes = Math.floor((ms / (1000 * 60)) % 60);
 const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
 const days = Math.floor(ms / (1000 * 60 * 60 * 24));

 const parts = [];
 if (days > 0) parts.push(`${days}d`);
 if (hours > 0) parts.push(`${hours}h`);
 if (minutes > 0) parts.push(`${minutes}m`);
 if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

 return parts.join(" ");
}

/**
 * Format tanggal ke format lokal Indonesia
 * @param {Date|number|string} date - Tanggal untuk diformat
 * @returns {string} Formatted date string
 * @example
 * formatDate(new Date()); // "17/12/2024, 12:30:45"
 */
function formatDate(date) {
 return timeHelper.fromTimestamp(date, "DD/MM/YYYY HH:mm:ss");
}

/**
 * Format nomor telepon ke format yang lebih readable
 * @param {string} number - Nomor telepon
 * @returns {string} Formatted number
 * @example
 * formatNumber('6281234567890'); // '62 812-3456-7890'
 */
function formatNumber(number) {
 if (!number) return "";
 const cleaned = number.replace(/[^0-9]/g, "");
 if (cleaned.length < 10) return cleaned;

 if (cleaned.startsWith("62")) {
 const withoutCode = cleaned.slice(2);
 const formatted = withoutCode.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
 return `62 ${formatted}`;
 }

 return cleaned;
}

/**
 * Format ukuran file ke format yang readable
 * @param {number} bytes - Ukuran dalam bytes
 * @returns {string} Formatted size string
 * @example
 * formatFileSize(1024); // "1.00 KB"
 * formatFileSize(1048576); // "1.00 MB"
 */
function formatFileSize(bytes) {
 if (bytes === 0) return "0 Bytes";

 const k = 1024;
 const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));

 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Buat garis horizontal
 * @param {number} length - Panjang garis
 * @param {string} [char='─'] - Karakter untuk garis
 * @returns {string} String garis
 */
function createLine(length = 20, char = CHARS.horizontal) {
 return char.repeat(length);
}

/**
 * Buat header box
 * @param {string} title - Judul header
 * @param {number} [width=20] - Lebar box
 * @returns {string} Header string
 * @example
 * createHeader('DASHBOARD');
 * // "╭─「 ✦ DASHBOARD ✦ 」─────"
 */
function createHeader(title, width = 20) {
 return `╭─「 ✦ ${title} ✦ 」`;
}

/**
 * Buat footer box
 * @param {number} [width=20] - Lebar box
 * @returns {string} Footer string
 * @example
 * createFooter(); // "╰────  •  ────"
 */
function createFooter(width = 20) {
 return `╰────  •  ────`;
}

/**
 * Buat baris body dengan bullet
 * @param {string} text - Text untuk baris
 * @param {string} [prefix='│'] - Prefix baris
 * @param {string} [bullet='◦'] - Karakter bullet
 * @returns {string} Formatted body line
 */
function createBodyLine(text, prefix = CHARS.vertical, bullet = CHARS.bullet) {
 return ` ${prefix} ${bullet} ${text}`;
}

/**
 * Buat baris dengan arrow
 * @param {string} label - Label
 * @param {string} value - Nilai
 * @returns {string} Formatted line dengan arrow
 * @example
 * createArrowLine('Nama', 'Nova-AI'); // "│ ➣ Nama: Nova-AI"
 */
function createArrowLine(label, value) {
 return ` ${CHARS.vertical} ${CHARS.arrow} *${label}:* ${value}`;
}

/**
 * Buat dashboard info
 * @param {DashboardData} data - Data untuk dashboard
 * @returns {string} Formatted dashboard string
 */
function createDashboard(data) {
 const {
 userName = "User",
 userStatus = "Free User",
 mode = "Public",
 totalUsers = 0,
 userLimit = 25,
 } = data;

 const lines = [
 createHeader("Dashboard"),
 `${CHARS.vertical}`,
 createArrowLine("Nama", userName),
 createArrowLine("Status User", userStatus),
 createArrowLine("Mode", mode),
 createArrowLine("Pengguna", totalUsers.toString()),
 createArrowLine("Limit", userLimit.toString()),
 `${CHARS.vertical}`,
 createFooter(),
 ];

 return lines.join("\n");
}

/**
 * Buat info bot
 * @param {BotInfoData} data - Data info bot
 * @returns {string} Formatted bot info string
 */
function createBotInfo(data) {
 const {
 botName = config.bot?.name || "Nova-AI",
 developer = config.owner?.name || "Owner",
 version = config.bot?.version || "1.0.0",
 uptime = "0s",
 totalFeatures = 0,
 mode = config.mode || "public",
 platform = "Node.js",
 } = data;

 const lines = [
 `${CHARS.horizontal} *Informasi Bot* ${CHARS.horizontal}`,
 ``,
 `${CHARS.dot} Nama-Bot : ${botName} 🌿`,
 `${CHARS.dot} Developer : ${developer}`,
 `${CHARS.dot} Mode : ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
 `${CHARS.dot} Version : ${version}`,
 `${CHARS.dot} Uptime : ${uptime}`,
 `${CHARS.dot} Total-Fitur : ${totalFeatures}`,
 `${CHARS.dot} Platform : ${platform}`,
 ``,
 ];

 return lines.join("\n");
}

/**
 * Buat user profile
 * @param {UserProfileData} data - Data user profile
 * @returns {string} Formatted user profile string
 */
function createUserProfile(data) {
 const {
 name = "User",
 number = "",
 status = "Free",
 limit = 25,
 registeredAt = "",
 } = data;

 const statusEmoji =
 status === "Owner"
 ? EMOJIS.owner
 : status === "Premium"
 ? EMOJIS.premium
 : EMOJIS.free;

 const lines = [
 `【 USER PROFILE 】`,
 `${EMOJIS.name} Nama : ${name}`,
 `${EMOJIS.number} Nomor : ${formatNumber(number)}`,
 `${statusEmoji} Status : ${status}`,
 `${EMOJIS.limit} Limit : ${limit}`,
 ``,
 ];

 if (registeredAt) {
 lines.splice(5, 0, `${EMOJIS.time} Daftar : ${registeredAt}`);
 }

 return lines.join("\n");
}

/**
 * Buat status bot
 * @param {Object} data - Data status bot
 * @returns {string} Formatted bot status string
 */
function createBotStatus(data) {
 const {
 botName = config.bot?.name || "Nova-AI",
 uptime = "0s",
 mode = "Public",
 totalCommands = 0,
 totalUsers = 0,
 speed = "0.00s",
 } = data;

 const lines = [
 `【 BOT STATUS 】`,
 `${EMOJIS.bot} Bot : ${botName}`,
 `${EMOJIS.uptime} Uptime : ${uptime}`,
 `${EMOJIS.mode} Mode : ${mode}`,
 `${EMOJIS.commands} Commands : ${totalCommands} fitur`,
 `${EMOJIS.user} Pengguna : ${totalUsers} users`,
 `${EMOJIS.speed} Speed : ${speed}`,
 ``,
 ];

 return lines.join("\n");
}

/**
 * Buat kategori menu
 * @param {MenuCategory} category - Data kategori
 * @param {string} prefix - Prefix command
 * @returns {string} Formatted category menu
 */
function createCategoryMenu(category, prefix = config.command?.prefix || ".") {
 const { name, emoji, description = "", commands = [] } = category;

 if (commands.length === 0) {
 return "";
 }

 const header = `${emoji} *${name}*`;
 const commandList = commands
 .map((cmd) => `${CHARS.vertical} ${prefix}${cmd}`)
 .join("\n");
 const footer = `${CHARS.cornerBottomLeft}${createLine(15)}`;

 return `${header}\n${commandList}\n${footer}`;
}

/**
 * Buat kategori menu dengan sub-description
 * @param {Object} data - Data kategori menu
 * @returns {string} Formatted category section
 */
function createCategorySection(data) {
 const { emoji, title, command, description, prefix = "." } = data;

 const lines = [
 `${emoji} *${title}*`,
 ` Ketik: ${prefix}${command}`,
 ` ${CHARS.vertical} ( ${description} )`,
 ``,
 ];

 return lines.join("\n");
}

/**
 * Buat main menu lengkap
 * @param {Object} data - Data untuk main menu
 * @returns {string} Formatted main menu string
 */
function createMainMenu(data) {
 const {
 greeting = "",
 userName = "User",
 userStatus = "Free User",
 categories = [],
 botInfo = {},
 prefix = config.command?.prefix || ".",
 } = data;

 const parts = [];

 if (greeting) {
 parts.push(greeting);
 parts.push("");
 }

 parts.push(createDashboard({ userName, userStatus, ...data }));
 parts.push("");

 parts.push(createBotInfo(botInfo));
 parts.push("");

 for (const category of categories) {
 parts.push(
 createCategorySection({
 ...category,
 prefix,
 }),
 );
 }

 parts.push(`${EMOJIS.tip} *Tips:* Jika kamu tidak tahu cara menggunakan Bot`);
 parts.push(`Kamu bisa tanya ke owner`);
 parts.push(`${CHARS.vertical} Mode: ${data.mode || "Public"}`);

 return parts.join("\n");
}

/**
 * Buat command list untuk kategori tertentu
 * @param {string} categoryName - Nama kategori
 * @param {string[]} commands - Array command
 * @param {string} prefix - Prefix command
 * @returns {string} Formatted command list
 */
function createCommandList(categoryName, commands, prefix = ".") {
 const emoji = config.categoryEmojis?.[categoryName.toLowerCase()] || "📋";

 const lines = [
 `${CHARS.cornerTopLeft}${CHARS.horizontal}「 ${emoji} *${categoryName.toUpperCase()}* 」`,
 "",
 ];

 for (const cmd of commands) {
 lines.push(`${CHARS.vertical} ${prefix}${cmd}`);
 }

 lines.push("");
 lines.push(`${CHARS.cornerBottomLeft}${createLine(20)}`);

 return lines.join("\n");
}

/**
 * Buat pesan wait/loading
 * @param {string} [message='Tunggu sebentar...'] - Pesan loading
 * @returns {string} Formatted wait message
 */
function createWaitMessage(message = "Diproses...") {
 return `${EMOJIS.loading} *${message}*`;
}

/**
 * Buat pesan sukses
 * @param {string} [message='Berhasil!'] - Pesan sukses
 * @returns {string} Formatted success message
 */
function createSuccessMessage(message = "Berhasil!") {
 return `${EMOJIS.success} *${message}*`;
}

/**
 * Buat pesan error
 * @param {string} [message='Terjadi kesalahan!'] - Pesan error
 * @returns {string} Formatted error message
 */
function createErrorMessage(message = "Terjadi kesalahan!") {
 return `${EMOJIS.error} *${message}*`;
}

/**
 * Buat pesan warning
 * @param {string} message - Pesan warning
 * @returns {string} Formatted warning message
 */
function createWarningMessage(message) {
 return `${EMOJIS.warning} *${message}*`;
}

/**
 * Mendapatkan greeting berdasarkan waktu
 * @returns {string} Greeting message
 * @example
 * getTimeGreeting(); // "Selamat Pagi" (jika pagi hari)
 */
function getTimeGreeting() {
 const hour = timeHelper.getHour();

 if (hour >= 4 && hour < 10) return "Selamat Pagi 🌅";
 if (hour >= 10 && hour < 15) return "Selamat Siang ☀️";
 if (hour >= 15 && hour < 18) return "Selamat Sore 🌇";
 return "Selamat Malam 🌙";
}

/**
 * Capitalize setiap kata dalam string
 * @param {string} str - String untuk di-capitalize
 * @returns {string} Capitalized string
 * @example
 * capitalize('hello world'); // "Hello World"
 */
function capitalize(str) {
 if (!str) return "";
 return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Truncate text jika terlalu panjang
 * @param {string} text - Text untuk di-truncate
 * @param {number} maxLength - Panjang maksimal
 * @param {string} [suffix='...'] - Suffix jika di-truncate
 * @returns {string} Truncated text
 */
function truncate(text, maxLength, suffix = "...") {
 if (!text || text.length <= maxLength) return text;
 return text.slice(0, maxLength - suffix.length) + suffix;
}

export { CHARS, EMOJIS, formatUptime, formatDate, formatNumber, formatFileSize, createLine, createHeader, createFooter, createBodyLine, createArrowLine, createDashboard, createBotInfo, createUserProfile, createBotStatus, createCategoryMenu, createCategorySection, createMainMenu, createCommandList, createWaitMessage, createSuccessMessage, createErrorMessage, createWarningMessage, getTimeGreeting, capitalize, truncate, getImportantDay }
/**
 * Deteksi hari penting nasional Indonesia berdasarkan tanggal.
 * Cek dari daftar statis (hardcode) lalu fallback ke API online.
 * @param {Date} [date=new Date()] - Tanggal untuk dicek
 * @returns {Promise<string>} Nama hari penting atau "Tidak ada"
 */
async function getImportantDay(date = new Date()) {
 const mm = String(date.getMonth() + 1).padStart(2, "0");
 const dd = String(date.getDate()).padStart(2, "0");
 const key = `${mm}-${dd}`;

 // Daftar hari penting nasional & internasional — 100% STATIS.
 // API api-harilibur.vercel.app sudah mati (DEPLOYMENT_DISABLED), jadi jangan
 // gantungin endpoint pihak ketiga untuk info section menu (owner rule: hindari API unstable).
 const hariPenting = {
  // ── Januari ──
  "01-01": "Tahun Baru Masehi",
  "01-10": "Hari Lapangan Terbang Nasional",
  "01-25": "Hari Gizi & Nutrisi Nasional",
  // ── Februari ──
  "02-04": "Hari Kanker Sedunia",
  "02-09": "Hari Pers Nasional",
  "02-14": "Hari Kasih Sayang Sedunia (Valentine)",
  "02-15": "Hari Kanker Anak Sedunia",
  "02-21": "Hari Bahasa Ibu Internasional",
  // ── Maret ──
  "03-08": "Hari Wanita Sedunia",
  "03-15": "Hari Hak Konsumen Dunia",
  "03-21": "Hari Sindrom Down, Puisi & Hutan Sedunia",
  "03-22": "Hari Air Sedunia",
  "03-23": "Hari Meteorologi Sedunia",
  "03-24": "Hari TBC Sedunia",
  "03-27": "Hari Teater Sedunia",
  // ── April ──
  "04-02": "Hari Peduli Autisme Sedunia",
  "04-07": "Hari Kesehatan Dunia",
  "04-21": "Hari Kartini",
  "04-22": "Hari Bumi",
  "04-23": "Hari Buku Sedunia",
  // ── Mei ──
  "05-01": "Hari Buruh Internasional",
  "05-02": "Hari Pendidikan Nasional (Hardiknas)",
  "05-08": "Hari Palang Merah Sedunia",
  "05-12": "Hari Perawat Internasional",
  "05-15": "Hari Keluarga Sedunia",
  "05-17": "Hari Buku Nasional & Hari Telekomunikasi Dunia",
  "05-20": "Hari Kebangkitan Nasional (Harkitnas)",
  "05-21": "Hari Kebudayaan Nasional",
  "05-22": "Hari Keanekaragaman Hayati Sedunia",
  "05-31": "Hari Tanpa Tembakau Sedunia",
  // ── Juni ──
  "06-01": "Hari Lahir Pancasila",
  "06-05": "Hari Lingkungan Hidup Dunia",
  "06-08": "Hari Lautan Sedunia",
  "06-12": "Hari Penghapusan Pekerja Anak Sedunia",
  "06-14": "Hari Donor Darah Sedunia",
  "06-20": "Hari Pengungsi Sedunia",
  "06-21": "Hari Musik Dunia (Fete de la Musique)",
  "06-26": "Hari Anti Narkoba Internasional",
  "06-29": "Hari Bakti TNI AU",
  // ── Juli ──
  "07-11": "Hari Populasi Dunia",
  "07-17": "Hari Konstitusi Republik Indonesia",
  "07-22": "Hari Jurnalistik Nasional",
  "07-23": "Hari Anak Nasional",
  "07-29": "Hari Harimau Sedunia",
  // ── Agustus ──
  "08-10": "Hari Veteran Nasional",
  "08-12": "Hari Pemuda Internasional",
  "08-17": "Hari Proklamasi Kemerdekaan RI",
  "08-19": "Hari Kemanusiaan Dunia",
  // ── September ──
  "09-05": "Hari Amal Internasional",
  "09-08": "Hari Melek Aksara Internasional",
  "09-15": "Hari Demokrasi Internasional",
  "09-16": "Hari Ozon Sedunia",
  "09-21": "Hari Perdamaian Internasional",
  "09-26": "Hari Maritim Dunia",
  "09-27": "Hari Pariwisata Dunia",
  "09-28": "Hari Akses Universal Informasi",
  "09-29": "Hari Jantung Dunia",
  "09-30": "Hari Penerjemahan Internasional",
  // ── Oktober ──
  "10-01": "Hari Kesaktian Pancasila & Hari Vegetarian Dunia",
  "10-02": "Hari Batik Nasional",
  "10-04": "Hari Hewan Dunia",
  "10-05": "Hari TNI & Hari Guru Dunia",
  "10-10": "Hari Kesehatan Jiwa Dunia",
  "10-11": "Hari Gadis Internasional",
  "10-13": "Hari Pengurangan Risiko Bencana",
  "10-15": "Hari Cuci Tangan Pakai Sabun Dunia",
  "10-16": "Hari Pangan Dunia",
  "10-17": "Hari Pengentasan Kemiskinan Dunia",
  "10-24": "Hari Perserikatan Bangsa-Bangsa (PBB)",
  "10-28": "Hari Sumpah Pemuda",
  // ── November ──
  "11-10": "Hari Pahlawan Nasional",
  "11-12": "Hari Ayah Nasional",
  "11-14": "Hari Diabetes Dunia",
  "11-19": "Hari Pria Internasional",
  "11-20": "Hari Anak Sedunia & Hari Industri Nasional",
  "11-21": "Hari Televisi Dunia",
  "11-25": "Hari Guru Nasional & Hari Anti Kekerasan terhadap Perempuan",
  // ── Desember ──
  "12-01": "Hari AIDS Sedunia",
  "12-03": "Hari Penyandang Disabilitas Internasional",
  "12-05": "Hari Relawan Internasional",
  "12-09": "Hari Anti Korupsi Internasional",
  "12-10": "Hari Hak Asasi Manusia (HAM) Internasional",
  "12-11": "Hari Gunung Internasional",
  "12-18": "Hari Bahasa Arab Internasional",
  "12-20": "Hari Solidaritas Manusia Internasional",
  "12-22": "Hari Ibu",
  "12-25": "Hari Raya Natal",
 };

 return hariPenting[key] || "";
}

// Helper untuk nama bulan dalam bahasa Indonesia
function getMonthName(mm) {
 const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
 return months[parseInt(mm) - 1] || mm;
}
