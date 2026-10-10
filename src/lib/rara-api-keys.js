// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════
// CENTRAL API KEYS — SATU TEMPAT BUAT SEMUA API KEY
// ═══════════════════════════════════════════════════════════════
// Cara pakai di plugin:
//   import { getApiKey, hasApiKey } from "../../src/lib/rara-api-keys.js";
//   URUTAN: .setkey (db) > src/lib/apikey/apikeys.json (PUSAT) > config lama > env
//   const key = getApiKey("gemini");
//   if (!key) { console.log("Gemini key belum di-set"); return; }
//
// Command WhatsApp buat set key:
//   .setkey gemini AIzaXxxxxxxx
//   .setkey list — lihat semua status
//   .setkey gemini — hapus key
//
// Semua key disimpan di sini. Edit file ini, restart bot, selesai.
// ═══════════════════════════════════════════════════════════════

import config from "../../config.js";
import { getDatabase } from "./rara-database.js";
import { getApiKeys } from "./config/env-loader.js";
import { getTioBase } from "./config/env-loader.js";

// ═══════════════════════════════════════════════════════════════
// DEFINISI SEMUA API KEY
// Urutan prioritas: runtime DB > file config > env variable
// ═══════════════════════════════════════════════════════════════

export const API_KEYS = {
  // ── BRIDGE MULTI-PLATFORM ──────────────────────
  telegram: {
    label: "Telegram (Bridge Multi-Platform)",
    description: "Bot token @BotFather — dipakai .bridge on telegram",
    getConfig: () => "",
    getEnv: () => process.env.TELEGRAM_BOT_TOKEN || "",
    getLink: () => "https://t.me/BotFather",
    usedBy: ["bridge"],
  },
  discord: {
    label: "Discord (Bridge Multi-Platform)",
    description: "Bot token Discord Developer Portal — dipakai .bridge on discord",
    getConfig: () => "",
    getEnv: () => process.env.DISCORD_BOT_TOKEN || "",
    getLink: () => "https://discord.com/developers/applications",
    usedBy: ["bridge"],
  },
  // ── PUSATISASI 10 Okt 2026: ampro + kyzz masuk registry pusat ──
  ampro: {
    label: "Ampro (AlightMotion Firebase)",
    description: "Firebase web key Alight Motion — dipakai .ampro/.amrefresh",
    getConfig: () => "",
    getEnv: () => process.env.AMPRO_FIREBASE_KEY || "",
    getLink: () => "",
    usedBy: ["ampro"],
  },
  siliconflow: {
    label: "SiliconFlow (Hunyuan-MT — engine translate kelas Immersive Translate)",
    description: "API key SiliconFlow — dipakai engine translate HY-MT (menu translate & .transdoc/.transaudio/.transfoto). Tanpa key → fallback MyMemory",
    getConfig: () => "",
    getEnv: () => process.env.SILICONFLOW_API_KEY || "",
    getLink: () => "https://cloud.siliconflow.cn",
    usedBy: ["languagemenubot", "transdoc", "transaudio", "transfoto"],
  },
  siliconflow_model: {
    label: "SiliconFlow Model ID (override model HY-MT)",
    description: "Model id override untuk engine translate (default Hunyuan/Hunyuan-MT-7B)",
    getConfig: () => "",
    getEnv: () => process.env.SILICONFLOW_MODEL || "",
    getLink: () => "",
    usedBy: ["languagemenubot"],
  },
  kyzz: {
    label: "Kyzz (API Downloader)",
    description: "Key API kyzz — downloader tiktok/ig/twitter/soundcloud/play dll",
    getConfig: () => "",
    getEnv: () => process.env.KYZZ_API_KEY || "",
    getLink: () => "",
    usedBy: ["tiktokdl", "instagramdl", "instagrammedia", "douyindl", "soundclouddl", "twitterdl", "play", "playvideo", "youtubeairich", "zerogptv2"],
  },
  // ── AI / LLM ──────────────────────────────────
  gemini: {
    label: "Gemini (AI Multimodal)",
    description: "Untuk VN Captcha, Ambient Mimicry, AI Anchor, AutoAI, STT",
    getConfig: () => config.aiHelp?.geminiApiKey || config.geminiApiKey || "",
    getEnv: () => process.env.GEMINI_API_KEY || "",
    getLink: () => "https://aistudio.google.com/apikey",
    usedBy: ["vncaptcha", "ambientmimic", "predictivenudge", "aiautointeractionvn", "aianchor", "autoai"],
  },
  openai: {
    label: "OpenAI (Chat/STT)",
    description: "Untuk AI chat, transkripsi VN, fallback AI",
    getConfig: () => config.aiHelp?.openaiApiKey || "",
    getEnv: () => process.env.OPENAI_API_KEY || "",
    getLink: () => "https://platform.openai.com/api-keys",
    usedBy: ["aiautointeractionvn", "ai-tio", "aichat", "predictivenudge"],
  },
  anthropic: {
    label: "Anthropic (Claude)",
    description: "Untuk AI chat format Anthropic",
    getConfig: () => config.aiHelp?.anthropicApiKey || "",
    getEnv: () => process.env.ANTHROPIC_API_KEY || "",
    getLink: () => "https://console.anthropic.com/settings/keys",
    usedBy: ["ai-tio", "aichat"],
  },
  aiFallback: {
    label: "AI Fallback (Generic)",
    description: "Key fallback kalau per-format kosong",
    getConfig: () => config.aiHelp?.apiKey || "",
    getEnv: () => process.env.AI_API_KEY || "",
    getLink: () => "",
    usedBy: ["ai-tio", "aichat", "aigrup"],
  },

  // ── IMAGE / MEDIA PROCESSING ──────────────────
  deepai: {
    label: "DeepAI (Remini/Enhance)",
    description: "Untuk .reminiv3, image enhancement",
    getConfig: () => config.deepai?.apiKey || "",
    getEnv: () => process.env.DEEPAI_API_KEY || "",
    getLink: () => "https://deepai.org/api",
    usedBy: ["reminiv3"],
  },
  clipdrop: {
    label: "ClipDrop (Watermark Remover)",
    description: "Untuk .nowm, watermark removal",
    getConfig: () => config.aiHelp?.clipdropApiKey || config.clipdropApiKey || "",
    getEnv: () => process.env.CLIPDROP_API_KEY || "",
    getLink: () => "https://clipdrop.co/apis",
    usedBy: ["nowm"],
  },

  // ── THIRD-PARTY API ───────────────────────────
  groq: {
    label: "Groq (Fast STT + Chat)",
    description: "Untuk transkripsi voice note cepat + otak chat AI Call (gpt-oss-20b)",
    getConfig: () => config.APIkey?.groq || "",
    getEnv: () => process.env.GROQ_API_KEY || "",
    getLink: () => "https://console.groq.com/keys",
    usedBy: ["stt", "aiautointeractionvn", "aicall", "groq"],
  },
  router9v2: {
    label: "9Router V2 Cloud (hosted)",
    description: "Gateway OpenAI-compatible 9router.cloudku.us.kg — chat multi-model (.ai9v2)",
    getConfig: () => config.APIkey?.router9v2 || "",
    getEnv: () => process.env.ROUTER_API_KEY || "",
    getLink: () => getTioBase(), // satu pintu env-loader (bisa 9router lokal)
    usedBy: ["ai9v2", "9routerv2"],
  },
  xai: {
    label: "xAI Grok (AI Call Otak Utama)",
    description: "Untuk otak percakapan AI Call (grok-3-mini) + fitur .grok satuan",
    getConfig: () => config.APIkey?.xai || "",
    getEnv: () => process.env.XAI_API_KEY || "",
    getLink: () => "https://console.x.ai",
    usedBy: ["aicall", "grok"],
  },
  grok: {
    label: "Grok (alias xAI)",
    description: "Alias xAI Grok — sama dengan key xai (pusat apikeys.json providers.grok)",
    getConfig: () => config.APIkey?.xai || config.APIkey?.grok || "",
    getEnv: () => process.env.XAI_API_KEY || process.env.GROK_API || "",
    getLink: () => "https://console.x.ai",
    usedBy: ["aicall", "grok"],
  },
  google: {
    label: "Google (Search/CSE)",
    description: "Untuk Google Custom Search",
    getConfig: () => config.APIkey?.google || "",
    getEnv: () => process.env.GOOGLE_API_KEY || "",
    getLink: () => "https://console.cloud.google.com/apis/credentials",
    usedBy: ["googlesearch"],
  },
  lolhuman: {
    label: "LolHuman API",
    description: "Berbagai endpoint API Indonesia",
    getConfig: () => config.APIkey?.lolhuman || "",
    getEnv: () => process.env.LOLHUMAN_API_KEY || "",
    getLink: () => "https://api.lolhuman.xyz",
    usedBy: ["downloader", "stalker", "info"],
  },
  neoxr: {
    label: "Neoxr API",
    description: "API downloader & tools",
    getConfig: () => config.APIkey?.neoxr || "",
    getEnv: () => process.env.NEOXR_API_KEY || "",
    getLink: () => "https://api.neoxr.eu",
    usedBy: ["downloader"],
  },
  covenant: {
    label: "Covenant API",
    description: "API media & downloader",
    getConfig: () => config.APIkey?.covenant || "",
    getEnv: () => process.env.COVENANT_API_KEY || "",
    getLink: () => "https://covenant.sbs",
    usedBy: ["downloader"],
  },
  fgsi: {
    label: "FGSI API",
    description: "API Indonesia",
    getConfig: () => config.APIkey?.fgsi || "",
    getEnv: () => process.env.FGSI_API_KEY || "",
    getLink: () => "",
    usedBy: ["downloader"],
  },
  onlym: {
    label: "OnlyM API",
    description: "API media",
    getConfig: () => config.APIkey?.onlym || "",
    getEnv: () => process.env.ONLYM_API_KEY || "",
    getLink: () => "",
    usedBy: ["downloader"],
  },
  obscura: {
    label: "Obscura API",
    description: "API media & tools",
    getConfig: () => config.APIkey?.obscura || "",
    getEnv: () => process.env.OBSCURA_API_KEY || "",
    getLink: () => "",
    usedBy: ["downloader"],
  },
  firefly: {
    label: "Firefly API",
    description: "API Rara NextGen",
    getConfig: () => config.APIkey?.firefly || "",
    getEnv: () => process.env.FIREFLY_API_KEY || "",
    getLink: () => "",
    usedBy: ["downloader"],
  },
  cuki: {
    label: "Cuki API",
    description: "API media",
    getConfig: () => config.APIkey?.cuki || "",
    getEnv: () => process.env.CUKI_API_KEY || "",
    getLink: () => "",
    usedBy: ["downloader"],
  },

  // ── PTERODACTYL PANEL ─────────────────────────
  pterodactyl: {
    label: "Pterodactyl Panel",
    description: "Untuk create/manage server panel",
    getConfig: () => config.pterodactyl?.server1?.apikey || "",
    getEnv: () => process.env.PTERO_API_KEY || "",
    getLink: () => "",
    usedBy: ["cpanel", "addpanel"],
  },

  // ── ALIGHT MOTION ─────────────────────────────
  alightmotion: {
    label: "Alight Motion Premium",
    description: "Untuk .alightmotion preset export",
    getConfig: () => config.alightmotion?.token || "",
    getEnv: () => process.env.AM_TOKEN || "",
    getLink: () => "wa.me/6285348284121",
    usedBy: ["alightmotion"],
  },

  // ── ONEPUNYA REST API ────────────────────────
  // ── INWORLD AI (TTS/STT/LLM) ─────────────────
  inworld: {
    label: "Inworld AI (TTS 200+ bahasa, STT profil suara, LLM chat)",
    description: "Untuk .inworldtts .inworldvoice .inworldvoices .inworldstt .inworldchat",
    getConfig: () => config.inworld?.apiKey || "",
    getEnv: () => process.env.INWORLD_API_KEY || "",
    getLink: () => "https://platform.inworld.ai/api-keys",
    usedBy: ["inworldtts", "inworldvoice", "inworldvoices", "inworldstt", "inworldchat"],
  },
  onepunya: {
    label: "Onepunya API (31 endpoint: search/AI/TTS/downloader/hololive)",
    description: "Untuk .onepixiv .oneyts .oneytmusic .onedl .oneimg .onechat .onettts .hololive .hentaisearch dkk",
    getConfig: () => config.onepunya?.apiKey || "",
    getEnv: () => process.env.ONEPUNYA_API_KEY || "",
    getLink: () => "https://onepunya.qzz.io",
    usedBy: ["onepixiv", "oneyoutube", "onedl", "oneimage", "onephoto", "oneai", "onettts", "hololive", "onehentai"],
  },

  // ── KYIO REST API (opsional — free tier tanpa key) ──
  kyio: {
    label: "KyioAPI (330 endpoint: AI/downloader/tools/search)",
    description: "Untuk .kyiodeepseek .kyiogemini .kyiotiktok .kyioytdl .kyiobrat .kyioqrcode dkk — OPSIONAL: tanpa key jalan (free tier 10 RPM), dengan key 120 RPM + endpoint premium",
    getConfig: () => config.kyio?.apiKey || "",
    getEnv: () => process.env.KYIO_API_KEY || "",
    getLink: () => "https://api.kyio.web.id",
    usedBy: ["kyio", "kyioai", "kyiodl", "kyiotools", "kyiosearch", "kyioimage", "kyionews", "kyioislamic", "kyiomaker", "kyiofun", "kyiogames", "kyioinfo", "kyiomovie", "kyiotts"],
  },

  // ── EMAIL OTP ─────────────────────────────────
  emailOtp: {
    label: "Email OTP (SMTP)",
    description: "Untuk verifikasi email pendaftaran",
    getConfig: () => config.emailOtp?.user || "",
    getEnv: () => process.env.EMAILOTP_USER || "",
    getLink: () => "",
    usedBy: ["emailotp"],
  },

  // ── VEXFILE PPD (remote upload, staging tmpfiles) ──
  vexfile: {
    label: "VexFile (file host PPD — upload arsip/APK, bayar per download)",
    description: "Untuk .vexfile .vexfiles .vex .vexupload",
    getConfig: () => config.vexfile?.apiKey || "",
    getEnv: () => process.env.VEXFILES_API_KEY || "",
    getLink: () => "https://vexfile.com",
    usedBy: ["vexfile", "vexfiles", "vex", "vexupload"],
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get API key by name. Priority: runtime DB > config file > env variable
 * @param {string} name - Key name (e.g. "gemini", "openai", "deepai")
 * @returns {string} API key or empty string
 */
export function getApiKey(name) {
  try {
    const keyDef = API_KEYS[name];
    if (!keyDef) return "";

    // Priority 1: Runtime DB (set via .setkey command) — jangan sampai
    // db error (misal di test/import) ngeblok prioritas di bawahnya.
    try {
      const db = getDatabase();
      if (db.db.data?.apiKeys?.[name]) {
        return String(db.db.data.apiKeys[name]);
      }
    } catch {}

    // Priority 2: PUSAT apikeys.json (request owner 17 Sep 2026 — semua key
    // dipusatkan di src/lib/apikey/apikeys.json). Alias untuk nama registry
    // yang beda dengan nama field apikeys.json.
    const CENTER_ALIAS = {
      ampro: "amproFirebase",    // fitur.amproFirebase (firebase web key AlightMotion)
      gemini: "google",          // raraai.google (aistudio)
      clipdrop: "clipdropApiKey",
      groq: "groqkey",
      aiFallback: "fallbackApiKey",
      alightmotion: "alightMotionToken",
      openai: "openai",
      anthropic: "claude",
    };
    try {
      const flat = getApiKeys();
      const flatName = CENTER_ALIAS[name] || name;
      if (flat[flatName] && String(flat[flatName]).trim()) return String(flat[flatName]).trim();
    } catch {}

    // Priority 3: Config file
    const configKey = keyDef.getConfig();
    if (configKey && configKey.trim()) return configKey.trim();

    // Priority 3: Environment variable
    const envKey = keyDef.getEnv();
    if (envKey && envKey.trim()) return envKey.trim();

    return "";
  } catch {
    return "";
  }
}

/**
 * Check if API key exists
 * @param {string} name - Key name
 * @returns {boolean}
 */
export function hasApiKey(name) {
  return getApiKey(name).length > 0;
}

/**
 * Set API key at runtime (stored in DB, persists across restarts)
 * @param {string} name - Key name
 * @param {string} value - API key value
 * @returns {boolean} success
 */
export function setApiKey(name, value) {
  try {
    const db = getDatabase();
    if (!db.db.data.apiKeys) db.db.data.apiKeys = {};
    if (value && value.trim()) {
      db.db.data.apiKeys[name] = value.trim();
    } else {
      delete db.db.data.apiKeys[name];
    }
    db.db.write();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all API key statuses
 * @returns {Array} List of {name, label, hasKey, usedBy, link}
 */
export function getAllKeyStatus() {
  return Object.entries(API_KEYS).map(([name, def]) => ({
    name,
    label: def.label,
    description: def.description,
    hasKey: hasApiKey(name),
    usedBy: def.usedBy,
    link: def.getLink(),
  }));
}

/**
 * Get masked key (for display)
 * @param {string} name - Key name
 * @returns {string} Masked key or "Belum diisi"
 */
export function getMaskedKey(name) {
  const key = getApiKey(name);
  if (!key) return "Belum diisi";
  if (key.length <= 10) return key.slice(0, 4) + "****";
  return key.slice(0, 6) + "..." + key.slice(-4);
}
