// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "siapaaku",
  alias: ["siapaaku"],
  category: "fun",
  description: "Aku siapa? — Random personality roast/comedy berdasarkan nama",
  usage: ".siapaaku — Analisis random kamu\n.siapaaku <nama> — Analisis nama lain",
  example: ".siapaaku\n.siapaaku Budi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const ENERGI = ["Alfa", "Beta", "Sigma", "Giga", "Omega", "Ultra", "Mega", "Mini", "Eco", "Turbo"];
const AURA = ["Merah Tua", "Biru Pucat", "Hijau Neon", "Ungu Gelap", "Emas Gembur", "Hitam Misterius", "Putih Terang", "Pink Nyenyak", "Abu Rindu", "Oranye Rebus"];
const KARAKTER = [
  "pemalu tapi kalau udah deket jadi gila", "introvert yang pengen diajak-ngobrol tapi gak mau mulai dulu",
  "ekstrovert tapi cuma online", "gabut 24 jam tapi sibuk pas ditanya",
  "galak di luar lembek di dalam", "suka tidur tapi gak bisa tidur",
  "pemikir tapi gak ada aksi", "gila tapi terkendali", "cuek tapi perhatian",
  "laper tapi pilih-pilih makan", "bisa hibernate 16 jam", "kerja keras tapi kerjanya rebahan",
  "overthinking level dewa", "bacot tapi gak nyambung",
  "suka perhatian tapi malu kalo dipuji", "jago nongkrong tapi gak jago bayar",
  "suka makan tapi gak masak", "ganteng/cantik tapi gak pede",
];
const NASIB = [
  "bakal kaya lewat warisan (yang belum pasti ada)", "bakal nikah sama tetangga sebelah",
  "bakal jadi seleb TikTok pakai konten gak jelas", "bakal kerja 50 tahun buat pensiun miskin",
  "bakal pindah ke desa (karena diusir kos)", "bakal ketemu jodoh di jengkal sana",
  "bakal jadi mentor tapi muridnya cuma 1", "bakal bisnis meledak (tapi meledak beneran, bukan sukses)",
  "bakal lari dari masalah (karena gak bisa ngadepin)", "bakal bahagia tapi nunggu gajih dulu",
  "bakal hidup tenang di rumah kayu (di desa)", "bakal punya pet 3 ekor (kucing rayap)",
];
const KEKUATAN = [
  "bisa tidur di mana pun", "bisa makan 5 porsi tapi gak gemuk (masih lgi dicek)",
  "bisa inget tanggalan mantan dari 2018", "bisa ngomong 3 bahasa (tapi campur aduk)",
  "bila tahan gak mandi 2 hari", "bisa kentut senyap", "bisa malas 24 jam nonstop",
  "bisa scroll TikTok 6 jam tanpa laper", "bisa marah tapi gak bikin takut",
  "bila akrab sama satpam kompleks", "bisa lupa di mana naruh HP padahal di genggam",
];
const KELEMAHAN = [
  "gak bisa bangun pagi walau jam 12", "lupa nama orang pas ketemu",
  "gak bisa nolak makanan gratis", "gak bisa stop scroll walau mata pedes",
  "gak bisa inget tanggal ultah sendiri", "gak bisa tahan liat gorengan",
  "gak bisa jujur soal perasaan", "gak bisa kalem pas liat diskon",
  "gak bisa kerja tanpa musik", "gak bisa dewasa walau umur 30",
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const nama = text || args.join(" ") || m.pushName || "Kamu";

    const analisis = {
      energi: pickRandom(ENERGI),
      aura: pickRandom(AURA),
      karakter: pickRandom(KARAKTER),
      nasib: pickRandom(NASIB),
      kekuatan: pickRandom(KEKUATAN),
      kelemahan: pickRandom(KELEMAHAN),
      level: Math.floor(Math.random() * 100) + 1,
      kecocokan: Math.floor(Math.random() * 100),
    };

    await m.react("🐣");
    return m.reply(raraWrap("Siapa Aku", [
      "ANALISIS: " + nama,
      "",
      "Energi: " + analisis.energi + " (Level " + analisis.level + "/100)",
      "Aura: " + analisis.aura,
      "Kecocokan: " + analisis.kecocokan + "%",
      "",
      "Karakter:",
      analisis.karakter,
      "",
      "Kekuatan:",
      analisis.kekuatan,
      "",
      "Kelemahan:",
      analisis.kelemahan,
      "",
      "Ramalan Nasib:",
      analisis.nasib,
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("Siapa Aku", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
