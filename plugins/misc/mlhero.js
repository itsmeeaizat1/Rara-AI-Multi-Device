// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// mlhero.js — Mobile Legends hero info
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap , raraBox} from "../../src/lib/rara-menu-style.js";

const HEROES = [
  "Layla", "Miya", "Zilong", "Sabre", "Alice", "Tigreal", "Balmond",
  "Nana", "Franco", "Akai", "Karina", "Chou", "Lancelot", "Fanny",
  "Gusion", "Lesley", "Alucard", "Karrie", "Kagura", "Lylia", "Harith",
  "Thamuz", "Kimmy", "Belerick", "Esmeralda", "Guinevere", "Khufra",
  "Ling", "Wanwan", "Silvanna", "Masha", "Baxia", "Popol and Kupa",
  "Atlas", "Carmilla", "Selena", "Gatotkaca", "Argus", "Ruby", "Helcurt"
];

const ROLES = ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];
const DIFFICULTY = ["Easy", "Normal", "Hard", "Very Hard", "Extreme"];

const pluginConfig = {
  name: "mlhero",
  alias: ["mlhero", "hero", "mobilelegends"],
  category: "misc",
  description: "Info hero Mobile Legends",
  usage: ".mlhero <nama_hero>",
  example: ".mlhero Lancelot",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) {
      let _lines = [];
        _lines.push(`Hero tersedia:`);
      HEROES.forEach((h, i) => { _lines.push(`${i + 1}. ${h}`); });
        _lines.push(`Cara: .mlhero <nama_hero>`);
      let msg = raraBox("ML HERO LIST", _lines);
      await m.react("🐣");
      return m.reply(msg);
    }
    const hero = HEROES.find(h => h.toLowerCase().includes(query.toLowerCase()));
    if (!hero) {
      await m.react("🚫");
      return m.reply(raraWrap("mlhero", `Hero "${query}" tidak ditemukan!`, "error"));
    }
    const role = ROLES[Math.floor(Math.random() * ROLES.length)];
    const diff = DIFFICULTY[Math.floor(Math.random() * DIFFICULTY.length)];
    const power = Math.floor(Math.random() * 500) + 100;

    let _lines = [];
      _lines.push(`🎮 Hero: *${hero}*`);
      _lines.push(`🏷️ Role: ${role}`);
      _lines.push(`⚡ Difficulty: ${diff}`);
      _lines.push(`💪 Power: ${power}`);
    let msg = raraBox("ML HERO", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("mlhero error:", err);
    await m.react("❌");
    return m.reply(raraWrap("mlhero", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
