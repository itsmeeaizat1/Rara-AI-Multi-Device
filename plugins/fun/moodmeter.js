// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "moodmeter",
  alias: ["moodmeter"],
  category: "fun",
  description: "Mood meter harian — cek mood kamu atau orang lain",
  usage: ".moodmeter — Cek mood kamu\n.moodmeter @target — Prediksi mood target",
  example: ".moodmeter\n.moodmeter @target",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MOODS = [
  { nama: "Happy", emoji: "😄", range: [80, 100], desc: "Lagi happy banget! Semua serba positif." },
  { nama: "Chill", emoji: "😎", range: [60, 79], desc: "Santai, gak ada beban, flow aja." },
  { nama: "Sleepy", emoji: "😴", range: [40, 59], desc: "Ngantuk melulu, pengen rebahan." },
  { nama: "Chaotic", emoji: "🤪", range: [20, 39], desc: "Random banget hari ini, gak jelas." },
  { nama: "Sad", emoji: "😢", range: [0, 19], desc: "Lagi sedih, butuh peluk." },
  { nama: "Hangry", emoji: "😠", range: [10, 30], desc: "Laper + marah = hangry. Kasih makan!" },
  { nama: "Moody", emoji: "🌧️", range: [30, 50], desc: "Mood swing, gak tau mau apa." },
  { nama: "Hyper", emoji: "⚡", range: [85, 100], desc: "Energi berlebih, gak bisa diam!" },
  { nama: "Baperan", emoji: "🥺", range: [40, 60], desc: "Gampang baper hari ini, hati-hati." },
  { nama: "Gak Peduli", emoji: "🤷", range: [50, 70], desc: "Apa pun yang terjadi, gak peduli." },
];

const MOOD_FACTORS = [
  "dipengaruhi cuaca", "dipengaruhi jadwal makan", "dipengaruhi tidur semalam",
  "dipengaruhi scroll TikTok", "dipengaruhi chat seseorang", "dipengaruhi gajih",
  "dipengaruhi cuaca hati mantan", "dipengaruhi caffeine", "dipengaruhi lagu yang diputar",
  "dipengaruhi anime/drama yang ditonton",
];

const MOOD_TIPS = [
  "Minum air, jaga kesehatan.", "Coba jalan-jalan sebentar.", "Dengerin musik kesukaan.",
  "Makan yang enak, self reward!", "Tidur cukup malam ini.", "Chat temen yang bisa bikin senyum.",
  "Rebahan gak papa kok, kamu layak istirahat.", "Coba hal baru, mungkin mood naik.",
  "Jangan scroll berita dulu, bikin down.", "Self hug dari aku 🤗",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const target = m.mentionedJid?.[0] || m.quoted?.sender;
    const nama = target ? "@" + target.split("@")[0] : (m.pushName || "Kamu");

    const score = Math.floor(Math.random() * 100) + 1;
    const mood = MOODS.find(m => score >= m.range[0] && score <= m.range[1]) || MOODS[0];
    const factor = pick(MOOD_FACTORS);
    const tip = pick(MOOD_TIPS);

    await m.react("🐣");
    return m.reply(raraWrap("Mood Meter", [
      "MOOD HARI INI",
      "",
      "Subjek: " + nama,
      "",
      mood.emoji + " Mood: " + mood.nama,
      "Score: " + score + "/100",
      "",
      "Status: " + mood.desc,
      "",
      "Faktor: " + factor,
      "",
      "Tips: " + tip,
      "",
      usedPrefix + "moodmeter untuk cek lagi",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("Mood Meter", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
