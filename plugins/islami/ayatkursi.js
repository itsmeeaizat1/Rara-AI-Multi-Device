// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ayatkursi.js — Ayat Kursi
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

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
    let _lines = [];
      _lines.push(`اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ`);
      _lines.push(`لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ`);
      _lines.push(`لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ`);
      _lines.push(`Latin:`);
      _lines.push(`"Alloohu laa ilaaha illaa huwal hayyul qoyyuum,`);
      _lines.push(`laa ta'khudzuhuu sinatuw walaa naum...`);
      _lines.push(`Artinya:`);
      _lines.push(`Allah, tidak ada Tuhan (yang berhak disembah)`);
      _lines.push(`melainkan Dia Yang Hidup kekal lagi terus`);
      _lines.push(`menerus mengurus (makhluk-Nya)...`);
      _lines.push(`(QS. Al-Baqarah: 255)`);
    let msg = raraBox("AYAT KURSI", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("ayatkursi error:", err);
    await m.react("❌");
    return m.reply(raraWrap("ayatkursi", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
