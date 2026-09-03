// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-greeting.js — Ucapan menu/allmenu yang berubah-ubah, digenerate AI gratis
// (IkyyXD /ai/gemini — free, no apikey) supaya token DeepSeek gak kekuras.
// Fallback ke getTimeGreeting() lokal kalau API mati/timeout.

import { getTimeGreeting } from "./nova-formatter.js";

const IKY_AI_URL = "https://api.ikyyxd.my.id/ai/gemini";
const CACHE_TTL = 30 * 60 * 1000; // refresh ucapan tiap 30 menit
const TIMEOUT_MS = 8000; // jangan bikin menu nunggu kelamaan

let _cache = { text: null, at: 0 };
let _inflight = null;

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return "pagi";
  if (h >= 10 && h < 15) return "siang";
  if (h >= 15 && h < 18) return "sore";
  return "malam";
}

function cleanResult(raw) {
  if (typeof raw !== "string") return null;
  let t = raw.trim()
    .replace(/^["'`\u201c\u2018]+|["'`\u201d\u2019]+$/g, "") // kutip di ujung
    .replace(/\s+/g, " ")
    .split("\n")[0]
    .trim();
  // buang kalimat pengantar model ("Berikut ucapan: ...")
  t = t.replace(/^(berikut|ini|ucapan|sapaan)[^:]{0,20}:\s*/i, "");
  // max ±90 karakter biar 1 baris di menu
  if (t.length > 90) t = t.slice(0, 90).trim();
  // tolak hasil yang gak masuk akal (terlalu pendek / cuma tanda baca)
  if (t.length < 5 || !/[a-zA-Z]/.test(t)) return null;
  return t;
}

async function fetchFromIky() {
  const prompt =
    `Buat SATU kalimat sapaan pembuka menu bot WhatsApp, bahasa Indonesia, ` +
    `santun dan ramah ke pengguna, sebut waktu ${timeOfDay()}, ` +
    `maksimal 12 kata, tanpa emoji, tanpa tanda kutip, tanpa kata "menu", ` +
    `variasi kalimatnya tiap jawaban. Balas dengan kalimatnya saja.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${IKY_AI_URL}?text=${encodeURIComponent(prompt)}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "NovaBot/1.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== true) return null;
    return cleanResult(json.result);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ucapan AI untuk info section menu/allmenu.
 * Cache 30 menit (biar "berubah-ubah" tapi gak spam API tiap .menu),
 * single-flight biar gak ada request dobel paralel,
 * fallback ke ucapan lokal kalau API mati.
 */
export async function getAiGreeting() {
  const now = Date.now();
  if (_cache.text && now - _cache.at < CACHE_TTL) return _cache.text;

  if (!_inflight) {
    _inflight = fetchFromIky().then((text) => {
      if (text) _cache = { text, at: Date.now() };
      _inflight = null;
      return text;
    });
  }
  const text = await _inflight;
  if (text) return text;

  // API mati/timeout → ucapan lokal (Selamat Pagi 🌅 dst.)
  return getTimeGreeting();
}

/** Test helper — reset cache */
export function resetGreetingCache() {
  _cache = { text: null, at: 0 };
}
