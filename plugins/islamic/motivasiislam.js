// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "motivasiislam",
  alias: ["motivasiislami", "motivasimuslim", "kataislam", "kataislaami"],
  category: "islamic",
  description: "Motivasi Islami dari ayat Al-Quran random + tafsir (API online)",
  usage: ".motivasiislam",
  example: ".motivasiislam",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const API_BASE = "https://api.alquran.cloud/v1";

// Kumpulan topik Quran untuk random motivasi
const TOPICS = [
  { surah: 2, ayat: 153, tag: "Sabar" },
  { surah: 2, ayat: 286, tag: "Beban Hidup" },
  { surah: 3, ayat: 159, tag: "Kelembutan" },
  { surah: 4, ayat: 36, tag: "Birrul Walidain" },
  { surah: 7, ayat: 23, tag: "Tobat" },
  { surah: 9, ayat: 40, tag: "Tawakal" },
  { surah: 13, ayat: 28, tag: "Ketenangan Hati" },
  { surah: 14, ayat: 7, tag: "Bersyukur" },
  { surah: 16, ayat: 97, tag: "Amal Sholeh" },
  { surah: 17, ayat: 80, tag: "Kekuatan" },
  { surah: 20, ayat: 25, tag: "Permohonan" },
  { surah: 29, ayat: 69, tag: "Perjuangan" },
  { surah: 39, ayat: 53, tag: "Rahmat Allah" },
  { surah: 40, ayat: 60, tag: "Doa" },
  { surah: 47, ayat: 7, tag: "Pertolongan Allah" },
  { surah: 54, ayat: 17, tag: "Mudah Belajar Quran" },
  { surah: 65, ayat: 3, tag: "Rezeki" },
  { surah: 67, ayat: 2, tag: "Ujian Hidup" },
  { surah: 90, ayat: 4, tag: "Kesulitan" },
  { surah: 93, ayat: 5, tag: "Harapan" },
  { surah: 94, ayat: 5, tag: "Kesulitan & Kemudahan" },
  { surah: 94, ayat: 6, tag: "Kesulitan & Kemudahan" },
  { surah: 103, ayat: 2, tag: "Waktu" },
  { surah: 108, ayat: 1, tag: "Nikmat" },
  { surah: 108, ayat: 2, tag: "Syukur" },
  { surah: 110, ayat: 1, tag: "Kemenangan" },
  { surah: 112, ayat: 1, tag: "Tauhid" },
  { surah: 113, ayat: 1, tag: "Perlindungan" },
  { surah: 114, ayat: 1, tag: "Perlindungan" },
  { surah: 2, ayat: 45, tag: "Sabar & Sholat" },
  { surah: 3, ayat: 139, tag: "Jangan Patah Semangat" },
  { surah: 8, ayat: 53, tag: "Syukur" },
  { surah: 10, ayat: 57, tag: "Penawar Hati" },
  { surah: 11, ayat: 88, tag: "Akhirat" },
  { surah: 21, ayat: 87, tag: "Sabar" },
  { surah: 23, ayat: 62, tag: "Janji Allah" },
  { surah: 25, ayat: 77, tag: "Doa" },
  { surah: 31, ayat: 6, tag: "Ketenangan" },
  { surah: 33, ayat: 3, tag: "Tawakal" },
  { surah: 35, ayat: 34, tag: "Syukur" },
  { surah: 40, ayat: 44, tag: "Sabar" },
  { surah: 41, ayat: 30, tag: "Petunjuk" },
  { surah: 42, ayat: 36, tag: "Akhirat" },
  { surah: 51, ayat: 22, tag: "Rezeki" },
  { surah: 55, ayat: 13, tag: "Nikmat Allah" },
  { surah: 57, ayat: 3, tag: "Kekuatan" },
  { surah: 58, ayat: 7, tag: "Pengetahuan Allah" },
  { surah: 65, ayat: 2, tag: "Jalan Keluar" },
  { surah: 71, ayat: 10, tag: "Tobat" },
  { surah: 76, ayat: 9, tag: "Sikap Sosial" },
  { surah: 77, ayat: 25, tag: "Kuasa Allah" },
  { surah: 84, ayat: 6, tag: "Pengorbanan" },
  { surah: 85, ayat: 14, tag: "Maha Pengampun" },
  { surah: 87, ayat: 9, tag: "Pengingat" },
  { surah: 89, ayat: 27, tag: "Jiwa yang Tenang" },
  { surah: 90, ayat: 17, tag: "Sabar & Kasih Sayang" },
  { surah: 93, ayat: 1, tag: "Waktu Pagi" },
  { surah: 99, ayat: 7, tag: "Amal Kecil" },
];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function handler(m, { sock }) {
  try {
    // Random topik
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    // Fetch Arabic + Indonesian + Tafsir
    const [arabRes, indoRes, tafsirRes] = await Promise.all([
      fetchJson(API_BASE + "/ayah/" + topic.surah + ":" + topic.ayat + "/quran-uthmani"),
      fetchJson(API_BASE + "/ayah/" + topic.surah + ":" + topic.ayat + "/id.indonesian"),
      fetchJson(API_BASE + "/ayah/" + topic.surah + ":" + topic.ayat + "/id.muntakhab").catch(() => null),
    ]);

    const surah = arabRes.data.surah;
    const arabText = arabRes.data.text;
    const indoText = indoRes.data.text;
    const tafsirText = tafsirRes?.data?.text || "";

    let txt = "╭──「 *MOTIVASI ISLAMI│ ❏\n"; 」
    txt += "╰──────────❀\n";
    txt += "Tema: *" + topic.tag + "*\n";
    txt += "QS. " + surah.englishName + ":" + topic.ayat + "\n\n";
    txt += "*ᴛᴇᴋꜱ ᴀʀᴀʙ:*\n" + arabText + "\n\n";
    txt += "*ᴛᴇʀᴊᴇᴍᴀʜᴀɴ:*\n" + indoText + "\n\n";

    if (tafsirText) {
      // Potong tafsir jika terlalu panjang
      const tafsirShort = tafsirText.length > 500 ? tafsirText.substring(0, 500) + "..." : tafsirText;
      txt += "*ᴛᴀꜰꜱɪʀ:*\n" + tafsirShort + "\n\n";
    }

    txt += "Sumber: alquran.cloud API\n";
    txt += "Semoga menguatkan hatimu hari ini.";
    return await m.reply(txt);
  } catch (error) {
    return m.reply("Error: " + error.message + "\n\nCoba lagi nanti.");
  }
}

export { pluginConfig as config, handler };
