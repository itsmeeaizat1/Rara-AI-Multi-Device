// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fortunecookie",
  alias: ["fortunecookie"],
  category: "future",
  description: "Fortune cookie harian - pesan hoki & lucky number",
  usage: ".fortunecookie",
  example: ".fortunecookie",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const FORTUNES = [
  "Keberuntungan kamu lagi naik, manfaatin hari ini.",
  "Seseorang dari masa lalu akan menghubungimu sebentar lagi.",
  "Keputusan yang kamu ragukan minggu lalu, ternyata benar.",
  "Rejeki bukan cuma soal uang, tapi juga ketenangan hati.",
  "Jangan terlalu keras sama diri sendiri, kamu sudah cukup berusaha.",
  "Ada kejutan kecil hari ini yang bikin kamu senyum.",
  "Pelan-pelan, tapi pasti. Kamu di jalur yang benar.",
  "Hari ini bukan harinya nyerah, besok juga bukan.",
  "Kebaikan yang kamu tabur mulai berbuah minggu ini.",
  "Seseorang diam-diam bangga sama kamu, tapi tidak bilang.",
  "Kalo kamu buka hati sedikit, hal bagus akan masuk.",
  "Keberuntungan datang ke yang berani ambil risiko.",
  "Kesabaran kamu sedang diuji, tapi hasilnya sepadan.",
  "Hal yang kamu tunggu akan datang, tapi bukan lewat cara yang kamu kira.",
  "Kamu lebih kuat dari yang kamu kira.",
  "Pelan tapi konsisten, lebih baik dari cepat tapi putus tengah jalan.",
  "Ada seseorang yang lagi mikirin kamu hari ini.",
  "Kalo capek, istirahat. Bukan nyerah, tapi recharge.",
  "Hoki kamu ada di hal yang kamu hindari, coba cek lagi.",
  "Mimpi kamu bukan hal yang mustahil, cuma butuh waktu lebih lama.",
  "Jangan bandingkan proses kamu dengan hasil orang lain.",
  "Kamu lagi ada di fase glow up, orang mulai sadar.",
  "Hal kecil yang kamu lakukan hari ini, akan berdampak besar.",
  "Kebahagiaan bukan di ujung, tapi di prosesnya.",
  "Jangan takut salah, takut itu diam tanpa berbuat.",
  "Kamu layak bahagia, ingat itu.",
];

const LUCKY_NUMBERS = [3, 7, 8, 9, 11, 13, 17, 21, 23, 27, 33, 77, 88, 99, 108];

const LUCKY_COLORS = [
  { color: "Merah", meaning: "passion & energi" },
  { color: "Kuning", meaning: "keceriaan & optimis" },
  { color: "Hijau", meaning: "tumbuh & seimbang" },
  { color: "Biru", meaning: "ketenangan & kejujuran" },
  { color: "Ungu", meaning: "kebijaksanaan & ambisi" },
  { color: "Emas", meaning: "kelimpahan & sukses" },
  { color: "Pink", meaning: "cinta & kasih sayang" },
  { color: "Putih", meaning: "kesempurnaan & awal baru" },
];

const ZODIAC_TIPS = [
  "Aries: Jangan buru-buru mengambil keputusan besar hari ini.",
  "Taurus: Keberuntungan datang dari orang terdekat.",
  "Gemini: Jaga kata-kata, ada yang sensitif di sekitar kamu.",
  "Cancer: Waktu buat healing, jaga emosi.",
  "Leo: Kamu center stage hari ini, manfaatin!",
  "Virgo: Detail penting, perhatikan baik-baik.",
  "Libra: Jaga keseimbangan, jangan terlalu spend atau terlalu hemat.",
  "Scorpio: Ada rahasia yang akan terungkap.",
  "Sagittarius: Waktu buat eksplorasi hal baru.",
  "Capricorn: Kerja keras mulai berbuah, sabar ya.",
  "Aquarius: Ide brilian datang dari tempat tak terduga.",
  "Pisces: Intuisi kamu kuat hari ini, percaya feeling.",
];

const MOOD = [
  "Energi: High | Vibe: Glowing | Aura: Radiant",
  "Energi: Medium | Vibe: Chill | Aura: Cool",
  "Energi: High | Vibe: Hype | Aura: Fire",
  "Energi: Medium | Vibe: Focused | Aura: Sharp",
  "Energi: Low | Vibe: Cozy | Aura: Warm",
  "Energi: High | Vibe: Lucky | Aura: Golden",
  "Energi: Medium | Vibe: Creative | Aura: Purple",
  "Energi: High | Vibe: Social | Aura: Bright",
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const seed = hashString(m.sender + todayDate());

  const fortune = FORTUNES[seed % FORTUNES.length];
  const luckyNum = LUCKY_NUMBERS[(seed >> 4) % LUCKY_NUMBERS.length];
  const luckyNum2 = LUCKY_NUMBERS[(seed >> 8) % LUCKY_NUMBERS.length];
  const luckyColor = LUCKY_COLORS[(seed >> 6) % LUCKY_COLORS.length];
  const zodiac = ZODIAC_TIPS[(seed >> 10) % ZODIAC_TIPS.length];
  const mood = MOOD[(seed >> 3) % MOOD.length];

  await m.reply(claraWrap("Fortune Cookie", [
    "Tanggal: " + todayDate(),
    "@" + m.sender.split("@")[0],
    "",
    "Pesan hoki:",
    "\"" + fortune + "\"",
    "",
    "Lucky Number: " + luckyNum + " & " + luckyNum2,
    "Lucky Color: " + luckyColor.color + " (" + luckyColor.meaning + ")",
    "",
    "Zodiac Tip: " + zodiac,
    "",
    mood,
    "",
    "Kembali besok buat fortune baru!",
  ].join("\n")), { mentions: [m.sender] });
  return { handled: true };
}

export { pluginConfig as config, handler };
