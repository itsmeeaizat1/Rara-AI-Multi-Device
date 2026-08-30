// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ayatkursi.js — Ayat Kursi
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ayatkursi",
  alias: ["ayatkursi", "kursi"],
  category: "islami",
  description: "Ayat Kursi (QS. Al-Baqarah: 255)",
  usage: ".ayatkursi",
  example: ".ayatkursi",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    let msg = `╭──「 *AYAT KURSI* 」\n`;
    msg += `│\n`;
    msg += `│ اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ\n`;
    msg += `│ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ\n`;
    msg += `│ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ\n`;
    msg += `│\n`;
    msg += `│ Latin:\n`;
    msg += `│ "Alloohu laa ilaaha illaa huwal hayyul qoyyuum,\n`;
    msg += `│  laa ta'khudzuhuu sinatuw walaa naum...\n`;
    msg += `│\n`;
    msg += `│ Artinya:\n`;
    msg += `│ Allah, tidak ada Tuhan (yang berhak disembah)\n`;
    msg += `│ melainkan Dia Yang Hidup kekal lagi terus\n`;
    msg += `│ menerus mengurus (makhluk-Nya)...\n`;
    msg += `│\n`;
    msg += `│ (QS. Al-Baqarah: 255)\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("ayatkursi error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ayatkursi", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
