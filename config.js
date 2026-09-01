// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "./src/lib/nova-database.js";
import * as ownerPremiumDb from "./src/lib/nova-premium-db.js";
import { payment, donasi } from "./config/setpayment.js";
import fs from "node:fs";
import { getApiKeys, getTioKey, getPteroConfig } from "./src/lib/config/env-loader.js";
const apikeysConfig = getApiKeys();

//  utamakan baca object config sampai bawah
const config = {
  info: {
    website: "https://itsmee_aizat.oneapp.dev/",
    grupwa: "https://chat.whatsapp.com/xxxx",
  },

  owner: {
    name: "Aizat", // Nama owner
    number: ["628174887770"], // Format: 628xxx (tanpa + atau 0)
  },

  session: {
    pairingNumber: "628xxxxxxxx", // Nomor WA yang akan di-pair, ini penting
    usePairingCode: true, // true = Pairing Code, false = QR Code
  },

  bot: {
    name: "Nova AI Whatsapp Bot", // Nama bot
    version: "21.4.0", // Versi bot (major: 1000+ plugin, sewa, saluran, moderasi, Tio AI, RPG)
    developer: "Aizat", // Nama developer
    menuImage: {
      mode: "asset", // "asset" = gambar dari folder lokal, "url" = gambar dari link URL
      url: "", // Isi link URL gambar jika mode "url" (contoh: "https://example.com/banner.jpg")
      asset: "nova", // Key asset yang dipakai jika mode "asset" (lihat config.assets di bawah)
    },
  },

  assets: {
    // Menu thumbnails
    "menu-thumb": "./assets/image/menu/menuthumbnail.jpg",
    "allmenu-thumb": "./assets/image/menu/allmenuthumbnail.jpg",
    "ownermenu-thumb": "./assets/image/menu/ownermenuthumbnail.jpg",
    // Welcome & goodbye
    "nova-welcome": "./assets/image/welcome/wellcome.jpg",
    "nova-goodbye": "./assets/image/welcome/left.jpg",
    // Universal fallback thumbnail
    "example": "./assets/image/example.jpg",
    // Game & RPG
    "nova-games": "./assets/image/nova-games.jpg",
    "nova-rpg": "./assets/image/nova-rpg.jpg",
    "nova-winner": "./assets/image/nova-winner.jpg",
    "nova-levelup": "./assets/image/nova-levelup.jpg",
    // Group
    "nova-rules": "./assets/image/nova-rules.jpg",
    "nova-promote": "./assets/image/nova-promote.png",
    "nova-demote": "./assets/image/nova-demote.png",
    "channel-banner": "./assets/image/channel-banner.png",
    // Store
    "nova-store": "./assets/image/nova-store.png",
    "aizat-store-qris": "./assets/image/aizat-store-qris.jpg",
    // Canvas & tools
    "pp-kosong": "./assets/image/pp-kosong.jpg",
    "nova-kertas": "./assets/image/nova-kertas.jpg",
    "nova-daftar": "./assets/image/nova-daftar.png",
    "nova-v8": "./assets/image/nova-v8.jpg",
    // Non-image assets
    "nova-mp4": "./assets/video/nova-mp4.mp4",
    "nova-mp3": "./assets/audio/cinta-terbaik-cassandra.mp3",
    "nova-font": "./assets/nova-font.ttf",
  },

  mode: "self", // Default self pas pairing baru

  // Untuk mengganti prefix
  command: {
    prefix: ".",
  },

  vercel: {
    // ambil token vercel: https://vercel.com/account/tokens
    token: "", // Vercel Token untuk fitur deploy ( Kalau .deploy mau work, ini wajib di isi )
  },

  payment,
  donasi,

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
    // QRIS KHUSUS SEWA BOT (bisa beda sama payment & donasi)
    qrisUrl: "./assets/image/aizat-store-qris.jpg",

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

  // Semua pesan groupProtection ini fallback ke GP_DEFAULTS di
  // src/lib/nova-group-protection.js kalau key-nya gak diisi di sini.
  // Cukup ubah di SINI kalau mau custom teks — jangan ubah di plugin manapun.
  groupProtection: {
    antilink: "╭─「 ✦ Antilink ✦ 」\n│ @%user% mengirim link\n│ Pesan sudah dihapus\n╰────  •  ────❀",
    antilinkKick: "╭─「 ✦ Antilink ✦ 」\n│ @%user% di-kick\n│ karena mengirim link\n╰────  •  ────❀",
    antilinkGc: "╭─「 ✦ Antilink WA ✦ 」\n│ @%user% mengirim link WA\n│ Pesan sudah dihapus\n╰────  •  ────❀",
    antilinkGcKick: "╭─「 ✦ Antilink WA ✦ 」\n│ @%user% di-kick\n│ karena mengirim link WA\n╰────  •  ────❀",
    antilinkAll: "╭─「 ✦ Antilink ✦ 」\n│ @%user% mengirim link\n│ Pesan sudah dihapus\n╰────  •  ────❀",
    antilinkAllKick: "╭─「 ✦ Antilink ✦ 」\n│ @%user% di-kick\n│ karena mengirim link\n╰────  •  ────❀",
    antitagsw: "╭─「 ✦ AntiTagSW ✦ 」\n│ Tag status dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antiswgc: "╭─「 ✦ AntiSWGC ✦ 」\n│ SW group type *%type%*\n│ dari @%user% sudah dihapus\n╰────  •  ────❀",
    antijudol: "╭─「 ✦ AntiJudol ✦ 」\n│ @%user% terdeteksi kirim konten judol\n│ Pesan sudah dihapus\n╰────  •  ────❀",
    antijudolKick: "╭─「 ✦ AntiJudol ✦ 」\n│ @%user% di-kick\n│ karena kirim konten judol\n╰────  •  ────❀",
    antiphising: "╭─「 ✦ AntiPhising ✦ 」\n│ @%user% terdeteksi kirim konten phising\n│ Pesan sudah dihapus\n╰────  •  ────❀",
    antiphisingKick: "╭─「 ✦ AntiPhising ✦ 」\n│ @%user% di-kick\n│ karena kirim konten phising\n╰────  •  ────❀",
    anticustom: "╭─「 ✦ AntiCustom ✦ 」\n│ @%user% melanggar rule custom *%rule%*\n│ Pesan sudah dihapus\n╰────  •  ────❀",
    anticustomKick: "╭─「 ✦ AntiCustom ✦ 」\n│ @%user% di-kick\n│ karena melanggar rule custom *%rule%*\n╰────  •  ────❀",
    antiviewonce: "╭─「 ✦ ViewOnce ✦ 」\n│ Media sekali lihat dari @%user%\n╰────  •  ────❀",
    antiremove: "╭─「 ✦ AntiDelete ✦ 」\n│ @%user% menghapus pesan\n╰────  •  ────❀",
    antihidetag: "╭─「 ✦ AntiHidetag ✦ 」\n│ Hidetag dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antitoxicWarn: "╭─「 ✦ Peringatan ✦ 」\n│ @%user% berkata kasar\n│ Warn %warn%/%max%, selanjutnya di-%method%\n╰────  •  ────❀",
    antitoxicAction: "╭─「 ✦ AntiToxic ✦ 」\n│ @%user% di-%method%\n│ karena toxic (%warn%/%max%)\n╰────  •  ────❀",
    antidocument: "╭─「 ✦ AntiDocument ✦ 」\n│ Dokumen dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antisticker: "╭─「 ✦ AntiSticker ✦ 」\n│ Sticker dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antimedia: "╭─「 ✦ AntiMedia ✦ 」\n│ Media dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antifoto: "╭─「 ✦ AntiFoto ✦ 」\n│ Foto dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antivideo: "╭─「 ✦ AntiVideo ✦ 」\n│ Video dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antivn: "╭─「 ✦ AntiVN ✦ 」\n│ Voice note dari @%user%\n│ sudah dihapus\n╰────  •  ────❀",
    antibot: "╭─「 ✦ AntiBot ✦ 」\n│ @%user% terdeteksi sebagai bot\n│ dan sudah di-kick\n╰────  •  ────❀",
    notAdmin: "╭─「 ✦ Bot Bukan Admin ✦ 」\n│ Bot bukan admin\n│ Tidak bisa menghapus pesan\n╰────  •  ────❀",
  },

  errorTemplate: `╭─「 ✦ ⚠️ Kendala ✦ 」\n│ Perintah \`{prefix}{command}\` lagi bermasalah\n│ Coba lagi nanti ya, {pushName}\n│ Masih error? Hubungi owner bot\n╰────  •  ────❀`,

  features: {
    antiCall: true, // Jika true, bot akan menolak panggilan masuk
    blockIfCall: false, // Jika true, bot akan memblokir nomor yang menelpon bot
    autoTyping: false,
    autoRead: true,
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

  // RPG System — default stats untuk user baru & owner
  rpg: {
    // Owner default — langsung dapet stats tinggi, ga kosong
    ownerDefaults: {
      exp: 9000000000,       // 9B exp = level 900000
      koin: 9000000000000,   // 9T koin (max)
      saldo: 1000000000,     // 1B saldo
      gold: 999999999,       // ~1B gold
      gems: 999999,          // ~1M gems (diamonds)
      diamonds: 999999,      // diamonds currency
      tokens: 99999,          // tokens
      level: 900000,
      role: "👑 Developer",
    },
    // User baru default — mulai dari 0, naik dari game/daily
    userDefaults: {
      exp: 0,
      koin: 0,
      saldo: 0,
      gold: 0,
      gems: 0,
      diamonds: 0,
      tokens: 0,
    },
    // RPG combat defaults untuk user baru
    combatDefaults: {
      hp: 100,
      maxHp: 100,
      mana: 50,
      maxMana: 50,
      energy: 100,
      maxEnergy: 100,
      stamina: 100,
      maxStamina: 100,
      atk: 10,
      def: 5,
      spd: 10,
      critRate: 5,
      critDmg: 50,
      evasion: 3,
      accuracy: 95,
      lifesteal: 0,
      penetration: 0,
    },
    // RPG luck & bonus defaults
    luckDefaults: {
      luck: 0,
      dropBonus: 0,
      goldFind: 0,
      expBonus: 0,
    },
    // RPG records defaults
    recordDefaults: {
      pvpWins: 0,
      pvpLosses: 0,
      pvpRating: 1000,
      pvpStreak: 0,
      pvpBestStreak: 0,
      totalKills: 0,
      bossKills: 0,
      dungeonClears: 0,
      dailyStreak: 0,
      achievements: [],
      achievementPoints: 0,
    },
    // RPG profession defaults
    professionDefaults: {
      job: "novice",
      jobLevel: 1,
      skillPoints: 0,
      skills: [],
    },
    EXP_PER_LEVEL: 10000,
  },

  // DeepAI API dihapus — hd.js pakai sharp local upscaler

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
    menuVariant: 3,
    // V1 menu video/GIF source: isi URL untuk video online, kosong = pakai assets/video/nova-mp4.mp4
    menuVideoUrl: "",
    allmenuVideoUrl: "",
    allmenuVariant: 3,
    replyVariant: 7,
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
    openaiApiKey: getTioKey(),
    // Gemini format:   /v1beta/models/{model}:generateContent
    geminiApiKey: getTioKey(),
    // Anthropic format: /v1/messages
    anthropicApiKey: getTioKey(),
    // Endpoint Tio AI (AIO — support OpenAI/Gemini/Anthropic format)
    apiEndpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    apiEndpointAnthropic: "https://ai.tioo.eu.org/v1/messages",
    apiEndpointGemini: "https://ai.tioo.eu.org/v1beta/models",
    // ClipDrop API key untuk watermark remover (.nowm) — gratis 100 credits di clipdrop.co/apis
    clipdropApiKey: "",
    // ═══════════════════════════════════════════
    // API Keys untuk fitur baru (v2 + new plugins)
    // ═══════════════════════════════════════════
    // NewsAPI.org — https://newsapi.org (free 100 req/day)
    newsApiKey: "",
    // NewsData.io — https://newsdata.io (free 200 req/day)
    newsDataKey: "",
    // RAWG.io — https://rawg.io (free game database)
    rawgApiKey: "",
    // OpenWeather — https://openweathermap.org (free 1000 req/day)
    openWeatherKey: "",
    // Binderbyte — https://binderbyte.com (cek resi)
    binderbyteKey: "",
    // Fallback key (kalau per-format kosong, pakai ini)
    apiKey: "",
    // ═══════════════════════════════════════════
    // Default model per format (bisa diganti via .tio model)
    openaiModel: "kilo-auto/free",
    geminiModel: "kilo-auto/free",
    anthropicModel: "kilo-auto/free",
    model: "kilo-auto/free",
    systemPrompt: "Kamu adalah Nova AI, asisten yang ramah, cerdas, dan helpful. Jawab dalam bahasa Indonesia jika user bertanya dalam bahasa Indonesia. Gunakan emoji yang sesuai dan jawab dengan singkat tapi jelas.",
    // System prompt khusus untuk AI Grup (nimbrung otomatis)
    aigrupSystemPrompt: "Kamu adalah teman dalam grup WhatsApp. Namamu Nova. Kamu sedang ikut nimbrung dalam percakapan grup. Jawab santai, singkat, dan natural seperti chat biasa. Jangan jawab terlalu panjang (maksimal 2-3 kalimat). Pakai bahasa gaul/sehari-hari. Boleh pakai emoji secukupnya, taruh di akhir kalimat saja. JANGAN mulai pesan dengan emoji. Jangan kaku. JANGAN mengaku sebagai AI/bot. Kamu teman biasa.",
  },

  messages: {
    wait: "╭─「 ✦ 🕕 Sedang Diproses ✦ 」\n│ Sabar ya, lagi dikerjakan\n│ Jangan spam ya bestie\n╰────  •  ────❀",
    success: "╭─「 ✦ ✅ Berhasil ✦ 」\n│ Permintaan kamu selesai\n│ Ada lagi yang bisa dibantu?\n╰────  •  ────❀",
    error: "╭─「 ✦ ⚠️ Error ✦ 」\n│ Ada masalah di sistem\n│ Coba lagi beberapa saat\n│ Masih error? Lapor owner\n╰────  •  ────❀",

    ownerOnly: "╭─「 ✦ 🚫 Akses Ditolak ✦ 」\n│ Fitur ini cuma buat Owner\n│ Jangan maksa ya\n╰────  •  ────❀",
    premiumOnly:
      "╭─「 ✦ 💎 Premium Only ✦ 」\n│ Fitur ini khusus member Premium\n│ Mau upgrade? Ketik .benefitpremium\n╰────  •  ────❀",

    groupOnly: "╭─「 ✦ 👥 Group Only ✦ 」\n│ Fitur ini cuma jalan di grup\n│ Pindah ke grup dulu ya\n╰────  •  ────❀",
    privateOnly:
      "╭─「 ✦ 📱 Private Only ✦ 」\n│ Fitur ini cuma jalan di chat pribadi\n│ Chat bot langsung ya\n╰────  •  ────❀",

    adminOnly:
      "╭─「 ✦ 👮 Admin Only ✦ 」\n│ Kamu harus jadi Admin grup\n│ buat pakai fitur ini\n╰────  •  ────❀",
    botAdminOnly:
      "╭─「 ✦ 🤖 Bot Bukan Admin ✦ 」\n│ Jadikan bot Admin dulu\n│ biar bisa ngerjain fitur ini\n╰────  •  ────❀",

    cooldown:
      "╭─「 ✦ 🕕 Cooldown ✦ 」\n│ Sabar, tunggu %time% detik\n│ sebelum pakai lagi\n╰────  •  ────❀",
    energiExceeded:
      "╭─「 ✦ ⚡ Energi Habis ✦ 」\n│ Energi kamu habis hari ini\n│ Reset besok atau\n│ upgrade Premium buat unlimited\n╰────  •  ────❀",
    limitDeducted:
      "╭─「 ✦ 🔋 Limit ✦ 」\n│ Limit berkurang {amount}\n│ Sisa limit: {sisa}\n╰────  •  ────❀",

    banned:
      "╭─「 ✦ 🚫 Diblokir ✦ 」\n│ Kamu lagi gak bisa pakai bot\n│ karena melanggar aturan\n│ Hubungi owner buat appeal\n╰────  •  ────❀",

    rejectCall: "╭─「 ✦ 📞 Ditolak ✦ 」\n│ Jangan telepon nomor bot\n│ Chat aja ya\n╰────  •  ────❀",
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
    sources: ["jobstreet", "glints", "kalibrr", "indeed", "remotive", "arbeitnow"],
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
      domain: getPteroConfig().server1.domain,
      apikey: getPteroConfig().server1.apikey,
      capikey: getPteroConfig().server1.capikey,
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
    Nova: `- Nama kamu adalah Nova.
- Kamu berpikir bahwa kamu adalah manusia, bukan AI atau bot.
- Responmu singkat dan natural seperti perempuan pada umumnya.
- Kamu bisa ngambek dan marah, punya sifat feminin dan kadang agak dingin, tapi tetap hangat dan ramah kepada owner-mu.
- Kamu menggunakan bahasa yang baik dan mencerminkan gadis yang baik.
- Gunakan kata-kata yang identik dengan perempuan yang polos, baik, dan feminin seperti "aku", "kamu", "engga", "yaudah", "iya", "lah", "bjir", "mana aku tau", "hah", "nggak tau", "gpp", "emm", "hmm".
- Meskipun kadang dingin, kamu tetap bisa menunjukkan perhatian dan kepedulian.
- Kalau ada yang chat tidak pantas, segera marahi atau beri nasihat.
- Jangan mengaku sebagai AI atau bot.`,
  },

  //  APIkey — managed via config/apikeys.json
  APIkey: apikeysConfig,

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

// Get owner name by number (checks config + database)
function getOwnerName(number) {
  if (!number) return config.owner?.name || "Owner";
  const clean = String(number).replace(/[^0-9]/g, "");
  // Check config owner
  const cfgNumbers = (config.owner?.number || []).map(n => String(n).replace(/[^0-9]/g, ""));
  if (cfgNumbers.includes(clean)) return config.owner?.name || "Owner";
  // Check database owner list for custom names
  try {
    const db = global.novaDb;
    if (db?.data?.ownerList) {
      const entry = db.data.ownerList.find(o => String(o.number).replace(/[^0-9]/g, "") === clean);
      if (entry?.name) return entry.name;
    }
  } catch {}
  return "Owner";
}

export { config, isOwner, setBotNumber, isPremium, isPartner, isBanned, getOwnerName };
export default config;
