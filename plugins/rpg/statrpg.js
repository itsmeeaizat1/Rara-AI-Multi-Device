// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Stat — Statistik karakter (tampilan bar interaktif)
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, renderStatBar } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "statrpg", alias: ["statrpg", "stat"],
  category: "rpg", description: "Lihat stat karakter RPG",
  usage: ".statrpg", example: ".statrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("statrpg", "RPG belum siap.", "error"));

    const msg = novaGameBox({
      title: "stat karakter", icon: "📊",
      flavor: `📊 *${(m.pushName || "Player").toUpperCase()} SIAP TEMPUR!*`,
      body: [
        `│ • 🏅 Level : ${rpg.level || 1}`,
        "",
        `│ ❤️ HP    : ${renderStatBar(rpg.hp, rpg.maxHp)} (${rpg.hp}/${rpg.maxHp})`,
        `│ 💙 Mana  : ${renderStatBar(rpg.mana, rpg.maxMana)} (${rpg.mana}/${rpg.maxMana})`,
        `│ ⚡ Energi : ${renderStatBar(rpg.energy, rpg.maxEnergy)} (${rpg.energy}/${rpg.maxEnergy})`,
        "",
        `│ • ⚔️ ATK : ${rpg.atk}   🛡️ DEF : ${rpg.def}   💨 SPD : ${rpg.spd}`,
        `│ • 🎯 Crit : ${rpg.critRate || 0}%   💫 Evasion : ${rpg.evasion || 0}%`,
      ].join("\n"),
      cta: gameCTA("adventure"),
    });
    return m.reply(msg);
  } catch (e) {
    return m.reply(claraWrap("statrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
