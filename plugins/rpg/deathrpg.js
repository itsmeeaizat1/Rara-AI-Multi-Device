// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Death — Cek & proses kematian
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "deathrpg", alias: ["deathrpg", "death", "mati"],
  category: "rpg", description: "Cek status kematian & penalti",
  usage: ".deathrpg", example: ".deathrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("deathrpg", "RPG belum siap.", "error"));
    if (rpg.hp <= 0) {
      const lostGold = Math.floor(rpg.gold * 0.5);
      rpg.gold = Math.floor(rpg.gold * 0.5);
      saveRpg(m, rpg);
      return m.reply(claraWrap("deathrpg", `☠️ Kamu tewas!\nKehilangan: ${lostGold} gold.\nGunakan .revive untuk hidup kembali (biaya 200 gold).`, "error"));
    }
    return m.reply(claraWrap("deathrpg", `❤️ Kamu masih hidup.\nHP: ${rpg.hp}/${rpg.maxHp}`, "info"));
  } catch (e) {
    return m.reply(claraWrap("deathrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
