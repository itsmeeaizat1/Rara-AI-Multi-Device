// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-greeting.js — Ucapan pengenalan bot di menu/allmenu yang berubah
// tiap menu dimuat. Digenerate AI gratis (IkyyXD /ai/gemini — free, no
// apikey) supaya token DeepSeek gak kekuras. Prompt dibekali identitas
// & fitur bot biar kalimatnya gak nyasar. Fallback ucapan lokal kalau
// API mati/timeout.
//
// FIX 20 Sep 2026 (report owner, screenshot .menu jam 18.1x WIB tapi
// ucapan "Selamat Siang"):
// AKAR #1 — TIMEZONE: timeOfDay() lama pakai `new Date().getHours()`,
// itu JAM LOKAL PROSES SERVER (server bisa di UTC/zona lain — boot doctor
// nunjukin lokasi Singapore), BUKAN Asia/Jakarta. Jam 18.19 WIB (malam)
// kalau server jalan di UTC jadi 11.19 UTC (siang) → prompt AI dikasih
// instruksi "sapa sesuai waktu SIANG" yang SALAH. FIX: pakai
// timeHelper.getHour() dari rara-time.js (moment-timezone Asia/Jakarta),
// SAMA kayak getTimeGreeting() fallback.
// AKAR #2 — GAK VARIASI: prompt lama 100% deterministik antar-request
// (sama persis tiap timeOfDay gak ganti) → provider IKY (kemungkinan besar
// nge-cache/deterministic buat prompt identik) balikin jawaban IDENTIK
// walau dipanggil belasan detik kemudian. FIX: prompt dikasih nonce acak
// + subset fitur diacak & dirotasi tiap request → teks prompt SELALU beda
// per panggilan, provider gak punya alasan buat balikin jawaban sama.
// AKAR #3 — MENU LAMA MUNCUL (nunggu AI): dulu getAiGreeting() SELALU
// nunggu network (hingga TIMEOUT_MS) tiap kali dipanggil di luar window
// dedupe 4 detik → .menu/.allmenu jeda kerasa lama nunggu AI jawab.
// FIX: COOLDOWN_MS (revisi owner 20 Sep: 2 menit) — kalau ada cache (walau basi/stale), langsung
// BALIKIN cache itu ke menu (instan, gak nunggu) SAMBIL refresh AI di
// background buat panggilan BERIKUTNYA; cuma panggilan PERTAMA bot baru
// nyala yang bener2 nunggu network (gak ada cache sama sekali).

import { getTimeGreeting } from "./rara-formatter.js";
import * as timeHelper from "./rara-time.js";
import config from "../../config.js";

const IKY_AI_URL = "https://api.ikyyxd.my.id/ai/gemini";
const TIMEOUT_MS = 7000; // jangan bikin menu nunggu kelamaan (cuma dipakai first-load)
const COOLDOWN_MS = 120000; // REVISI OWNER 20 Sep: "jangan 10 detik terlalu cepat, ubah cooldown 2 menit aja" — refresh AI paling cepat tiap 2 MENIT, sisanya pakai cache instan

// module-level cache: teks terakhir + kapan didapat
let _cache = { text: null, at: 0 };
let _refreshing = null; // single-flight: cegah 2+ request network bersamaan

