// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// salatintention.js — Niat sholat 5 waktu
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const NIAT = [
  { name: "Subuh", arabic: "أُصَلِّي فَرْضَ الصُّبْحِ رَكْعَتَيْنِ مُسْتَقِبِلَ الْقِبْلَةِ لِلَّهِ تَعَالَى", latin: "Usholli fardhol subhi rak'ataini mustaqbilal qiblati lillaahi ta'aalaa", arti: "Aku berniat sholat fardu Subuh 2 rakaat menghadap qiblat karena Allah Ta'ala" },
  { name: "Dzuhur", arabic: "أُصَلِّي فَرْضَ الظُّهْرِ أَرْبَعَ رَكَعَاتٍ مُسْتَقِبِلَ الْقِبْلَةِ لِلَّهِ تَعَالَى", latin: "Usholli fardhol dzuhri arba'a raka'aatin mustaqbilal qiblati lillaahi ta'aalaa", arti: "Aku berniat sholat fardu Dzuhur 4 rakaat menghadap qiblat karena Allah Ta'ala" },
  { name: "Ashar", arabic: "أُصَلِّي فَرْضَ الْعَصْرِ أَرْبَعَ رَكَعَاتٍ مُسْتَقِبِلَ الْقِبْلَةِ لِلَّهِ تَعَالَى", latin: "Usholli fardhol 'ashri arba'a raka'aatin mustaqbilal qiblati lillaahi ta'aalaa", arti: "Aku berniat sholat fardu Ashar 4 rakaat menghadap qiblat karena Allah Ta'ala" },
  { name: "Maghrib", arabic: "أُصَلِّي فَرْضَ الْمَغْرِبِ ثَلَاثَ رَكَعَاتٍ مُسْتَقِبِلَ الْقِبْلَةِ لِلَّهِ تَعَالَى", latin: "Usholli fardhol maghribi tsalaatsa raka'aatin mustaqbilal qiblati lillaahi ta'aalaa", arti: "Aku berniat sholat fardu Maghrib 3 rakaat menghadap qiblat karena Allah Ta'ala" },
  { name: "Isya", arabic: "أُصَلِّي فَرْضَ الْعِشَاءِ أَرْبَعَ رَكَعَاتٍ مُسْتَقِبِلَ الْقِبْلَةِ لِلَّهِ تَعَالَى", latin: "Usholli fardhol 'isyaa'i arba'a raka'aatin mustaqbilal qiblati lillaahi ta'aalaa", arti: "Aku berniat sholat fardu Isya 4 rakaat menghadap qiblat karena Allah Ta'ala" },
];

const pluginConfig = {
  name: "niatsholat",
  alias: ["niatsholat", "niatshalat"],
  category: "islami",
  description: "Niat sholat 5 waktu",
  usage: ".niatsholat",
  example: ".niatsholat",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    let _lines = [];
    NIAT.forEach(n => {
      _lines.push(`Sholat ${n.name}`);
      _lines.push(`Arabic: ${n.arabic}`);
      _lines.push(`Latin: ${n.latin}`);
      _lines.push(`Arti: ${n.arti}`);
      _lines.push(``);
    });
    let msg = novaBox("NIAT SHOLAT", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("niatsholat error:", err);
    await m.react("❌");
    return m.reply(claraWrap("niatsholat", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
