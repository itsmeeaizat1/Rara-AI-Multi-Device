// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "astrologi",
  alias: ["astrologi", "zodiakbarat", "natalchart"],
  category: "future",
  description: "Astrologi barat & natal chart dari tanggal lahir",
  usage: ".astrologi <tanggal lahir>",
  example: ".astrologi 2000-05-15",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const ZODIACS = [
  { name: "Aries", symbol: "Ram", element: "Fire", quality: "Cardinal", ruler: "Mars", start: [3, 21], end: [4, 19], traits: "Berani, kompetitif, impulsif, pemimpin alami", lucky: [1, 9, 19], color: "Merah", compatible: ["Leo", "Sagittarius", "Gemini", "Aquarius"] },
  { name: "Taurus", symbol: "Bull", element: "Earth", quality: "Fixed", ruler: "Venus", start: [4, 20], end: [5, 20], traits: "Setia, sabar, keras kepala, menikmati kemewahan", lucky: [2, 6, 24], color: "Hijau", compatible: ["Virgo", "Capricorn", "Cancer", "Pisces"] },
  { name: "Gemini", symbol: "Twins", element: "Air", quality: "Mutable", ruler: "Mercury", start: [5, 21], end: [6, 20], traits: "Penasaran, komunikatif, tidak konsisten, cerdas", lucky: [3, 5, 14], color: "Kuning", compatible: ["Libra", "Aquarius", "Aries", "Leo"] },
  { name: "Cancer", symbol: "Crab", element: "Water", quality: "Cardinal", ruler: "Moon", start: [6, 21], end: [7, 22], traits: "Emosional, peduli, protektif, sensitif", lucky: [2, 7, 11], color: "Perak", compatible: ["Scorpio", "Pisces", "Taurus", "Virgo"] },
  { name: "Leo", symbol: "Lion", element: "Fire", quality: "Fixed", ruler: "Sun", start: [7, 23], end: [8, 22], traits: "Berani, dramatis, murah hati, percaya diri", lucky: [1, 5, 19], color: "Emas", compatible: ["Aries", "Sagittarius", "Gemini", "Libra"] },
  { name: "Virgo", symbol: "Virgin", element: "Earth", quality: "Mutable", ruler: "Mercury", start: [8, 23], end: [9, 22], traits: "Analitis, perfeksionis, kritis, teliti", lucky: [5, 14, 23], color: "Coklat", compatible: ["Taurus", "Capricorn", "Cancer", "Scorpio"] },
  { name: "Libra", symbol: "Scales", element: "Air", quality: "Cardinal", ruler: "Venus", start: [9, 23], end: [10, 22], traits: "Seimbang, diplomatis, ragu-ragu, estetis", lucky: [4, 6, 13], color: "Pink", compatible: ["Gemini", "Aquarius", "Leo", "Sagittarius"] },
  { name: "Scorpio", symbol: "Scorpion", element: "Water", quality: "Fixed", ruler: "Pluto/Mars", start: [10, 23], end: [11, 21], traits: "Intens, misterius, pendendam, setia", lucky: [8, 11, 18], color: "Hitam", compatible: ["Cancer", "Pisces", "Virgo", "Capricorn"] },
  { name: "Sagittarius", symbol: "Archer", element: "Fire", quality: "Mutable", ruler: "Jupiter", start: [11, 22], end: [12, 21], traits: "Petualang, filosofis, optimis, blak-blakan", lucky: [3, 9, 22], color: "Ungu", compatible: ["Aries", "Leo", "Libra", "Aquarius"] },
  { name: "Capricorn", symbol: "Goat", element: "Earth", quality: "Cardinal", ruler: "Saturn", start: [12, 22], end: [1, 19], traits: "Ambisius, disiplin, pesimis, bertanggung jawab", lucky: [4, 8, 13], color: "Hitam/Coklat", compatible: ["Taurus", "Virgo", "Scorpio", "Pisces"] },
  { name: "Aquarius", symbol: "Water Bearer", element: "Air", quality: "Fixed", ruler: "Uranus/Saturn", start: [1, 20], end: [2, 18], traits: "Unik, independen, eksentrik, humanis", lucky: [4, 7, 22], color: "Biru", compatible: ["Gemini", "Libra", "Aries", "Sagittarius"] },
  { name: "Pisces", symbol: "Fish", element: "Water", quality: "Mutable", ruler: "Neptune/Jupiter", start: [2, 19], end: [3, 20], traits: "Empatik, kreatif, mimpi, intuitif", lucky: [3, 7, 12], color: "Hijau Tua", compatible: ["Cancer", "Scorpio", "Taurus", "Capricorn"] },
];

function getZodiac(month, day) {
  for (const z of ZODIACS) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if (sm === em) {
      if (month === sm && day >= sd && day <= ed) return z;
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return z;
    }
  }
  return ZODIACS[0];
}

function getMoonPhase(date) {
  const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const ref = new Date("2000-01-06");
  const days = Math.floor((date - ref) / 86400000);
  const cycle = 29.53;
  const phase = ((days % cycle) / cycle) * 8;
  return phases[Math.floor(phase)];
}

function getLifePath(dateStr) {
  const digits = dateStr.replace(/-/g, "").split("").map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split("").map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

const LIFE_PATHS = {
  1: "Pemimpin, independen, pionir",
  2: "Diplomatis, sensitif, kooperator",
  3: "Kreatif, ekspresif, sosial",
  4: "Praktis, pekerja keras, stabil",
  5: "Petualang, bebas, adaptif",
  6: "Peduli, bertanggung jawab, harmonis",
  7: "Analitis, spiritual, misterius",
  8: "Ambisius, otoritas, sukses material",
  9: "Humanis, idealis, empatik",
  11: "Intuitif, inspiratif, master number",
  22: "Master builder, visioner, praktis",
  33: "Master teacher, compassion, heal",
};

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const dateStr = (args[1] || "").trim();

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    await m.reply(claraWrap("Astrologi", "Format: " + prefix + "astrologi <YYYY-MM-DD>\nContoh: " + prefix + "astrologi 2000-05-15"));
    return { handled: true };
  }

  const date = new Date(dateStr + "T00:00:00+07:00");
  if (isNaN(date)) {
    await m.reply(claraWrap("Astrologi", "Tanggal tidak valid."));
    return { handled: true };
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const zodiac = getZodiac(month, day);
  const moonPhase = getMoonPhase(date);
  const lifePath = getLifePath(dateStr);
  const lifePathMeaning = LIFE_PATHS[lifePath] || "Unik & bermakna";

  await m.reply(claraWrap("Astrologi: " + dateStr, [
    "Zodiac: " + zodiac.name + " (" + zodiac.symbol + ")",
    "Element: " + zodiac.element,
    "Quality: " + zodiac.quality,
    "Ruler: " + zodiac.ruler,
    "Lucky Number: " + zodiac.lucky.join(", "),
    "Color: " + zodiac.color,
    "",
    "Moon Phase: " + moonPhase,
    "Life Path " + lifePath + ": " + lifePathMeaning,
    "",
    "Traits: " + zodiac.traits,
    "",
    "Compatible: " + zodiac.compatible.join(", "),
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
