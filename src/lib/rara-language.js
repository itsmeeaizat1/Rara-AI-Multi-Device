// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Multi-Language Engine — Auto translate AI response ke bahasa user
// DEFAULT: OFF — Bahasa Indonesia murni, no translation
// User harus explicit set .languagemenubot <code> untuk aktif
// Owner bisa matikan seluruh fitur via db.setting("multiLangEnabled", false)
import { getDatabase } from "../../src/lib/rara-database.js";

// Bahasa yang didukung
const SUPPORTED_LANGUAGES = {
  id: { name: "Indonesia", native: "Bahasa Indonesia", code: "id", flag: "ID" },
  en: { name: "English", native: "English", code: "en", flag: "US" },
  ar: { name: "Arabic", native: "العربية", code: "ar", flag: "SA" },
  zh: { name: "Chinese", native: "中文", code: "zh", flag: "CN" },
  ja: { name: "Japanese", native: "日本語", code: "ja", flag: "JP" },
  ko: { name: "Korean", native: "한국어", code: "ko", flag: "KR" },
  es: { name: "Spanish", native: "Español", code: "es", flag: "ES" },
  fr: { name: "French", native: "Français", code: "fr", flag: "FR" },
  de: { name: "German", native: "Deutsch", code: "de", flag: "DE" },
  pt: { name: "Portuguese", native: "Português", code: "pt", flag: "PT" },
  ru: { name: "Russian", native: "Русский", code: "ru", flag: "RU" },
  hi: { name: "Hindi", native: "हिन्दी", code: "hi", flag: "IN" },
  th: { name: "Thai", native: "ไทย", code: "th", flag: "TH" },
  vi: { name: "Vietnamese", native: "Tiếng Việt", code: "vi", flag: "VN" },
  tr: { name: "Turkish", native: "Türkçe", code: "tr", flag: "TR" },
  it: { name: "Italian", native: "Italiano", code: "it", flag: "IT" },
  nl: { name: "Dutch", native: "Nederlands", code: "nl", flag: "NL" },
  ms: { name: "Malay", native: "Bahasa Melayu", code: "ms", flag: "MY" },
  fil: { name: "Filipino", native: "Filipino", code: "fil", flag: "PH" },
  ur: { name: "Urdu", native: "اردو", code: "ur", flag: "PK" },
};

// Cek apakah master toggle ON (owner bisa matikan seluruh fitur)
// Default: false (OFF) — Indonesia murni, no translation
export function isMultiLangEnabled() {
  try {
    const db = getDatabase();
    return db.setting("multiLangEnabled") === true;
  } catch {
    return false; // Default OFF
  }
}

// Cek bahasa user
export function getUserLanguage(sender) {
  try {
    // Master toggle OFF = gak ada translation sama sekali
    if (!isMultiLangEnabled()) return null;

    if (!sender) return null;
    const db = getDatabase();
    const uid = sender.replace(/@.+/g, "");
    // Simpan di settings store: key = "userLang_<uid>"
    const lang = db.setting("userLang_" + uid);
    return lang || null; // null = belum set = Indonesia default
  } catch {
    return null;
  }
}

// Cek apakah multi-language aktif untuk user ini
export function isLanguageEnabled(sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang) return false;
    if (lang === "id") return false; // Indonesia = default, gak perlu translate
    return true;
  } catch {
    return false;
  }
}

// Inject language instruction ke systemPrompt (callAI)
export function getLanguagePrompt(sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang || lang === "id") return "";

    const langInfo = SUPPORTED_LANGUAGES[lang];
    if (!langInfo) return "";

    return `\n\n[LANGUAGE INSTRUCTION: User has set their preferred language to ${langInfo.name} (${langInfo.native}). You MUST respond ENTIRELY in ${langInfo.name}. Do NOT use Indonesian or any other language. All explanations, instructions, menus, and responses must be in ${langInfo.name}. If the user writes in a different language, still respond in ${langInfo.name}.]`;
  } catch {
    return "";
  }
}

// Set bahasa user
export function setUserLanguage(sender, langCode) {
  try {
    if (!sender) return false;
    const db = getDatabase();
    const uid = sender.replace(/@.+/g, "");
    const key = "userLang_" + uid;

    if (langCode === null) {
      // Reset ke default (Indonesia) = hapus preference
      db.setting(key, "id");
    } else {
      db.setting(key, langCode);
    }

    db.save();
    return true;
  } catch {
    return false;
  }
}

// Get info lengkap bahasa user
export function getUserLanguageInfo(sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang) return null;
    return SUPPORTED_LANGUAGES[lang] || null;
  } catch {
    return null;
  }
}

// Get semua bahasa yang didukung
export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

export { SUPPORTED_LANGUAGES };
