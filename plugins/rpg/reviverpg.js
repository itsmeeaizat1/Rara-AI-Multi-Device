// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Revive — Bangkit dari kematian
import { ensureRpg, saveRpg, removeGold } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "revive", alias: ["revive", "reviverpg", "bangkit"],
  category: "rpg", description: "Bangkit dari kematian (biaya 200 gold)",
  usage: ".revive", example: ".revive",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("reviverpg", "RPG belum siap.", "error"));
  await animGeneric(m, sock, "💔", "Reviving");
    if (rpg.hp > 0) return m.reply(raraRpgBox("reviverpg", "❤️ Kamu masih hidup.", "info"));
    if (rpg.gold < 200) return m.reply(raraRpgBox("reviverpg", `💰 Butuh 200 gold untuk hidup kembali. Kamu punya ${rpg.gold}.`, "error"));
    removeGold(m, 200, sock);
    rpg.hp = rpg.maxHp;
    rpg.mana = rpg.maxMana;
    rpg.energy = rpg.maxEnergy;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(raraRpgBox("reviverpg", `Kamu bangkit kembali! HP, Mana, dan Energy pulih penuh.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("reviverpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
