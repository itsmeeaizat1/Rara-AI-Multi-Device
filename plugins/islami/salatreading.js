// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// salatreading.js — Bacaan sholat
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const BACAAN = [
  { id: 1, name: "Bacaan Iftitah", arabic: "اللَّهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا", latin: "Alloohu akbar kabiirow wal hamdu lillaahi katsiiroo", terjemahan: "Allah Maha Besar dengan sebesar-besarnya, segala puji bagi Allah dengan pujian yang banyak" },
  { id: 2, name: "Al-Fatihah", arabic: "بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ", latin: "Bismillahirrahmanirrahim", terjemahan: "Dengan menyebut nama Allah Yang Maha Pemurah lagi Maha Penyayang" },
  { id: 3, name: "Bacaan Ruku", arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ", latin: "Subhaana rabbiyal 'adhiimi wa bihamdih", terjemahan: "Maha Suci Tuhanku Yang Maha Agung dan dengan memuji-Nya" },
  { id: 4, name: "Bacaan I'tidal", arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ", latin: "Sami'alloohu liman hamidah", terjemahan: "Allah Maha Mendengar bagi siapa yang memuji-Nya" },
  { id: 5, name: "Bacaan Sujud", arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى وَبِحَمْدِهِ", latin: "Subhaana rabbiyal a'laa wa bihamdih", terjemahan: "Maha Suci Tuhanku Yang Maha Tinggi dan dengan memuji-Nya" },
  { id: 6, name: "Bacaan Duduk", arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ", latin: "At-tahiyyaatu lillaahi wash sholawaatu wat thayyibaat", terjemahan: "Segala penghormatan, doa dan kebaikan hanya milik Allah" },
  { id: 7, name: "Salam", arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ", latin: "Assalaamu 'alaikum wa rahmatullooh", terjemahan: "Semoga keselamatan dan rahmat Allah selalu tercurah untuk kalian" },
];

const pluginConfig = {
  name: "bacaansholat",
  alias: ["bacaansholat", "bacaanshalat"],
  category: "islami",
  description: "Bacaan-bacaan dalam sholat",
  usage: ".bacaansholat",
  example: ".bacaansholat",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    let _lines = [];
    BACAAN.forEach(b => {
      _lines.push(`${b.id}. ${b.name}`);
      _lines.push(`Arabic: ${b.arabic}`);
      _lines.push(`Latin: ${b.latin}`);
      _lines.push(`Arti: ${b.terjemahan}`);
      _lines.push(``);
    });
    let msg = raraBox("BACAAN SHOLAT", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("bacaansholat error:", err);
    await m.react("❌");
    return m.reply(raraWrap("bacaansholat", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