function timeOfDay() {
  const h = timeHelper.getHour(); // Asia/Jakarta — SAMA zona kayak getTimeGreeting()
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

const FEATURE_POOL = [
  "download video/audio dari TikTok, YouTube, dan Instagram",
  "bikin stiker otomatis dari gambar atau video",
  "ngobrol dan bikin gambar pakai AI",
  "main game dan RPG seru",
  "convert media ke format apa pun",
  "tools dan moderasi grup",
  "translate teks dan baca teks dari gambar",
  "cek cuaca dan info gempa real-time",
  "enhance/HD-in foto biar lebih jernih",
  "cari lirik lagu dan info anime",
];

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Identitas + fitur bot dibekali ke AI biar kalimatnya nyambung
// (semacam system prompt — IKY cuma punya 1 param text, jadi digabung).
// Nonce + subset fitur diacak SETIAP panggilan biar teks prompt gak
// pernah identik dua kali — provider gak punya alasan balikin jawaban sama.
function buildPrompt() {
  const botName = config.bot?.name || "Rara AI";
  const feats = shuffled(FEATURE_POOL).slice(0, 4).join("; ");
  const nonce = Math.random().toString(36).slice(2, 8);
  return (
    `[IDENTITAS KAMU]\n` +
    `Kamu adalah ${botName}, bot WhatsApp serba bisa. ` +
    `JANGAN sebut pembuat/owner bot sama sekali.\n\n` +
    `[TUGAS #${nonce}]\n` +
    `Buat pengenalan diri 2-3 kalimat untuk membuka menu: sapa pengguna ` +
    `sesuai waktu ${timeOfDay()} (WAJIB sesuai — jangan salah sebut waktu lain), ` +
    `lalu jelaskan dengan runtut kegunaan fitur bot. Contoh fitur yang bisa ` +
    `disebut (pilih & variasikan 3-4 saja, gak perlu semua, susun ulang urutannya): ` +
    `${feats}. Variasikan pola kalimat dan fitur yang dijelaskan tiap jawaban. ` +
    `Bahasa Indonesia santai-ramah, total maksimal 45 kata, tanpa emoji, tanpa ` +
    `tanda kutip, tanpa markdown. PENTING: setiap jawaban WAJIB berbeda pola ` +
    `kalimatnya — jangan pakai pembuka "Selamat pagi/siang/sore/malam, aku/saya ` +
    `${botName}" terus, variasikan pembukanya juga. Balas dengan pengenalannya saja.`
  );
}

let _greetingHttp; // seam: override fetch buat e2e (undefined = pakai global fetch asli)
export function _setGreetingHttpForTest(fn) { _greetingHttp = fn; }

async function fetchFromIky() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const prompt = buildPrompt();
    const url = `${IKY_AI_URL}?text=${encodeURIComponent(prompt)}`;
    const doFetch = _greetingHttp !== undefined ? _greetingHttp : fetch;
    const res = await doFetch(url, { signal: ctrl.signal, headers: { "User-Agent": "RaraBot/1.0" } });
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

// Fetch fresh + simpan ke cache. Single-flight: kalau udah ada refresh
// yang jalan, request baru numpang promise yang sama (gak nembak network 2x).
function refreshAndCache() {
  if (_refreshing) return _refreshing;
  const p = (async () => {
    const text = (await fetchFromIky()) || getTimeGreeting();
    _cache = { text, at: Date.now() };
    return text;
  })().finally(() => {
    if (_refreshing === p) _refreshing = null;
  });
  _refreshing = p;
  return p;
}

/**
 * Ucapan AI pengenalan bot untuk info section menu/allmenu.
  * COOLDOWN 2 MENIT (revisi owner 20 Sep): kalau ada cache (walau basi), langsung dibalikin
 * INSTAN (menu gak nunggu AI) sambil refresh jalan di background buat
 * panggilan berikutnya. Cuma panggilan pertama sejak bot nyala (belum
 * ada cache sama sekali) yang nunggu network. Fallback ke ucapan lokal
 * waktu-aware (getTimeGreeting) kalau API mati/timeout.
 */
export async function getAiGreeting() {
  const now = Date.now();
  const isFresh = _cache.text && now - _cache.at < COOLDOWN_MS;
  if (isFresh) return _cache.text;

  if (_cache.text) {
    // basi tapi ADA — balikin instan, refresh di background (gak diawait)
    refreshAndCache();
    return _cache.text;
  }

  // belum pernah ada cache sama sekali (baru boot) — wajib nunggu sekali
  return refreshAndCache();
}

// Seam buat testing: reset cache & single-flight state.
export function _resetGreetingCacheForTest() {
  _cache = { text: null, at: 0 };
  _refreshing = null;
}
