// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/lib/rara-translate-tools.js — engine translate NON-Google untuk tools
// (.transdoc / .transaudio / .transfoto) — pakai MyMemory yang sama dengan
// engine menu i18n (batching + proteksi markup + cache persist per bahasa).
// Replika native 4 tool EzAITranslate (ezaitranslate.com tanpa API publik,
// "Coming Soon" + Cloudflare challenge — gak bisa dipakai langsung, 10 Okt).

import { translateTextMyMemory } from "./rara-i18n.js";
import { translateTextHYMT, hasHyMtKey } from "./rara-hymt.js";

// ── normalisasi bahasa: kode + nama Indonesia umum ──
const LANG_ALIAS = {
  inggris: "en", english: "en", en: "en",
  indonesia: "id", indo: "id", id: "id",
  jawa: "jv", jv: "jv", jawa: "jv",
  sunda: "su", su: "su",
  arab: "ar", arabic: "ar", ar: "ar",
  jepang: "ja", jepang: "ja", japanese: "ja", ja: "ja",
  korea: "ko", korean: "ko", ko: "ko",
  cina: "zh-CN", china: "zh-CN", mandarin: "zh-CN", chinese: "zh-CN", zh: "zh-CN", "zh-cn": "zh-CN",
  spanyol: "es", spanish: "es", es: "es",
  perancis: "fr", prancis: "fr", french: "fr", fr: "fr",
  jerman: "de", german: "de", de: "de",
  rusia: "ru", russian: "ru", ru: "ru",
  melayu: "ms", malaysia: "ms", ms: "ms",
  thailand: "th", thai: "th", th: "th",
  vietnam: "vi", vi: "vi",
  hindi: "hi", hi: "hi",
  turki: "tr", turkish: "tr", tr: "tr",
  portugis: "pt", portuguese: "pt", pt: "pt",
  italia: "it", italian: "it", it: "it",
  belanda: "nl", dutch: "nl", nl: "nl",
};

/** Normalisasi input bahasa user → kode MyMemory (atau null kalau gak dikenal). */
export function normalizeLang(input) {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();
  // "en-US" / "en_US" → "en" (kecuali zh yang butuh region)
  if (raw.startsWith("zh")) return "zh-CN";
  const two = raw.replace(/[_-].*$/, "");
  return LANG_ALIAS[raw] || LANG_ALIAS[two] || (/^[a-z]{2}$/.test(two) ? two : null);
}

// ── ekstraksi teks dokumen (integration asli, no mock) ──

const MAX_TEXT_DEFAULT = 20000; // karakter teks per dokumen (owner bypass lewat isOwner di plugin)

/** Deteksi jenis dokumen dari nama file + mimetype. */
export function detectDocKind(fileName, mimetype) {
  const name = String(fileName || "").toLowerCase();
  const mime = String(mimetype || "").toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || mime.startsWith("text/")) return "text";
  if (name.endsWith(".docx") || mime.includes("officedocument.wordprocessingml") || mime.includes("msword")) return "docx";
  if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  return null;
}

/**
 * Ekstrak teks dari buffer dokumen (txt/md langsung, docx via mammoth, pdf via pdf-parse).
 * Returns { kind, text } — throw kalau gagal/gak didukung.
 */
export async function extractDocText(buffer, kind) {
  if (!buffer || !buffer.length) throw new Error("Dokumen kosong");
  if (kind === "text") {
    return { kind, text: buffer.toString("utf-8") };
  }
  if (kind === "docx") {
    const mammoth = (await import("mammoth")).default || (await import("mammoth"));
    const { value } = await mammoth.extractRawText({ buffer });
    return { kind, text: value || "" };
  }
  if (kind === "pdf") {
    // pdf-parse v2 (repo: 2.4.5) — class PDFParse + load() + getText(),
    // sama dengan pola plugins/tools/extracttext.js
    const mod = await import("pdf-parse");
    const PDFParse = mod.PDFParse || mod.default?.PDFParse;
    if (!PDFParse) throw new Error("Package pdf-parse belum terinstall");
    const parser = new PDFParse(new Uint8Array(buffer));
    await parser.load();
    const result = await parser.getText();
    const raw = typeof result === "string" ? result : (result?.text || "");
    // buang footer halaman "-- 1 of 1 --" bawaan pdf-parse
    return { kind, text: raw.replace(/--\s*\d+\s*(?:of|dari)\s*\d+\s*--/g, "").trim() };
  }
  throw new Error("Format dokumen tidak didukung");
}

/**
 * Translate teks bebas pakai engine MyMemory (batching + proteksi markup +
 * cache persist sama dengan menu i18n). Returns { translated, ok } —
 * ok=false artinya engine gagal total (teks asli dikembalikan).
 */
export async function translateTextFree(text, targetLang, sourceLang = "id") {
  const clean = String(text || "").trim();
  if (!clean) return { translated: "", ok: false };
  const tgt = normalizeLang(targetLang);
  if (!tgt || tgt === sourceLang) return { translated: clean, ok: false };
  // ENGINE CHAIN (owner 10 Okt 2026): HY-MT dulu (kelas Immersive Translate,
  // aktif kalau key siliconflow ada), fallback MyMemory.
  let out = null;
  if (hasHyMtKey()) {
    try { out = await translateTextHYMT(clean, tgt, sourceLang); } catch { out = null; }
  }
  if (!out) out = await translateTextMyMemory(clean, tgt, sourceLang);
  if (out && out.trim()) return { translated: out.trim(), ok: true };
  return { translated: clean, ok: false };
}

/** Statistik ringkas buat kartu hasil. */
export function textStats(text) {
  const t = String(text || "");
  return {
    chars: t.length,
    words: t.split(/\s+/).filter(Boolean).length,
    lines: t ? t.split("\n").length : 0,
  };
}

// seam test
export { MAX_TEXT_DEFAULT };
export function __resetTranslateToolsForTest() {
  // engine cache dibersihin via __resetI18nForTest di rara-i18n (gak ada state lokal)
}
