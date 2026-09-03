// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-greeting.js — Ucapan pengenalan bot di menu/allmenu yang berubah
// tiap menu dimuat. Digenerate AI gratis (IkyyXD /ai/gemini — free, no
// apikey) supaya token DeepSeek gak kekuras. Prompt dibekali identitas
// & fitur bot biar kalimatnya gak nyasar. Fallback ucapan lokal kalau
// API mati/timeout.

import { getTimeGreeting } from "./nova-formatter.js";
import config from "../../config.js";

const IKY_AI_URL = "https://api.ikyyxd.my.id/ai/gemini";
const TIMEOUT_MS = 7000; // jangan bikin menu nunggu kelamaan
const DEDUPE_MS = 4000; // request paralel dalam 4s di-share (anti spam dobel)

let _last = { promise: null, at: 0 };

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
  // buang markdown (*bold* / _italic_) — gak mau simbol aneh di menu
  t = t.replace(/[*_~`]+/g, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  // max ±300 karakter — 2-3 kalimat pengenalan yang lengkap
  if (t.length > 300) t = t.slice(0, 300).trim();
  // tolak hasil yang gak masuk akal (terlalu pendek / cuma tanda baca)
  if (t.length < 20 || !/[a-zA-Z]/.test(t)) return null;
  return t;
}

// Identitas + fitur bot dibekali ke AI biar kalimatnya nyambung
// (semacam system prompt — IKY cuma punya 1 param text, jadi digabung)
function buildPrompt() {
  const botName = config.bot?.name || "Nova AI";
  return (
    `[IDENTITAS KAMU]\n` +
    `Kamu adalah ${botName}, bot WhatsApp serba bisa. ` +
    `JANGAN sebut pembuat/owner bot sama sekali.\n\n` +
    `[TUGAS]\n` +
    `Buat pengenalan diri 2-3 kalimat untuk membuka menu: sapa pengguna ` +
    `sesuai waktu ${timeOfDay()}, lalu jelaskan dengan runtut kegunaan ` +
    `fitur-fitur bot — contoh: download video/audio dari TikTok, YouTube, ` +
    `dan Instagram; bikin stiker dari gambar/video; ngobrol dan bikin gambar ` +
    `pakai AI; main game & RPG seru; convert media ke format apa pun; ` +
    `plus tools grup dan ratusan fitur lain. Variasikan fitur yang dijelaskan ` +
    `dan urutan kalimatnya di setiap jawaban. Bahasa Indonesia santai-ramah, ` +
    `total maksimal 45 kata, tanpa emoji, tanpa tanda kutip, tanpa markdown. ` +
    `PENTING: setiap jawaban WAJIB berbeda pola kalimatnya — jangan pakai ` +
    `pembuka "Selamat pagi/siang/sore/malam, aku/saya ${botName}" terus. ` +
    `Balas dengan pengenalannya saja.`
  );
}

async function fetchFromIky() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${IKY_AI_URL}?text=${encodeURIComponent(buildPrompt())}`;
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
 * Ucapan AI pengenalan bot untuk info section menu/allmenu.
 * Fresh tiap kali menu dimuat (biar berubah-ubah), tapi request
 * paralel dalam 4 detik di-share supaya gak spam API kalau
 * .menu + .allmenu kebuka bersamaan. Fallback ke ucapan lokal.
 */
export async function getAiGreeting() {
  const now = Date.now();
  // share hasil kalau ada request yang barusan jalan (≤4s lalu)
  if (_last.promise && now - _last.at < DEDUPE_MS) {
    const text = await _last.promise;
    if (text) return text;
  }
  const p = fetchFromIky().finally(() => {
    if (_last.promise === p) setTimeout(() => { if (_last.promise === p) _last = { promise: null, at: 0 }; }, DEDUPE_MS);
  });
  _last = { promise: p, at: now };
  const text = await p;
  if (text) return text;

  // API mati/timeout → ucapan lokal (Selamat Pagi 🌅 dst.)
  return getTimeGreeting();
}
