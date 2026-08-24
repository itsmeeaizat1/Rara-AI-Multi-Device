// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "namavibes",
  alias: ["namavibes", "cekvibes", "vibesnama", "auranama", "energinama"],
  category: "fun",
  description: "Cek vibes nama kamu — random personality fun",
  usage: ".namavibes — Cek vibes kamu\n.namavibes <nama> — Cek vibes nama lain",
  example: ".namavibes\n.namavibes Budi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const VIBE_AURAS = ["Merah Api", "Biru Laut", "Hijau Lumut", "Ungu Mistik", "Emas Kemewahan", "Hitam Kosmik", "Putih Suci", "Pink Bucin", "Abu Rindu", "Oranye Tropis", "Silver Teknologi", "Tembaga Klasik"];
const VIBE_ENERGIS = ["Alpha Dominan", "Beta Setia", "Sigma Misterius", "Gamma Kreatif", "Omega Bijak", "Delta Pekerja", "Epsilon Santai", "Zeta Unik", "Eta Penuh", "Theta Tenang"];
const PERSONALITY_TAGS = [
  ["Pemimpin", "Gak sabaran", "Galak", "Setia kawan"],
  ["Pemalu", "Suka sendiri", "Overthinking", "Kreatif"],
  ["Bacot", "Loyal", "Suka makan", "Cepet bosan"],
  ["Introvert", "Pemikir", "Suka rebahan", "Bisa diandalkan"],
  ["Ekstrovert", "Suka nongkrong", "Gak bisa diam", "Good vibes"],
  ["Sensitif", "Perhatian", "Suka baper", "Empati tinggi"],
  ["Logis", "Gak gampang percaya", "Suka debat", "Jujur"],
  ["Gokil", "Random", "Lucu", "Unpredictable"],
  ["Cool", "Kalem", "Gak peduli", "Tapi care"],
  ["Sibuk", "Multitasking", "Ambisius", "Lupa istirahat"],
];
const LUCKY_COLORS = ["Merah", "Biru", "Hijau", "Kuning", "Ungu", "Putih", "Hitam", "Pink", "Orange", "Silver"];
const LUCKY_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const VIBES_MESSAGES = [
  "Namamu punya energi yang bikin orang pengen kenal kamu lebih dekat.",
  "Namamu itu kayak kopi, pahit tapi bikin nagih.",
  "Namamu itu unik, kayak belut di kolam ikan.",
  "Namamu tuh bikin orang senyum pas denger, tapi gak tau kenapa.",
  "Namamu ada aura misterius, kayak ending drama Korea.",
  "Namamu itu ringan di hati, kayak kata 'gak papa'.",
  "Namamu tuh gak gampang dilupakan, kayak tagihan listrik.",
  "Namamu punya vibrasi yang bikin penasaran, kayak spoiler film.",
  "Namamu itu kayak rembulan, redup tapi tetap keliatan.",
  "Namamu bikin aku penasaran, kayak soal ujian yang gak dijawab.",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const nama = text || args.join(" ") || m.pushName || "Kamu";

    // Generate consistent-ish random based on name length
    const seed = nama.length + nama.charCodeAt(0);
    const personality = PERSONALITY_TAGS[seed % PERSONALITY_TAGS.length];
    const luckyColor = LUCKY_COLORS[seed % LUCKY_COLORS.length];
    const luckyDay = LUCKY_DAYS[seed % LUCKY_DAYS.length];
    const luckyNumber = ((seed * 7) % 99) + 1;
    const aura = pick(VIBE_AURAS);
    const energi = pick(VIBE_ENERGIS);
    const message = pick(VIBES_MESSAGES);
    const matchScore = ((seed * 3) % 40) + 60;

    return m.reply(claraWrap("Nama Vibes", [
      "VIBES: " + nama,
      "",
      "Aura: " + aura,
      "Energi: " + energi,
      "Lucky Color: " + luckyColor,
      "Lucky Day: " + luckyDay,
      "Lucky Number: " + luckyNumber,
      "Match Score: " + matchScore + "/100",
      "",
      "Kepribadian:",
      ...personality.map(p => "" + p),
      "",
      "Vibes Message:",
      message,
    ], "info"));
  } catch (e) {
    return m.reply(claraWrap("Nama Vibes", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
