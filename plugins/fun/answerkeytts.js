// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// answerkeytts.js — Kunci Jawaban TTS (Teka Teki Silang) Indonesia.
// Sumber: kunci-tts-api.vercel.app (nasrul21/kunci-tts-api, daftar farizdotid) — TANPA API KEY.
// .kuncijawabantts <pertanyaan tts> — misal ".kuncijawabantts tidak jujur"
// Riset 24 Sep 2026: param `question`, respon {title, total, answers:[{stars,word,clue}]},
// stars 1-5 (bintang = tingkat kecocokan). Plugin standalone + seam _setHttpForTest.
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const BASE = "https://kunci-tts-api.vercel.app/api/answers";

// ── SEAM TEST ──────────────────────────────────────────────
let _http = null; // async (url) => {status, data}
export function _setHttpForTest(fn) { _http = fn; }
export function _resetSeamsForTest() { _http = null; }

async function fetchJson(url) {
  if (_http) return _http(url);
  const res = await axios.get(url, {
    timeout: 30000, validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" },
  });
  return { status: res.status, data: res.data };
}

const stars = (n) => "★".repeat(Math.max(1, Math.min(5, Number(n) || 1))) + "☆".repeat(5 - Math.max(1, Math.min(5, Number(n) || 1)));

const pluginConfig = {
  name: "kuncijawabantts",
  alias: ["kuncijawabantts", "kuncitts", "kuncijawaban", "carikuncitts"],
  category: "fun",
  desc: "Kunci jawaban TTS (teki-teki silang) Indonesia — cari jawaban dari soalnya",
  usage: ".kuncijawabantts <soal tts>",
  example: ".kuncijawabantts tidak jujur",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  const soal = (m.text || (m.args || []).join(" ")).trim();
  if (!soal) {
    return m.reply(claraWrap("Kunci Jawaban TTS",
      "Cara pakai:\n.kuncijawabantts <soal tts>\n\nContoh:\n▸ .kuncijawabantts tidak jujur\n▸ .kuncijawabantts ibu kota jepang\n\n★ = tingkat kecocokan jawaban."));
  }
  try {
    const { status, data } = await fetchJson(`${BASE}?question=${encodeURIComponent(soal)}`);
    if (status !== 200 || !data) {
      return m.reply(claraWrap("Kunci Jawaban TTS", `❌ Server TTS bermasalah (${status}). Coba lagi nanti.`));
    }
    const answers = Array.isArray(data.answers) ? data.answers : [];
    if (!answers.length) {
      return m.reply(claraWrap("Kunci Jawaban TTS", `🔎 Gak ketemu kunci jawaban buat soal "${soal}". Coba kata kunci lain, misal potongan soalnya aja.`));
    }
    const list = answers.slice(0, 12).map((a, i) => {
      const kata = a.word || a.jawaban || "-";
      const petunjuk = a.clue ? ` — ${a.clue}` : "";
      return `${i + 1}. ${stars(a.stars)} ${String(kata).toUpperCase()}${petunjuk}`;
    }).join("\n");
    const total = data.total || answers.length;
    return m.reply(claraWrap("Kunci Jawaban TTS",
      `Soal: ${data.title || soal}\nDitemukan ${total} jawaban${total > 12 ? " (12 teratas)" : ""}:\n\n${list}\n\n★ bintang makin banyak = makin cocok.`));
  } catch (e) {
    return m.reply(claraWrap("Kunci Jawaban TTS", `❌ Gagal nyambung ke server TTS: ${e.message || e}`));
  }
}

export { handler, pluginConfig, pluginConfig as config };
export default handler;
