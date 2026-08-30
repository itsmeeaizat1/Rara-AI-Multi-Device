// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// doatahlil.js — Doa Tahlil
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const DOA_TAHLIL = [
  { title: "Al-Fatihah", arabic: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ. الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang. Segala puji bagi Allah, Tuhan semesta alam" },
  { title: "Doa Tahlil", arabic: "لَا إِلَهَ إِلَّا اللَّهُ", translation: "Tiada Tuhan selain Allah" },
  { title: "Doa Untuk Mayit", arabic: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ", translation: "Ya Allah, ampunilah dan rahmatilah dia" },
  { title: "Doa Penutup", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً", translation: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat" },
];

const pluginConfig = {
  name: "doatahlil",
  alias: ["doatahlil", "tahlil"],
  category: "islami",
  description: "Doa Tahlil lengkap",
  usage: ".doatahlil",
  example: ".doatahlil",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    let msg = `╭──「 *DOA TAHLIL* 」\n`;
    msg += `│\n`;
    DOA_TAHLIL.forEach((v, i) => {
      msg += `│ ${i + 1}. ${v.title}\n`;
      msg += `│ Arabic: ${v.arabic}\n`;
      msg += `│ Arti: ${v.translation}\n`;
      msg += `│\n`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("doatahlil error:", err);
    await m.react("❌");
    return m.reply(claraWrap("doatahlil", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
