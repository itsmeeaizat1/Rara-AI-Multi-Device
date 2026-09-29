// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// prayerfinder.js — Cari Doa Sehari-hari (30+ doa, fuzzy match, PELUASAN .doaharian offline).
// Sumber: doa-doa-api-ahmadramadhan.fly.dev (daftar farizdotid) — TANPA API KEY.
// .caridoa <nama doa> — misal ".caridoa sebelum makan" / ".caridoa makan" (fuzzy).
// Riset 24 Sep 2026: path /api/doa/<slug>, respon {id, doa, ayat, latin, artinya};
// nama gak persis → tetap ketemu (fuzzy); gak ketemu → {data:"", msg:"..."}.
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const BASE = "https://doa-doa-api-ahmadramadhan.fly.dev/api/doa";

// ── SEAM TEST ──────────────────────────────────────────────
let _http = null; // async (url) => {status, data}
export function _setHttpForTest(fn) { _http = fn; }
export function _resetSeamsForTest() { _http = null; }

async function fetchJson(url) {
  if (_http) return _http(url);
  const res = await axios.get(encodeURI(url), {
    timeout: 30000, validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" },
  });
  return { status: res.status, data: res.data };
}

const CONTOH = [
  "▸ .caridoa sebelum makan\n▸ .caridoa sesudah makan\n▸ .caridoa sebelum tidur\n▸ .caridoa bangun tidur",
  "▸ .caridoa masuk kamar mandi\n▸ .caridoa memakai pakaian\n▸ .caridoa bepergian\n▸ .caridoa masuk masjid",
].join("\n");

const pluginConfig = {
  name: "caridoa",
  alias: ["caridoa", "doadoa", "doacari"],
  category: "islami",
  desc: "Cari doa sehari-hari (30+ doa, fuzzy match) — pelengkap .doaharian",
  usage: ".caridoa <nama doa>",
  example: ".caridoa sebelum makan",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  const nama = (m.text || (m.args || []).join(" ")).trim();
  if (!nama) {
    return m.reply(claraWrap("Cari Doa",
      `Cara pakai:\n.caridoa <nama doa>\n\nContoh:\n${CONTOH}\n\nNama gak harus persis — cukup kata kuncinya (misal "makan").`));
  }
  try {
    const { status, data } = await fetchJson(`${BASE}/${nama}`);
    if (status !== 200 || !data) {
      return m.reply(claraWrap("Cari Doa", `❌ Server doa bermasalah (${status}). Coba lagi nanti.`));
    }
    if (Array.isArray(data)) {
      // respon gak-ketemu: [{data:"", msg:"..."}]
      const msg = data[0]?.msg || "gak ketemu";
      return m.reply(claraWrap("Cari Doa", `🔎 Doa "${nama}" gak ketemu. ${msg}\n\nCoba kata kunci lain, misal:\n${CONTOH}`));
    }
    if (!data.ayat) {
      return m.reply(claraWrap("Cari Doa", `🔎 Doa "${nama}" gak ketemu. Coba kata kunci lain (misal "makan", "tidur", "masjid").`));
    }
    return m.reply(claraWrap("Cari Doa",
      `${data.doa || "Doa"}\n\n${data.ayat}\n\n"${data.latin || ""}"\n\nArtinya: ${data.artinya || "-"}`));
  } catch (e) {
    return m.reply(claraWrap("Cari Doa", `❌ Gagal nyambung ke server doa: ${e.message || e}`));
  }
}

export { handler, pluginConfig, pluginConfig as config };
export default handler;
