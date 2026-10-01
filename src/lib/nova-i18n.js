// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-i18n.js — Translation layer untuk UI bot
// Translate semua teks UI (menu, tombol, response command) ke bahasa user
// Pakai Google Translate API (gratis) + static dictionary untuk common phrases
import { SUPPORTED_LANGUAGES, getUserLanguage } from "./nova-language.js";

// ── UN-SMALLCAPS (fix 18 Sep 2026, owner: "yg keubah cm caption doang") ──
// ClaraWrap/menu kebentuk SMALLCAPS Unicode (fitur menu...) SEBELUM nyampe
// ke translateUI → Google Translate gak kenali glyph kecil itu → teks menu gak
// pernah ke-translate (caption media yang polos Latin ya ke-translate).
// Solusi: balikin dulu smallcaps → huruf biasa SEBELUM dikirim ke Google.
const UN_SC = {
  "\u1d00":"a","\u0299":"b","\u1d04":"c","\u1d05":"d","\u1d07":"e","\ua730":"f",
  "\u0262":"g","\u029c":"h","\u026a":"i","\u1d0a":"j","\u1d0b":"k","\u029f":"l",
  "\u1d0d":"m","\u0274":"n","\u1d0f":"o","\u1d18":"p","\u0280":"r","\ua731":"s",
  "\u1d1b":"t","\u1d1c":"u","\u1d20":"v","\u1d21":"w","\u028f":"y","\u1d1e":"z",
};
export function unSmallcaps(text) {
  let out = String(text || "");
  for (const [glyph, ascii] of Object.entries(UN_SC)) {
    out = out.split(glyph).join(ascii);
  }
  return out;
}

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
async function googleTranslateOnce(text, targetLang, sourceLang = "id") {
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

// FIX 19 Sep 2026 (owner: ".menu/.allmenu masih bahasa bawaan padahal
// caption fitur lain & tombol udah ke-translate"): teks .menu/.allmenu
// bisa ribuan karakter (info section + stats + server + weather) —
// endpoint gratis translate_a/single dirancang buat teks pendek, request
// SEKALI gagal (network hiccup / rate-limit sesaat) langsung nyerah →
// SELURUH menu balik ke bahasa asli senyap, padahal caption/button yang
// pendek (nyaris selalu sukses) kelihatan normal ke-translate. Retry 1x
// jeda singkat dulu SEBELUM nyerah — transient failure kebanyakan sukses
// di percobaan ke-2, teks pendek (button/caption) gak berubah perilaku.
async function googleTranslate(text, targetLang, sourceLang = "id") {
  const first = await googleTranslateOnce(text, targetLang, sourceLang);
  if (first) return first;
  await new Promise((r) => setTimeout(r, 350));
  return googleTranslateOnce(text, targetLang, sourceLang);
}

// Google Translate translate_a/single dirancang buat teks pendek —
// teks panjang (.menu/.allmenu bisa 1500-3000+ karakter dengan box-drawing
// + emoji + stats) beresiko gagal/terpotong di endpoint gratis ini. FIX:
// pecah jadi potongan per-baris (BUKAN potong tengah kalimat/baris — box
// drawing & emoji tetap utuh per baris), tiap potongan ≤ MAX_CHUNK karakter
// ditranslate terpisah lalu disambung balik pakai newline persis strukturnya.
const MAX_CHUNK = 1500;
function chunkLinesForTranslate(text, maxLen = MAX_CHUNK) {
  const lines = String(text).split("\n");
  const chunks = [];
  let cur = [];
  let curLen = 0;
  for (const line of lines) {
    const lineLen = line.length + 1; // +1 buat "\n" penyambung
    if (curLen + lineLen > maxLen && cur.length) {
      chunks.push(cur.join("\n"));
      cur = [];
      curLen = 0;
    }
    cur.push(line);
    curLen += lineLen;
  }
  if (cur.length) chunks.push(cur.join("\n"));
  return chunks;
}

// Translate teks UI — pakai dictionary dulu, fallback ke Google Translate
export async function translateUI(text, sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang || lang === "id") return text; // Indonesia = no translate

    const langInfo = SUPPORTED_LANGUAGES[lang];
    if (!langInfo) return text;

    // 0. UN-SMALLCAPS: menu/claraWrap nyampe sini udah kebentuk fitur —
    // balikin ke huruf biasa biar Google Translate kenali katanya.
    const plain = unSmallcaps(text);
    const wasSmallcaps = plain !== text;

    // 1. Coba dictionary dulu (cephal, gratis, no API) — pakai versi plain
    const dictResult = translateWithDictionary(plain, lang);
    if (dictResult !== plain) {
      return dictResult;
    }

    // 2. Cek cache (key = teks asli biar hit stabil)
    const cached = getCache(text, lang);
    if (cached) return cached;

    // 3. Fallback: Google Translate API (kirim versi PLAIN, bukan smallcaps).
    // Teks panjang (.menu/.allmenu) dipecah per-chunk biar gak gagal
    // senyap di endpoint gratis yang dirancang buat teks pendek.
    let translated = null;
    if (plain.length > MAX_CHUNK) {
      const chunks = chunkLinesForTranslate(plain);
      const results = await Promise.all(
        chunks.map((c) => googleTranslate(c, lang, "id")),
      );
      // kalau ADA chunk yang gagal, tetap gabung yang sukses + chunk asli
      // (plain) buat yang gagal — sebagian ke-translate > semua gagal senyap.
      const anyOk = results.some((r) => r && r.trim());
      if (anyOk) {
        translated = results
          .map((r, i) => (r && r.trim() ? r.trim() : chunks[i]))
          .join("\n");
      }
    } else {
      translated = await googleTranslate(plain, lang, "id");
    }

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
