// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// mlhero.js — Mobile Legends hero info
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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
      let msg = `╭──「 *ML HERO LIST* 」\n`;
      msg += `│ Hero tersedia:\n`;
      msg += `│\n`;
      HEROES.forEach((h, i) => { msg += `│ ${i + 1}. ${h}\n`; });
      msg += `│\n`;
      msg += `│ Cara: .mlhero <nama_hero>\n`;
      msg += `╰──────────`;
      await m.react("🐣");
      return m.reply(msg);
    }
    const hero = HEROES.find(h => h.toLowerCase().includes(query.toLowerCase()));
    if (!hero) {
      await m.react("🚫");
      return m.reply(claraWrap("mlhero", `Hero "${query}" tidak ditemukan!`, "error"));
    }
    const role = ROLES[Math.floor(Math.random() * ROLES.length)];
    const diff = DIFFICULTY[Math.floor(Math.random() * DIFFICULTY.length)];
    const power = Math.floor(Math.random() * 500) + 100;

    let msg = `╭──「 *ML HERO* 」\n`;
    msg += `│ 🎮 Hero: *${hero}*\n`;
    msg += `│ 🏷️ Role: ${role}\n`;
    msg += `│ ⚡ Difficulty: ${diff}\n`;
    msg += `│ 💪 Power: ${power}\n`;
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("mlhero error:", err);
    await m.react("❌");
    return m.reply(claraWrap("mlhero", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
