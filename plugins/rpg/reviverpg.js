// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Revive — Bangkit dari kematian
import { ensureRpg, saveRpg, removeGold } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "reviverpg", alias: ["reviverpg", "revive", "bangkit"],
  category: "rpg", description: "Bangkit dari kematian (biaya 200 gold)",
  usage: ".reviverpg", example: ".reviverpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("reviverpg", "RPG belum siap.", "error"));
    if (rpg.hp > 0) return m.reply(claraWrap("reviverpg", "❤️ Kamu masih hidup.", "info"));
    if (rpg.gold < 200) return m.reply(claraWrap("reviverpg", `💰 Butuh 200 gold untuk hidup kembali. Kamu punya ${rpg.gold}.`, "error"));
    removeGold(m, 200, sock);
    rpg.hp = rpg.maxHp;
    rpg.mana = rpg.maxMana;
    rpg.energy = rpg.maxEnergy;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("reviverpg", `✨ Kamu bangkit kembali! HP, Mana, dan Energy pulih penuh.`, "success"));
  } catch (e) {
    return m.reply(claraWrap("reviverpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
