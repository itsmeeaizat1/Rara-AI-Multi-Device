// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// dzikir.js — Dzikir Pagi, Petang, Doa Harian, Doa Pilihan, Dzikir Setelah Shalat.
// UPGRADE 24 Sep 2026: API-first via dua-dhikr.vercel.app (fitrahive/dua-dhikr, daftar
// farizdotid, TANPA API KEY) — teks arab LENGKAP (19 pagi + 19 petang + 38 doa harian +
// 8 pilihan + 13 setelah shalat), latin, terjemahan, jumlah bacaan, keutamaan + sumber hadis.
// GOTCHA: server baca header Accept-Language (Fastify request.languages()) — WAJIB "id" polos.
// Data offline lama tetap ada sebagai FALLBACK kalau API down (arab kepotong "...").
import axios from "axios";
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const DZIKIR_API = "https://dua-dhikr.vercel.app";

// ── SEAM TEST ──────────────────────────────────────────────
let _http = null; // async (url) => {status, data}
export function _setHttpForTest(fn) { _http = fn; }
export function _resetSeamsForTest() { _http = null; }

async function fetchJson(url) {
  if (_http) return _http(url);
  const res = await axios.get(url, {
    timeout: 40000, validateStatus: () => true,
    headers: { "Accept-Language": "id" },
  });
  return { status: res.status, data: res.data };
}

const KATEGORI = {
  pagi: { slug: "morning-dhikr", judul: "Dzikir Pagi", offline: "pagi" },
  petang: { slug: "evening-dhikr", judul: "Dzikir Petang", offline: "petang" },
  doa: { slug: "daily-dua", judul: "Doa Harian", offline: null },
  pilihan: { slug: "selected-dua", judul: "Doa Pilihan", offline: null },
  shalat: { slug: "dhikr-after-salah", judul: "Dzikir Setelah Shalat", offline: null },
};

