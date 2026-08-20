// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-i18n.js — Translation layer untuk UI bot
// Translate semua teks UI (menu, tombol, response command) ke bahasa user
// Pakai Google Translate API (gratis) + static dictionary untuk common phrases
import { SUPPORTED_LANGUAGES, getUserLanguage } from "./nova-language.js";

// Cache translation biar gak panggil API berulang untuk text yang sama
const translationCache = new Map();
const CACHE_MAX = 500;

// Static dictionary untuk UI phrases yang sering muncul (cephal, no API call)
const UI_DICTIONARY = {
  "Kembali": {
    en: "Back", ar: "رجوع", zh: "返回", ja: "戻る", ko: "뒤로",
    es: "Volver", fr: "Retour", de: "Zurück", pt: "Voltar", ru: "Назад",
    hi: "वापस", th: "กลับ", vi: "Quay lại", tr: "Geri", it: "Indietro",
    nl: "Terug", ms: "Kembali", fil: "Bumalik", ur: "واپس",
  },
  "Tanya AI": {
    en: "Ask AI", ar: "اسأل الذكاء الاصطناعي", zh: "问AI", ja: "AIに聞く", ko: "AI에게 묻기",
    es: "Preguntar AI", fr: "Demander à l'IA", de: "KI fragen", pt: "Perguntar à IA", ru: "Спросить ИИ",
    hi: "AI से पूछें", th: "ถาม AI", vi: "Hỏi AI", tr: "AI'ya Sor", it: "Chiedi all'IA",
    nl: "Vraag AI", ms: "Tanya AI", fil: "Tanungin ang AI", ur: "AI سے پوچھیں",
  },
  "AKTIF": {
    en: "ACTIVE", ar: "نشط", zh: "活跃", ja: "アクティブ", ko: "활성",
    es: "ACTIVO", fr: "ACTIF", de: "AKTIV", pt: "ATIVO", ru: "АКТИВ",
    hi: "सक्रिय", th: "ใช้งาน", vi: "HOẠT ĐỘNG", tr: "AKTİF", it: "ATTIVO",
    nl: "ACTIEF", ms: "AKTIF", fil: "AKTIBO", ur: "فعال",
  },
  "NONAKTIF": {
    en: "INACTIVE", ar: "غير نشط", zh: "未激活", ja: "非アクティブ", ko: "비활성",
    es: "INACTIVO", fr: "INACTIF", de: "INAKTIV", pt: "INATIVO", ru: "НЕАКТИВ",
    hi: "निष्क्रिय", th: "ไม่ใช้งาน", vi: "TẮT", tr: "PASİF", it: "INATTIVO",
    nl: "INACTIEF", ms: "TIDAK AKTIF", fil: "HINDI AKTIBO", ur: "غیر فعال",
  },
  "Status": {
    en: "Status", ar: "الحالة", zh: "状态", ja: "ステータス", ko: "상태",
    es: "Estado", fr: "Statut", de: "Status", pt: "Status", ru: "Статус",
    hi: "स्थिति", th: "สถานะ", vi: "Trạng thái", tr: "Durum", it: "Stato",
    nl: "Status", ms: "Status", fil: "Status", ur: "حالت",
  },
  "Total": {
    en: "Total", ar: "المجموع", zh: "总计", ja: "合計", ko: "합계",
    es: "Total", fr: "Total", de: "Gesamt", pt: "Total", ru: "Всего",
    hi: "कुल", th: "รวม", vi: "Tổng", tr: "Toplam", it: "Totale",
    nl: "Totaal", ms: "Jumlah", fil: "Kabuuan", ur: "کل",
  },
  "Error": {
    en: "Error", ar: "خطأ", zh: "错误", ja: "エラー", ko: "오류",
    es: "Error", fr: "Erreur", de: "Fehler", pt: "Erro", ru: "Ошибка",
    hi: "त्रुटि", th: "ข้อผิดพลาด", vi: "Lỗi", tr: "Hata", it: "Errore",
    nl: "Fout", ms: "Ralat", fil: "Mali", ur: "غلطی",
  },
};

