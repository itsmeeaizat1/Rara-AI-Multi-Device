// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quotesislamic.js — Quotes Islami
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const QUOTES = [
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", arti: "Sesungguhnya bersama kesulitan ada kemudahan (QS. Al-Insyirah: 6)" },
  { arabic: "وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا", arti: "Barangsiapa bertakwa kepada Allah, Dia akan membukakan jalan keluar (QS. At-Talaq: 2-3)" },
  { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", arti: "Maka ingatlah kepada-Ku, Aku pun akan ingat kepadamu (QS. Al-Baqarah: 152)" },
  { arabic: "وَلَا تَيْأَسُوا مِنْ رَوْحِ اللَّهِ", arti: "Dan janganlah kamu berputus asa dari rahmat Allah (QS. Yusuf: 87)" },
  { arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", arti: "Sesungguhnya Allah bersama orang-orang yang sabar (QS. Al-Baqarah: 153)" },
  { arabic: "وَتَوَكَّلْ عَلَى اللَّهِ وَكَفَى بِاللَّهِ وَكِيلًا", arti: "Dan bertawakallah kepada Allah, dan cukuplah Allah sebagai Pembela (QS. An-Nisa: 81)" },
  { arabic: "رَبِّ اشْرَحْ لِي صَدْرِي", arti: "Ya Tuhanku, lapangkanlah untukku dadaku (QS. Ta-Ha: 25)" },
  { arabic: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ", arti: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya" },
  { arabic: "الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ", arti: "Kata yang baik adalah sedekah" },
  { arabic: "مَنْ سَارَ عَلَى الدَّرْبِ وَصَلَ", arti: "Siapa yang berjalan di jalan tersebut, dia akan sampai" },
];

const pluginConfig = {
  name: "quotesislami",
  alias: ["quotesislami", "quotesislam", "islamquote"],
  category: "islami",
  description: "Random quotes Islami",
  usage: ".quotesislami",
  example: ".quotesislami",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    let _lines = [];
      _lines.push(`${q.arabic}`);
      _lines.push(`"${q.arti}"`);
    let msg = raraBox("QUOTES ISLAMI", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("quotesislami error:", err);
    await m.react("❌");
    return m.reply(raraWrap("quotesislami", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