const DZIKIR_PAGI = [
  { nama: "Ayat Kursi", arab: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...", latin: "Allaahu laa ilaaha illaa huwal hayyul qayyuum...", jumlah: "1x", keutamaan: "Siapa baca pagi, dilindungi dari segala gangguan sampai sore" },
  { nama: "Al-Ikhlas, Al-Falaq, An-Nas", arab: "Qul huwallaahu ahad... | Qul a'udzu birabbil falaq... | Qul a'udzu birabbin naas...", latin: "(3 surah pendek)", jumlah: "3x masing-masing", keutamaan: "Pelindung dari segala kejahatan dan gangguan" },
  { nama: "Doa Pagi", arab: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", latin: "Ashbahnaa wa ashbahal mulku lillaah, walhamdulillaah, laa ilaaha illallaahu wahdahu laa syariika lah", jumlah: "1x", keutamaan: "Pengakuan bahwa kerajaan hanya milik Allah di waktu pagi" },
  { nama: "Doa Kebaikan Pagi", arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ", latin: "Allaahumma innii as'aluka khaira haadzal yaum: fathahu wa nashrahu wa nuruhi wa barakatuhu wa hudaah", jumlah: "1x", keutamaan: "Memohon kebaikan hari ini: kemenangan, cahaya, dan keberkahan" },
  { nama: "Doa Perlindungan", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana 'abduk, wa ana 'alaa 'ahdika wa wa'dika mastatha't", jumlah: "1x", keutamaan: "Siapa baca pagi lalu mati hari itu, masuk surga" },
  { nama: "Sayyidul Istighfar", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta khalaqtanii wa ana 'abduk... (baca lengkap)", jumlah: "1x", keutamaan: "Siapa baca dengan yakin pagi/petang lalu mati, masuk surga" },
  { nama: "Tasbih, Tahmid, Takbir", arab: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", latin: "Subhaanallaahi wa bihamdih (100x)", jumlah: "100x", keutamaan: "Dihapus dosanya walaupun sebanyak buih di lautan" },
  { nama: "La ilaaha illallah", arab: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamdu wa huwa 'alaa kulli syai'in qadiir (10x/100x)", jumlah: "10x atau 100x", keutamaan: "Setara dengan memerdekakan budak, dicatat 100 kebaikan, dihapus 100 dosa" },
  { nama: "Doa Hasan Basri", arab: "اللَّهُمَّ عَافِنِي فِي بَدَنِي", latin: "Allaahumma 'aafinii fi badanii, 'aafinii fi sam'ii, 'aafinii fii basharii, laa ilaaha illaa ant (3x)", jumlah: "3x", keutamaan: "Memohon kesehatan fisik, pendengaran, dan penglihatan" },
  { nama: "Doa Kecemasan", arab: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ", latin: "Hasbiyallaahu laa ilaaha illaa huwa 'alaihi tawakkaltu wa huwa rabbul 'arsyil 'azhiim (7x)", jumlah: "7x", keutamaan: "Cukup atas segala kecemasan, Allah yang menanggung urusannya" },
];

const DZIKIR_PETANG = [
  { nama: "Ayat Kursi", arab: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...", latin: "Allaahu laa ilaaha illaa huwal hayyul qayyuum...", jumlah: "1x", keutamaan: "Siapa baca sore, dilindungi sampai pagi" },
  { nama: "Al-Ikhlas, Al-Falaq, An-Nas", arab: "Qul huwallaahu ahad... | Qul a'udzu birabbil falaq... | Qul a'udzu birabbin naas...", latin: "(3 surah pendek)", jumlah: "3x masing-masing", keutamaan: "Pelindung dari gangguan jin dan setan malam hari" },
  { nama: "Doa Sore", arab: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ", latin: "Amsainaa wa amsal mulku lillaah, walhamdulillaah, laa ilaaha illallaahu wahdahu laa syariika lah", jumlah: "1x", keutamaan: "Pengakuan kerajaan Allah di waktu sore" },
  { nama: "Doa Kebaikan Sore", arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ", latin: "Allaahumma innii as'aluka khaira haadzihil lailah: fathahu wa nashrahu wa nuruhi wa barakatuhu", jumlah: "1x", keutamaan: "Memohon kebaikan malam ini" },
  { nama: "Doa Perlindungan", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana 'abduk (baca lengkap)", jumlah: "1x", keutamaan: "Siapa baca sore lalu mati malam itu, masuk surga" },
  { nama: "Sayyidul Istighfar", arab: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ", latin: "Allaahumma anta rabbii laa ilaaha illaa anta khalaqtanii wa ana 'abduk... (baca lengkap)", jumlah: "1x", keutamaan: "Syurga bagi yang baca dengan yakin" },
  { nama: "Tasbih", arab: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", latin: "Subhaanallaahi wa bihamdih (100x)", jumlah: "100x", keutamaan: "Dihapus dosa sebanyak buih di lautan" },
  { nama: "Doa Hasan Basri", arab: "اللَّهُمَّ عَافِنِي فِي بَدَنِي", latin: "Allaahumma 'aafinii fi badanii, 'aafinii fi sam'ii, 'aafinii fii basharii (3x)", jumlah: "3x", keutamaan: "Memohon kesehatan menjelang malam" },
  { nama: "Doa Kecemasan", arab: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ", latin: "Hasbiyallaahu laa ilaaha illaa huwa 'alaihi tawakkaltu wa huwa rabbul 'arsyil 'azhiim (7x)", jumlah: "7x", keutamaan: "Cukup atas kecemasan malam" },
  { nama: "Istighfar Sebelum Tidur", arab: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", latin: "Astaghfirullaahal 'azhiim alladzii laa ilaaha illaa huwal hayyul qayyuumu wa atuubu ilaih (3x)", jumlah: "3x", keutamaan: "Dihapus dosa meski sebanyak buih lautan" },
];

const pluginConfig = {
  name: "dzikir",
  alias: ["dzikir"],
  aliases: ["dzikir", "zikir", "dhikr", "dzikirpagi", "dzikirpetang"],
  category: "islami",
  description: "Dzikir pagi & petang, doa harian, doa pilihan, dzikir setelah shalat (Arab lengkap, Latin, Arti, sumber hadis)",
  usage: ".dzikir pagi|petang|doa|pilihan|shalat [nomor]",
  example: ".dzikir pagi | .dzikir pagi 5",
  isGroupOnly: false,
}

const fallbackList = (key, judul) => {
  const list = key === "pagi" ? DZIKIR_PAGI : DZIKIR_PETANG;
  const lines = [`${judul} - ${list.length} dzikir (offline)`, ""];
  list.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.nama}`);
    lines.push(`   Jumlah: ${d.jumlah}`);
    lines.push(`   Arab: ${d.arab}`);
    lines.push(`   Latin: ${d.latin}`);
    lines.push(`   Keutamaan: ${d.keutamaan}`);
    lines.push("");
  });
  return claraWrap(judul, lines.join("\n"));
};

async function handler(m, { sock, db }) {
  const args = (m.args || []).map((a) => String(a).toLowerCase().trim()).filter(Boolean);
  const cmd = String(m.command || "").toLowerCase();
  // alias langsung: .dzikirpagi [nomor] / .dzikirpetang [nomor]
  let input = args[0] || "";
  let nomor = args[1] ? parseInt(args[1], 10) : null;
  if (cmd === "dzikirpagi" || cmd === "dzikirpetang") {
    const base = cmd === "dzikirpagi" ? "pagi" : "petang";
    if (!input) input = base;
    else if (/^\d+$/.test(input)) { nomor = parseInt(input, 10); input = base; }
  }

  if (!input || input === "list") {
    return m.reply(claraWrap("Dzikir & Doa", [
      "Kumpulan dzikir & doa dari sunnah (sumber hadis dicantumkan)",
      "",
      "Cara pakai:",
      "▸ .dzikir pagi — daftar 19 dzikir pagi",
      "▸ .dzikir petang — daftar 19 dzikir petang",
      "▸ .dzikir doa — 38 doa harian",
      "▸ .dzikir pilihan — 8 doa pilihan",
      "▸ .dzikir shalat — 13 dzikir setelah shalat",
      "",
      "Detail lengkap: .dzikir pagi 5 (teks Arab utuh + terjemahan + keutamaan)",
    ].join("\n")));
  }

  const katKey = (input === "sore" || input === "malam") ? "petang"
    : (input === "sholat" || input === "sesudahshalat") ? "shalat"
    : (input === "doaharian") ? "doa" : input;
  const kat = KATEGORI[katKey];
  if (!kat) {
    return m.reply(claraWrap("Dzikir", "Pilihan: pagi · petang · doa · pilihan · shalat\n💡 Contoh: .dzikir pagi"));
  }

  // ── API dua-dhikr (teks arab lengkap) ──
  try {
    if (nomor && Number.isInteger(nomor) && nomor > 0) {
      const { status, data } = await fetchJson(`${DZIKIR_API}/categories/${kat.slug}/${nomor}`);
      if (status === 200 && data?.data?.title) {
        const d = data.data;
        return m.reply(claraWrap(d.title || kat.judul, [
          d.arabic || "",
          "",
          `"${d.latin || ""}"`,
          "",
          `Artinya: ${d.translation || "-"}`,
          d.notes ? `\nJumlah: ${d.notes}` : "",
          d.fawaid ? `\nKeutamaan: ${d.fawaid}` : "",
          d.source ? `\nSumber: ${d.source}` : "",
        ].join("\n")));
      }
      // nomor gak ada / API down → lanjut fallback di bawah
    }
    const { status, data } = await fetchJson(`${DZIKIR_API}/categories/${kat.slug}`);
    if (status === 200 && Array.isArray(data?.data) && data.data.length) {
      const list = data.data;
      if (!nomor) {
        const lines = [`${kat.judul} — ${list.length} item`, ""];
        list.forEach((d, i) => lines.push(`${i + 1}. ${d.title}`));
        lines.push("");
        lines.push(`Detail: .dzikir ${katKey} <nomor>`);
        return m.reply(claraWrap(kat.judul, lines.join("\n")));
      }
      const d = list[nomor - 1];
      if (d) return m.reply(claraWrap(d.title || kat.judul, [
        d.arabic || "",
        "",
        `"${d.latin || ""}"`,
        "",
        `Artinya: ${d.translation || "-"}`,
        d.notes ? `\nJumlah: ${d.notes}` : "",
        d.fawaid ? `\nKeutamaan: ${d.fawaid}` : "",
        d.source ? `\nSumber: ${d.source}` : "",
      ].join("\n")));
    }
  } catch (e) {
    // API down → fallback offline
  }

  // ── FALLBACK OFFLINE (hanya pagi/petang) ──
  if (kat.offline) {
    return m.reply(fallbackList(kat.offline, kat.judul));
  }
  return m.reply(claraWrap("Dzikir", "❌ Server dzikir lagi gak bisa dihubungi. Coba lagi nanti.\n(Dzikir pagi & petang masih bisa via .dzikir pagi / .dzikir petang saat offline)"));
}

export { pluginConfig as config, handler };
export default handler;
