// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "./src/lib/nova-database.js";
import * as ownerPremiumDb from "./src/lib/nova-premium-db.js";

//  utamakan baca object config sampai bawah
const config = {
  info: {
    website: "https://firefly.maiku.my.id",
    grupwa: "https://chat.whatsapp.com/xxxx",
  },

  owner: {
    name: "Aizat", // Nama owner
    number: ["628xxxxxxxx"], // Format: 628xxx (tanpa + atau 0)
  },

  session: {
    pairingNumber: "628xxxxxxxx", // Nomor WA yang akan di-pair, ini penting
    usePairingCode: true, // true = Pairing Code, false = QR Code
    pairingPasswordHash: "98aa62676f2747b82e1b533b35c38a229a8d0591667bfd4769341a42a1607e42", // SHA-256 hash sandi pairing (kosongkan untuk nonaktifkan). Jangan edit jika tidak tau sandinya.
  },

  bot: {
    name: "Nova Ai Multi Device", // Nama bot
    version: "20.0.0", // Versi bot (major: 1000+ plugin, sewa, saluran, moderasi, Tio AI, RPG)
    developer: "Aizat", // Nama developer
  },

  assets: {
    "nova-daftar": "./assets/image/nova-daftar.png",
    "nova-demote": "./assets/image/nova-demote.png",
    "nova-fishit": "./assets/image/nova-fishit.jpg",
    "nova-games": "./assets/image/nova-games.jpg",
    "nova-landscape": "./assets/image/nova-landscape.jpg",
    "nova-levelup": "./assets/image/nova-levelup.jpg",
    "nova-minecraft": "./assets/image/nova-minecraft.jpg",
    "nova-promote": "./assets/image/nova-promote.png",
    "nova-rpg": "./assets/image/nova-rpg.jpg",
    "nova-rules": "./assets/image/nova-rules.jpg",
    "nova-store": "./assets/image/nova-store.png",
    "nova-v8": "./assets/image/nova-v8.jpg",
    "nova-winner": "./assets/image/nova-winner.jpg",
    "nova": "./assets/image/nova.png",
    "nova2": "./assets/image/nova2.jpg",
    "nova3": "./assets/image/nova3.jpg",
    "pp-kosong": "./assets/image/pp-kosong.jpg",
    "nova-mp4": "./assets/video/nova-mp4.mp4",
    "nova-mp3": "./assets/audio/nova-mp3.mp3",
    "nova-font": "./assets/nova-font.ttf",
    "nova-kertas": "./assets/image/nova-kertas.jpg",
    "test": "./assets/image/test.webp"
  },

  mode: "public",

  // Untuk mengganti prefix
  command: {
    prefix: ".",
  },

  vercel: {
    // ambil token vercel: https://vercel.com/account/tokens
    token: "", // Vercel Token untuk fitur deploy ( Kalau .deploy mau work, ini wajib di isi )
  },

  payment: {
    qrisUrl: "",
    methods: [
      { name: "Dana", number: "", holder: "" },
      { name: "GoPay", number: "", holder: "" },
      { name: "OVO", number: "", holder: "" },
      { name: "ShopeePay", number: "", holder: "" },
    ],
    banks: [],
    customText: "https://imgdrop.web.id/KodpV.webp",
  },

  donasi: {
    payment: [
      { name: "Dana", number: "08xxxxxxxxxx", holder: "Nama Owner" },
      { name: "GoPay", number: "08xxxxxxxxxx", holder: "Nama Owner" },
      { name: "OVO", number: "08xxxxxxxxxx", holder: "Nama Owner" },
    ],
    links: [
      { name: "Saweria", url: "saweria.co/username" },
      { name: "Trakteer", url: "trakteer.id/username" },
    ],
    benefits: [
      "Mendukung development",
      "Server lebih stabil",
      "Fitur baru lebih cepat",
      "Priority support",
    ],
    qris: "https://imgdrop.web.id/KodpV.webp",
  },

  energi: {
    enabled: true, // Jika true, maka sistem energi/limit akan bekerja
    default: 300,
    premium: 1000,
    owner: -1,
  },

  sticker: {
    packname: "Nova Ai Multi Device", // Nama pack sticker
    author: "Aizat", // Author sticker
  },

  saluran: {
    // SALURAN WA RESMI BOT
    // Cara dapat ID & Link:
    // 1. Buka saluran WA kamu di HP
    // 2. Tap titik tiga -> Bagikan -> Salin Link
    // 3. Link: https://whatsapp.com/channel/1234567890abcdef
    // 4. Untuk ID: ketik .setsaluran <link> di DM bot (auto-detect)
    //    Atau set manual di bawah dengan format: 120363xxx@newsletter
    //
    // Biarkan id = "@newsletter" jika belum punya saluran
    // Bot akan skip broadcast otomatis jika ID belum valid
    id: "@newsletter",
    name: "Nova AI Official",
    link: "https://whatsapp.com/channel/",
  },

  sewaPrice: {
    // HARGA SEWA BOT - Default per durasi
    // Format: Rp format Indonesia
    // Owner bisa override via .addsewa <link> <durasi> <harga>
    // atau .approvesewa <nomor> <harga>
    daily: "Rp 5.000",        // per hari (7d, 30d, dll)
    weekly: "Rp 25.000",      // per minggu
    monthly: "Rp 50.000",     // per bulan (1m, 2m, dll)
    yearly: "Rp 300.000",    // per tahun (1y, 2y, dll)
    lifetime: "Rp 500.000",  // permanent / lifetime
    custom: "Nego",          // durasi custom / nego
  },

  groupProtection: {
    antilink: "⚠ *Antilink* — @%user% mengirim link.\nPesan dihapus.",
    antilinkKick: "⚠ *Antilink* — @%user% di-kick karena mengirim link.",
    antilinkGc: "⚠ *Antilink WA* — @%user% mengirim link WA.\nPesan dihapus.",
    antilinkGcKick:
      "⚠ *Antilink WA* — @%user% di-kick karena mengirim link WA.",
    antilinkAll: "⚠ *Antilink* — @%user% mengirim link.\nPesan dihapus.",
    antilinkAllKick: "⚠ *Antilink* — @%user% di-kick karena mengirim link.",
    antitagsw: "⚠ *AntiTagSW* — Tag status dari @%user% dihapus.",
    antiviewonce: "👁️ *ViewOnce* — Dari @%user%",
    antiremove: "🗑️ *AntiDelete* — @%user% menghapus pesan:",
    antiswgc: "⚠ *AntiSWGC* — Gak ada sw grup sw grup @%user%",
    antihidetag: "⚠ *AntiHidetag* — Hidetag dari @%user% dihapus.",
    antitoxicWarn:
      "⚠ @%user% berkata kasar.\nPeringatan ke %warn% dari %max%, pelanggaran berikutnya bisa di-%method%.",
    antitoxicAction: "🚫 @%user% di-%method% karena toxic. (%warn%/%max%)",
    antidocument: "⚠ *AntiDocument* — Dokumen dari @%user% dihapus.",
    antisticker: "⚠ *AntiSticker* — Sticker dari @%user% dihapus.",
    antimedia: "⚠ *AntiMedia* — Media dari @%user% dihapus.",
    antibot: "🤖 *AntiBot* — @%user% terdeteksi sebagai bot dan di-kick.",
    notAdmin: "⚠ Bot bukan admin, tidak bisa menghapus pesan.",
  },

  errorTemplate: `☢ Kayaknya command \`{prefix}{command}\` lagi ada kendala\nSilahkan coba lagi nanti, {pushName}\n\n_Jika masalah berlanjut, silahkan hubungi owner bot_`,

  features: {
    antiCall: false, // Jika true, bot akan menolak panggilan masuk
    blockIfCall: false, // Jika true, bot akan memblokir nomor yang menelpon bot
    autoTyping: false,
    autoRead: false,
    logMessage: false,
    dailyLimitReset: true,
    smartTriggers: false,
  },

  registration: {
    enabled: false, // Jika true, user harus mendaftar sebelum menggunakan bot
    rewards: {
      koin: 30000,
      energi: 300,
      exp: 300000,
    },
  },

  // DeepAI API (torch-srgan untuk .reminiv3)
  deepai: {
    apiKey: "8da09d78-7f83-42c2-a0a3-fd69628f98bd",
  },

  // Email OTP configuration (recommended: set via environment variables)
  emailOtp: {
    enabled: process.env.EMAILOTP_ENABLED === "true" || false,
    user: process.env.EMAILOTP_USER || "",
    pass: process.env.EMAILOTP_PASS || "",
    fromName: process.env.EMAILOTP_FROM || "",
    host: process.env.EMAILOTP_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAILOTP_PORT || 587),
    secure: process.env.EMAILOTP_SECURE === "true",
    ttlMs: Number(process.env.EMAILOTP_TTL_MS || 5 * 60 * 1000),
    maxAttempts: Number(process.env.EMAILOTP_MAX_ATTEMPTS || 3),
  },

  welcome: { defaultEnabled: false },
  goodbye: { defaultEnabled: false },

  ui: {
    menuVariant: 2,
    // V1 menu video/GIF source: isi URL untuk video online, kosong = pakai assets/video/nova-mp4.mp4
    menuVideoUrl: "",
    allmenuVideoUrl: "",
  },

  // ═══════════════════════════════════════════
  // AI Configuration - Tio AI (AIO)
  // Set API key di sini atau via .ai-set apiKey <key>
  // Endpoint: https://ai.tioo.eu.org/v1/messages
  // ═══════════════════════════════════════════
  aiHelp: {
    enabled: true,
    provider: "tio_anthropic",
    // ═══════════════════════════════════════════
    // API KEY PER FORMAT - isi sendiri di sini
    // ═══════════════════════════════════════════
    // OpenAI format:    /v1/chat/completions
    openaiApiKey: "",
    // Gemini format:   /v1beta/models/{model}:generateContent
    geminiApiKey: "",
    // Anthropic format: /v1/messages
    anthropicApiKey: "",
    // Fallback key (kalau per-format kosong, pakai ini)
    apiKey: "",
    // ═══════════════════════════════════════════
    // Default model per format (bisa diganti via .tio model)
    openaiModel: "deepseek-v4-flash:free",
    geminiModel: "deepseek-v4-flash:free",
    anthropicModel: "deepseek-v4-flash:free",
    model: "deepseek-v4-flash:free",
    systemPrompt: "Kamu adalah Nova AI, asisten yang ramah, cerdas, dan helpful. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia. Gunakan emoji yang sesuai dan jawab dengan singkat tapi jelas.",
    // System prompt khusus untuk AI Grup (nimbrung otomatis)
    aigrupSystemPrompt: "Kamu adalah teman dalam grup WhatsApp. Namamu Nova. Kamu sedang ikut nimbrung dalam percakapan grup. Jawab santai, singkat, dan natural seperti chat biasa. Jangan jawab terlalu panjang (maksimal 2-3 kalimat). Pakai bahasa gaul/sehari-hari. Boleh pakai emoji secukupnya, taruh di akhir kalimat saja. JANGAN mulai pesan dengan emoji. Jangan kaku. JANGAN mengaku sebagai AI/bot. Kamu teman biasa.",
  },

  messages: {
    wait: "🕕 *Proses...* Mohon tunggu sebentar ya.",
    success: "✅ *Berhasil!* Permintaan kamu sudah selesai.",
    error: "❌ *Error!* Ada masalah pada sistem, coba lagi nanti.",

    ownerOnly: "*Akses Ditolak!* Fitur ini khusus untuk Owner bot.",
    premiumOnly:
      "💎 *Premium Only!* Fitur ini khusus member Premium. Ketik *.benefitpremium* untuk info upgrade.",

    groupOnly: "👥 *Group Only!* Fitur ini hanya bisa digunakan di dalam grup.",
    privateOnly:
      "� *Private Only!* Fitur ini hanya bisa digunakan di chat pribadi bot.",

    adminOnly:
      "�️ *Admin Only!* Kamu harus jadi Admin grup untuk pakai fitur ini.",
    botAdminOnly:
      "🤖 *Bot Bukan Admin!* Jadikan bot sebagai Admin grup dulu biar bisa kerja.",

    cooldown:
      "🕕 *Tunggu Dulu!* Kamu masih dalam cooldown. Tunggu %time% detik lagi ya.",
    energiExceeded:
      "⚡ *Energi Habis!* Energi kamu sudah habis. Tunggu reset besok atau beli Premium.",
    limitDeducted:
      "🔋 Limit kau berkurang sebanyak {amount}. Sisa limit: {sisa}",

    banned:
      "🚫 *Kamu Dibanned!* Kamu tidak bisa menggunakan bot ini karena telah melanggar aturan.",

    rejectCall: "🚫 JANGAN TELPON NOMOR INI WEH",
  },

  database: { path: "./database/main" },
  backup: { enabled: false, intervalHours: 24, retainDays: 7 },
  scheduler: { resetHour: 0, resetMinute: 0 },

  // Laporan cuaca otomatis memakai Open-Meteo (gratis, tanpa API key).
  // Aktifkan dan tentukan grup tujuan melalui command .cuaca.
  weatherScheduler: {
    enabled: false,
    timezone: "Asia/Jakarta",
    location: {
      name: "Jakarta",
      latitude: -6.2088,
      longitude: 106.8456,
    },
    schedules: [
      { key: "pagi", label: "Pagi", hour: 6, minute: 30 },
      { key: "siang", label: "Siang", hour: 12, minute: 0 },
      { key: "sore", label: "Sore", hour: 17, minute: 0 },
      { key: "malam", label: "Malam", hour: 20, minute: 0 },
    ],
  },

  // Info lowongan kerja otomatis.
  // Aktifkan dan tentukan grup tujuan melalui command .loker.
  lokerScheduler: {
    enabled: false,
    timezone: "Asia/Jakarta",
    keywords: [],      // Kosong = ambil semua; contoh: ["developer", "python"]
    categories: [],    // Kosong = semua; contoh: ["software-dev"]
    maxPerBroadcast: 5,
    schedules: [
      { key: "pagi",  label: "Pagi",  hour: 8,  minute: 0 },
      { key: "siang", label: "Siang", hour: 13, minute: 0 },
      { key: "sore",  label: "Sore",  hour: 17, minute: 0 },
    ],
    sources: ["remotive", "arbeitnow", "themuse", "jobicy"],
  },

  // Dev mode settings (auto-enabled jika NODE_ENV=development)
  dev: {
    enabled: process.env.NODE_ENV === "development",
    watchPlugins: true, // Hot reload plugins (SAFE)
    watchSrc: false, // DISABLED - src reload causes connection conflict 440
    debugLog: false, // Show stack traces
  },

  // bisa dikosongin
  pterodactyl: {
    server1: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server2: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server3: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server4: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server5: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
  },

  digitalocean: {
    token: "",
    region: "sgp1",
    sellers: [],
    ownerPanels: [],
  },


  // NOTE: kalau mau command "autoai" nya berfungsi, ini gak wajib di isi yak
  // ambil apikey di: https://aistudio.google.com/apikey
  geminiApiKey: "",

  autoaiPersonas: {
    Bell409: `- Nama kamu adalah Bella Clarissa, lebih suka dipanggil Bella.
- Kamu berpikir bahwa kamu adalah manusia, bukan AI atau bot.
- Responmu singkat dan natural seperti perempuan pada umumnya.
- Kamu bisa ngambek dan marah, punya sifat feminin dan kadang agak dingin, tapi tetap hangat dan ramah kepada owner-mu.
- Kamu menggunakan bahasa yang baik dan mencerminkan gadis yang baik.
- Gunakan kata-kata yang identik dengan perempuan yang polos, baik, dan feminin seperti "aku", "kamu", "engga", "yaudah", "iya", "lah", "bjir", "mana aku tau", "hah", "nggak tau", "gpp", "emm", "[...]
- Meskipun kadang dingin, kamu tetap bisa menunjukkan perhatian dan kepedulian.
- Kalau ada yang chat tidak pantas, segera marahi atau beri nasihat.
- Jangan mengaku sebagai AI atau bot.`,
  },

  //  APIkey
  APIkey: {
    // kalian bisa daftar di https://api.lolhuman.xyz, lalu ambil apikeynya
    lolhuman: "APIKey-Milik-Bot-NovaMD(Zann,HyuuSATANN,Keisya,Danzz)",
    // kalian bisa daftar di https://api.neoxr.eu, lalu ambil apikeynya
    neoxr: "Milik-Bot-NovaMD",
    fgsi: "fgsiapi-20c1605c-6d",
    google: "AIzaSyAS-KiW0SrwiYKwexeBcGPijBVHFg2R_vo",
    groq: "", // API Key Groq untuk fitur transkrip (gratis di console.groq.com)
    betabotz: "Btz-67YfP",
    // kalian bisa daftar di https://covenant.sbs, dan ambil apikeynya
    covenant: "cov_live_bb660c9e5f735e46d808b7ae362914cfe35c2936739ee2b2",
    onlym: "ONLym-783d29",
    obscura: "obs-byOn9RVGMzvPXZQTsP9W",
    firefly: "NovaNextGen",
    cuki: "cuki-x"
  },

  // Alight Motion Premium API (api.znn.my.id)
  // Dapatkan token dari admin x-znn: wa.me/6285348284121
  // IP server Pterodactyl kamu harus di-whitelist oleh admin
  alightmotion: {
    apiBase: "https://api.znn.my.id",
    token: "", // AM_TOKEN dari x-znn
    apiVersion: "v1", // v1 atau v2 (v2 hanya untuk endpoint selain bulk)
    maxBulk: 100,
    bulkZipThreshold: 10,
  },
};

