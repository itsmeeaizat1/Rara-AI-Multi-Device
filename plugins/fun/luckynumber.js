// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "luckynumber",
  alias: ["luckynumber"],
  category: "fun",
  description: "Nomor hoki harian — 4D/3D/2D, lucky color, direction, vibes",
  usage: ".luckynumber — Dapat nomor hoki + ramalan harian\n.luckynumber 4d — Hanya 4 digit\n.luckynumber info — Statistik",
  example: ".luckynumber\n.luckynumber 4d",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const LUCKY_COLORS = ["Merah", "Biru", "Hijau", "Kuning", "Ungu", "Putih", "Hitam", "Orange", "Pink", "Silver", "Gold", "Coklat"];
const LUCKY_DIRECTIONS = ["Utara", "Selatan", "Timur", "Barat", "Timur Laut", "Barat Laut", "Tenggara", "Barat Daya"];
const VIBES_HARI = [
  { nama: "Vibes Rejeki", emoji: "💰", desc: "Rejeki lancar, mungkin nemu uang di jalan" },
  { nama: "Vibes Cinta", emoji: "💖", desc: "Ada yang memikirkanmu hari ini" },
  { nama: "Vibes Berkah", emoji: "🤲", desc: "Semua yang kamu lakukan berkah" },
  { nama: "Vibes Tenang", emoji: "🧘", desc: "Hari yang tenang, gak ada drama" },
  { nama: "Vibes Semangat", emoji: "🔥", desc: "Energi penuh, eksekusi semua rencana" },
  { nama: "Vibes Santai", emoji: "😎", desc: "Santai aja, gak perlu tegang" },
  { nama: "Vibes Hoki", emoji: "🍀", desc: "Keberuntungan di pihakmu" },
  { nama: "Vibes Kreatif", emoji: "🎨", desc: "Ide-ide kreatif muncul, catat!" },
  { nama: "Vibes Sosial", emoji: "🤝", desc: "Banyak interaksi, perluas kenalan" },
  { nama: "Vibes Introvert", emoji: "🌙", desc: "Butuh me-time, gak ganggu orang" },
];
const ZODIAC_EMOJI = { Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓" };

function genNum(digits) {
  let num = "";
  for (let i = 0; i < digits; i++) num += Math.floor(Math.random() * 10);
  return num;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const type = args[0]?.toLowerCase();

    if (type === "info") {
      return m.reply(claraWrap("Lucky Number", [
        "NOMOR HOKI HARIAN",
        "Generate nomor hoki 2D/3D/4D + ramalan lengkap",
        "",
        "Perintah:",
        usedPrefix + "luckynumber — Lengkap (2D+3D+4D+ramalan)",
        usedPrefix + "luckynumber 4d — Hanya 4 digit",
        usedPrefix + "luckynumber 3d — Hanya 3 digit",
        usedPrefix + "luckynumber 2d — Hanya 2 digit",
      ], "info"));
    }

    const num4d = genNum(4);
    const num3d = genNum(3);
    const num2d = genNum(2);
    const luckyColor = pick(LUCKY_COLORS);
    const luckyDir = pick(LUCKY_DIRECTIONS);
    const vibes = pick(VIBES_HARI);
    const luckyZodiac = pick(Object.keys(ZODIAC_EMOJI));
    const luckyTime = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0") + ":00 - " + String(Math.floor(Math.random() * 12) + 13).padStart(2, "0") + ":00";

    if (type === "4d") {
      return m.reply(claraWrap("Lucky Number", [
        "ANGKA HOKI 4D",
        "",
        "Lucky: " + num4d,
        "Warna: " + luckyColor,
        "Arah: " + luckyDir,
      ], "info"));
    }
    if (type === "3d") {
      return m.reply(claraWrap("Lucky Number", [
        "ANGKA HOKI 3D",
        "",
        "Lucky: " + num3d,
        "Warna: " + luckyColor,
      ], "info"));
    }
    if (type === "2d") {
      return m.reply(claraWrap("Lucky Number", [
        "ANGKA HOKI 2D",
        "",
        "Lucky: " + num2d,
        "Warna: " + luckyColor,
      ], "info"));
    }

    await m.react("🐣");
    return m.reply(claraWrap("Lucky Number", [
      "ANGKA HOKI HARI INI",
      "",
      "4D: " + num4d,
      "3D: " + num3d,
      "2D: " + num2d,
      "",
      "Lucky Color: " + luckyColor,
      "Lucky Direction: " + luckyDir,
      "Lucky Time: " + luckyTime,
      "Lucky Zodiac: " + ZODIAC_EMOJI[luckyZodiac] + " " + luckyZodiac,
      "",
      "Vibes Hari Ini:",
      vibes.emoji + " " + vibes.nama,
      vibes.desc,
      "",
      usedPrefix + "luckynumber untuk lagi",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("Lucky Number", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
