// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-i18n.js — Translation layer untuk UI bot
// Translate semua teks UI (menu, allmenu, tombol, response command) ke bahasa user
// ENGINE (owner 10 Okt 2026: "jgn pakai google translate, cari api translate
// gratis yg bisa ribuan karakter"): MyMemory API — gratis, keyless, kuat buat
// ribuan karakter via batching per-baris (limit 500 chars/request diakali join
// beberapa baris pakai separator §). Cache PERMANEN per bahasa di DB — menu/
// allmenu itu teks statis, cukup sekali translate per bahasa, abis itu bebas
// kuota walau .menu dipanggil ribuan kali.
// + static dictionary untuk common phrases (tetap jalan tanpa API)
import { createHash } from "node:crypto";
import { SUPPORTED_LANGUAGES, getUserLanguage } from "./rara-language.js";
import { getDatabase } from "./rara-database.js";

// ── UN-SMALLCAPS (fix 18 Sep 2026, owner: "yg keubah cm caption doang") ──
// RaraWrap/menu kebentuk SMALLCAPS Unicode (fitur menu...) SEBELUM nyampe
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

// ═══════════════════════════════════════════════════════════════════
// ENGINE: MyMemory API (api.mymemory.translated.net) — gratis, keyless.
// Limit: 500 chars/request + GAK TERIMA multi-baris (newline → null).
// Strategi buat menu/allmenu ribuan karakter:
//   1. Pecah per-baris; baris tanpa huruf (box drawing ╭─╰√『』, angka,
//      kosong) di-skip (gak makan kuota, struktur kartu utuh 100%).
//   2. Gabung beberapa baris per-request pakai separator " § " sel total
//      ≤ MM_MAX_BATCH (mock & live test: § selamat bolak-balik).
//   3. Split balik per-baris; jumlah part gak nyambung → batch dibuang
//      (jangan nyelip hasil nyasar ke tengah kartu).
//   4. Retry 1x buat transient failure; batch gagal → baris asli tetap
//      tampil (gagal sebagian ≠ gagal semua).
//   5. Sanitize junk MyMemory <ex id="..."/> dari hasil TM match.
// ═══════════════════════════════════════════════════════════════════
const MM_URL = "https://api.mymemory.translated.net/get";
const MM_DE = "rara.bot.translate@gmail.com"; // param de = quota harian lebih besar
const MM_MAX_BATCH = 460; // safety < limit 500 chars/query
const MM_BATCH_SEP = " § ";
const MM_DELAY = 350; // jeda antar batch — anti rate-limit
const MM_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sanitizeMm(text) {
  return String(text)
    .replace(/<ex\b[^>]*\/?>/g, "") // junk TM match MyMemory
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function myMemoryOnce(q, targetLang, sourceLang = "id") {
  try {
    const url = `${MM_URL}?q=${encodeURIComponent(q)}&langpair=${sourceLang}|${targetLang}&de=${encodeURIComponent(MM_DE)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": MM_UA, Accept: "application/json, text/plain, */*" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (typeof out !== "string" || !out.trim()) return null;
    return sanitizeMm(out);
  } catch {
    return null;
  }
}

// ── PROTEKSI MARKUP (verifikasi LIVE 10 Okt): MyMemory polos itu:
//   • NGEBUGARIS box-drawing ("╭─────『 *Menu Utama* 』" → "Main menu" —
//     seluruh karakter kartu HILANG!)
//   • nyela bold ("*.menu*" → "*.menu *", "* .stiker*")
//   • nyanda karakter chip ("ᯓ" → "∞")
// Solusi: mask markup pakai placeholder {Pn} SEBELUM kirim, restore
// SETELAHNYA. Placeholder selamat round-trip MyMemory (live test).
// GLUE FLAGS: MT sering nyelip spasi di sekitar placeholder — saat restore,
// spasi kiri/kanan dipaksa ikut POSISI ASLI karakter (glued = tanpa spasi).
const MM_PROTECT_RE = /(https?:\/\/\S+)|([\u256d\u2570\u2502\u2500\u300e\u300f\u221a\u25aa\u1bd3*`_]+)/g;

function maskLine(line) {
  const parts = []; // { run, lg, rg } — lg/rg = glued (tanpa spasi) kiri/kanan
  // NOTE callback: (match, group1, group2, offset, string) — regex 2 group!
  const masked = String(line).replace(MM_PROTECT_RE, (run, _url, _chars, offset, full) => {
    const lg = offset > 0 && !/\s/.test(full[offset - 1]);
    const end = offset + run.length;
    const rg = end < full.length && !/\s/.test(full[end]);
    parts.push({ run, lg, rg });
    return "{P" + (parts.length - 1) + "}";
  });
  return { masked, parts };
}

function unmaskLine(text, parts) {
  return String(text).replace(/(\s*)\{\s*P(\d+)\s*\}(\s*)/g, (m, ls, numStr, rs) => {
    const p = parts[parseInt(numStr, 10)];
    if (!p) return m;
    const left = p.lg ? "" : ls; // glued kiri → buang spasi MT
    const right = p.rg ? "" : rs; // glued kanan → buang spasi MT
    return left + p.run + right;
  });
}

// Baris yang butuh API = punya huruf (Latin / Cyrillic / Arab / Asia).
// Baris box-drawing / angka / kosong → skip (hemat kuota, kartu utuh).
function lineNeedsApi(line) {
  return /[a-zA-Z\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(line);
}

async function myMemoryTranslate(text, targetLang, sourceLang = "id") {
  const lines = String(text).split("\n");
  const masked = {}; // lineIdx → { masked, parts }
  const idxNeed = [];
  lines.forEach((ln, i) => {
    if (lineNeedsApi(ln)) {
      masked[i] = maskLine(ln);
      idxNeed.push(i);
    }
  });
  if (!idxNeed.length) return null; // gak ada teks yang bisa ditranslate

  // group baris (versi MASKED) jadi batch ≤ MM_MAX_BATCH
  const batches = [];
  let cur = [], curLen = 0;
  for (const i of idxNeed) {
    const need = masked[i].masked.length + MM_BATCH_SEP.length;
    if (curLen + need > MM_MAX_BATCH && cur.length) { batches.push(cur); cur = []; curLen = 0; }
    cur.push(i);
    curLen += need;
  }
  if (cur.length) batches.push(cur);

  let changed = false;
  for (const batch of batches) {
    const q = batch.map((i) => masked[i].masked).join(MM_BATCH_SEP);
    let out = await myMemoryOnce(q, targetLang, sourceLang);
    if (!out) { await sleep(MM_DELAY); out = await myMemoryOnce(q, targetLang, sourceLang); }
    if (out) {
      const parts = out.split("§").map((x) => x.trim()).filter((x) => x !== "");
      if (parts.length === batch.length) {
        batch.forEach((lineIdx, j) => {
          const restored = unmaskLine(parts[j], masked[lineIdx].parts);
          lines[lineIdx] = restored;
          changed = true;
        });
      }
      // mismatch jumlah part → batch dibuang (jangan nyelip hasil nyasar)
    }
    await sleep(MM_DELAY); // jeda antar batch — anti rate-limit
  }
  return changed ? lines.join("\n") : null;
}

// ── Cache PERMANEN di DB (menu/allmenu statis → cukup sekali per bahasa) ──
const _persist = {}; // lang → { hash: translated }
export function __resetI18nForTest() {
  translationCache.clear();
  for (const k of Object.keys(_persist)) delete _persist[k];
}

function hashKey(text) {
  return createHash("sha1").update(String(text)).digest("hex").slice(0, 20);
}

function persistGet(text, lang) {
  try {
    if (!_persist[lang]) {
      const db = getDatabase();
      const stored = db.setting(`i18nPersist_${lang}`);
      _persist[lang] = stored && typeof stored === "object" ? stored : {};
    }
    return _persist[lang][hashKey(text)] || null;
  } catch {
    return null;
  }
}

function persistSet(text, lang, translated) {
  try {
    if (!_persist[lang]) {
      const db = getDatabase();
      const stored = db.setting(`i18nPersist_${lang}`);
      _persist[lang] = stored && typeof stored === "object" ? stored : {};
    }
    _persist[lang][hashKey(text)] = translated;
    const db = getDatabase();
    db.setting(`i18nPersist_${lang}`, { ..._persist[lang] });
    return true;
  } catch {
    return false;
  }
}

// Translate teks UI — pakai dictionary dulu, fallback ke Google Translate
export async function translateUI(text, sender) {
  try {
    const lang = getUserLanguage(sender);
    if (!lang || lang === "id") return text; // Indonesia = no translate

    const langInfo = SUPPORTED_LANGUAGES[lang];
    if (!langInfo) return text;

    // 0. UN-SMALLCAPS: menu/raraWrap nyampe sini udah kebentuk fitur —
    // balikin ke huruf biasa biar Google Translate kenali katanya.
    const plain = unSmallcaps(text);
    const wasSmallcaps = plain !== text;

    // 1. Coba dictionary dulu (cephal, gratis, no API) — pakai versi plain
    const dictResult = translateWithDictionary(plain, lang);
    if (dictResult !== plain) {
      return dictResult;
    }

    // 2. Cek cache memori (key = teks asli biar hit stabil)
    const cached = getCache(text, lang);
    if (cached) return cached;

    // 2b. Cache PERMANEN di DB — menu/allmenu statis: sekali translate per
    // bahasa, selamanya gak manggil API lagi walau .menu dipanggil terus.
    const persisted = persistGet(plain, lang);
    if (persisted) {
      setCache(text, lang, persisted);
      return persisted;
    }

    // 3. ENGINE: MyMemory (bukan Google — owner 10 Okt 2026). Kirim versi
    // PLAIN; batching per-baris + separator § di dalam engine, kuat buat
    // ribuan karakter (.menu/.allmenu) tanpa gagal senyap.
    const translated = await myMemoryTranslate(plain, lang, "id");

    if (translated && translated.trim()) {
      persistSet(plain, lang, translated.trim());
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

    // MyMemory (engine i18n, bukan Google) + proteksi markup
    const { masked, parts } = maskLine(label);
    let translated = await myMemoryOnce(masked, lang, "id");
    if (translated) translated = unmaskLine(translated, parts);
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
