// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Combo — Combo attack berdasar kelas
import { ensureRpg, useEnergy } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "comborpg", alias: ["comborpg"], aliases: ["comborpg", "combo"],
  category: "rpg", description: "Combo attack (biaya 15 energy, damage berdasar kelas)",
  usage: ".comborpg", example: ".comborpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 15, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("comborpg", "RPG belum siap.", "error"));
    if (rpg.energy < 15) return m.reply(claraWrap("comborpg", "Energy tidak cukup. Butuh 15.", "error"));
    useEnergy(m, 15, sock);
    const classBonus = { knight: 100, mage: 90, archer: 80, novice: 60 };
    const baseDmg = classBonus[rpg.job] || 60;
    const crit = Math.random() < rpg.critRate / 100;
    const dmg = Math.floor(baseDmg * (crit ? 2 : 1));
    await m.react("🐣");
    return m.reply(claraWrap("comborpg", `🗡️ COMBO ATTACK!\nDamage: *${dmg}*${crit ? " 💥 CRITICAL!" : ""}`, "success"));
  } catch (e) {
    return m.reply(claraWrap("comborpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