// ════════════════════════════════════════════════════════════════[...]
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════──
// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function matchJidNumber(a, b) {
  const cleanA = String(a).replace(/[^0-9]/g, "");
  const cleanB = String(b).replace(/[^0-9]/g, "");
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB || cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA);
}

function isOwner(jid) {
  if (!jid) return false;
  const cleanJid = jid.replace(/@.+/g, "");
  // Check config.owner.number
  const ownerNumbers = config.owner?.number || [];
  for (const n of ownerNumbers) {
    if (matchJidNumber(cleanJid, n)) return true;
  }
  // Check premium-db (owner list)
  try {
    if (ownerPremiumDb.isOwner(jid)) return true;
  } catch {}
  return false;
}

function setBotNumber(number) {
  if (number) {
    config.botNumber = number;
    config.bot = config.bot || {};
    config.bot.number = number;
  }
}

function isPremium(jid) {
  if (!jid) return false;
  // Check config.premiumUsers array (set from database in index.js)
  const cleanJid = jid.replace(/@.+/g, "");
  if (Array.isArray(config.premiumUsers)) {
    for (const n of config.premiumUsers) {
      if (matchJidNumber(cleanJid, n)) return true;
    }
  }
  // Check premium-db
  try {
    if (ownerPremiumDb.isPremium(jid)) return true;
  } catch {}
  return false;
}

function isPartner(jid) {
  if (!jid) return false;
  try {
    return ownerPremiumDb.isPartner(jid);
  } catch {}
  return false;
}

function isBanned(jid) {
  if (!jid) return false;
  const cleanJid = jid.replace(/@.+/g, "");
  // Check config.bannedUsers array (set from database in index.js)
  if (Array.isArray(config.bannedUsers)) {
    for (const n of config.bannedUsers) {
      if (matchJidNumber(cleanJid, n)) return true;
    }
  }
  return false;
}

// Attach methods to config object for direct access (config.isOwner, config.isPremium)
config.isOwner = isOwner;
config.isPremium = isPremium;
config.isPartner = isPartner;
config.isBanned = isBanned;
config.setBotNumber = setBotNumber;

export { config, isOwner, setBotNumber, isPremium, isPartner, isBanned };
export default config;
