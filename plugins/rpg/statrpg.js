// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Stat — Statistik karakter
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "statrpg", alias: ["statrpg", "stat"],
  category: "rpg", description: "Lihat stat karakter RPG",
  usage: ".statrpg", example: ".statrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("statrpg", "RPG belum siap.", "error"));
    return m.reply(claraWrap("statrpg",
      `📊 *STAT KARAKTER*\n⚔️ ATK: ${rpg.atk}\n🛡️ DEF: ${rpg.def}\n⚡ SPD: ${rpg.spd}\n❤️ HP: ${rpg.hp}/${rpg.maxHp}\n💧 Mana: ${rpg.mana}/${rpg.maxMana}\n🎯 Crit: ${rpg.critRate}%\n✨ Evasion: ${rpg.evasion}%`, "info"));
  } catch (e) {
    return m.reply(claraWrap("statrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
