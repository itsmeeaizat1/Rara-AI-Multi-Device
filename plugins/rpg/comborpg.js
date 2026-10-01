// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Combo — Combo attack berdasar kelas
import { ensureRpg, useEnergy } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "combo", alias: ["combo", "comborpg"],
  category: "rpg", description: "Combo attack (biaya 15 energy, damage berdasar kelas)",
  usage: ".combo", example: ".combo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 15, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("comborpg", "RPG belum siap.", "error"));
    if (rpg.energy < 15) return m.reply(raraRpgBox("comborpg", "Energy tidak cukup. Butuh 15.", "error"));
    useEnergy(m, 15, sock);
    const classBonus = { knight: 100, mage: 90, archer: 80, novice: 60 };
    const baseDmg = classBonus[rpg.job] || 60;
    const crit = Math.random() < rpg.critRate / 100;
    const dmg = Math.floor(baseDmg * (crit ? 2 : 1));
    await m.react("🐣");
  await animGeneric(m, sock, "🔗", "Combo Attack");
    return m.reply(raraRpgBox("comborpg", `🗡️ COMBO ATTACK!\nDamage: *${dmg}*${crit ? " 💥 CRITICAL!" : ""}`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("comborpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