// Translate UI phrase pakai dictionary (cephal & gratis)
function translateWithDictionary(text, lang) {
  // Cek exact match di dictionary
  if (UI_DICTIONARY[text] && UI_DICTIONARY[text][lang]) {
    return UI_DICTIONARY[text][lang];
  }

  // Cek kata-kata individual dalam text
  let result = text;
  let changed = false;
  for (const [indoPhrase, translations] of Object.entries(UI_DICTIONARY)) {
    if (translations[lang]) {
      const regex = new RegExp(`\\b${indoPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      if (regex.test(result)) {
        result = result.replace(regex, translations[lang]);
        changed = true;
      }
    }
  }

  return changed ? result : text;
}

// Cek cache
function getCache(text, lang) {
  const key = `${lang}::${text}`;
  return translationCache.get(key) || null;
}

// Simpan cache
function setCache(text, lang, translated) {
  const key = `${lang}::${text}`;
  if (translationCache.size >= CACHE_MAX) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(key, translated);
}

// Google Translate API (gratis, no API key needed)
// Endpoint: translate.googleapis.com/translate_a/single
async function googleTranslate(text, targetLang, sourceLang = "id") {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Google Translate return nested array: [[[translatedText, originalText, ...], ...], ...]
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

    // Gabung semua chunk translated text
    let translated = "";
    for (const chunk of data[0]) {
      if (chunk && chunk[0]) translated += chunk[0];
    }

    return translated || null;
  } catch {
    return null;
  }
}

// Translate teks UI — pakai dictionary dulu, fallback ke Google Translate
export async function translateUI(text, sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang || lang === "id") return text; // Indonesia = no translate

    const langInfo = SUPPORTED_LANGUAGES[lang];
    if (!langInfo) return text;

    // 1. Coba dictionary dulu (cephal, gratis, no API)
    const dictResult = translateWithDictionary(text, lang);
    if (dictResult !== text) {
      return dictResult;
    }

    // 2. Cek cache
    const cached = getCache(text, lang);
    if (cached) return cached;

    // 3. Fallback: Google Translate API
    const translated = await googleTranslate(text, lang, "id");

    if (translated && translated.trim()) {
      const cleanResult = translated.trim();
      setCache(text, lang, cleanResult);
      return cleanResult;
    }

    return text; // Gagal translate = return original
  } catch {
    return text;
  }
}

// Translate button labels (pakai dictionary only, cepat & sync)
export function translateButton(label, sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang || lang === "id") return label;

    // Cek dictionary
    if (UI_DICTIONARY[label] && UI_DICTIONARY[label][lang]) {
      return UI_DICTIONARY[label][lang];
    }

    // Cek cache untuk button labels yang pernah di-translate
    const cached = getCache(label, lang);
    if (cached) return cached;

    return label; // Fallback ke original
  } catch {
    return label;
  }
}

// Pre-translate button labels asynchronously (biar cache ke-isi untuk next call)
export async function preTranslateButton(label, sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang || lang === "id") return label;

    // Dictionary dulu
    if (UI_DICTIONARY[label] && UI_DICTIONARY[label][lang]) {
      return UI_DICTIONARY[label][lang];
    }

    // Cek cache
    const cached = getCache(label, lang);
    if (cached) return cached;

    // Google Translate
    const translated = await googleTranslate(label, lang, "id");
    if (translated && translated.trim()) {
      setCache(label, lang, translated.trim());
      return translated.trim();
    }

    return label;
  } catch {
    return label;
  }
}

// Cek apakah user punya language preference (bukan Indonesia)
export function needsTranslation(sender) {
  try {
    const lang = getUserLanguage(sender);
    return lang && lang !== "id";
  } catch {
    return false;
  }
}

export { UI_DICTIONARY };
