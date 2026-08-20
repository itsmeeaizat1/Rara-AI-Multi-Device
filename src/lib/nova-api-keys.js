// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════
// CENTRAL API KEYS — SATU TEMPAT BUAT SEMUA API KEY
// ═══════════════════════════════════════════════════════════════
// Cara pakai di plugin:
//   import { getApiKey, hasApiKey } from "../../src/lib/nova-api-keys.js";
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
import { getDatabase } from "./nova-database.js";

// ═══════════════════════════════════════════════════════════════
// DEFINISI SEMUA API KEY
// Urutan prioritas: runtime DB > file config > env variable
// ═══════════════════════════════════════════════════════════════

export const API_KEYS = {
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
    label: "Groq (Fast STT)",
    description: "Untuk transkripsi voice note cepat",
    getConfig: () => config.APIkey?.groq || "",
    getEnv: () => process.env.GROQ_API_KEY || "",
    getLink: () => "https://console.groq.com/keys",
    usedBy: ["stt", "aiautointeractionvn"],
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
  betabotz: {
    label: "BetaBotz API",
    description: "API downloader & tools",
    getConfig: () => config.APIkey?.betabotz || "",
    getEnv: () => process.env.BETABOTZ_API_KEY || "",
    getLink: () => "",
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
    description: "API Nova NextGen",
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

  // ── EMAIL OTP ─────────────────────────────────
  emailOtp: {
    label: "Email OTP (SMTP)",
    description: "Untuk verifikasi email pendaftaran",
    getConfig: () => config.emailOtp?.user || "",
    getEnv: () => process.env.EMAILOTP_USER || "",
    getLink: () => "",
    usedBy: ["emailotp"],
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

    // Priority 1: Runtime DB (set via .setkey command)
    const db = getDatabase();
    if (db.db.data?.apiKeys?.[name]) {
      return String(db.db.data.apiKeys[name]);
    }

    // Priority 2: Config file
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
