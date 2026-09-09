// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Death — Cek & proses kematian
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "death", alias: ["death", "deathrpg", "mati"],
  category: "rpg", description: "Cek status kematian & penalti",
  usage: ".death", example: ".death",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("deathrpg", "RPG belum siap.", "error"));
    if (rpg.hp <= 0) {
      const lostGold = Math.floor(rpg.gold * 0.5);
      rpg.gold = Math.floor(rpg.gold * 0.5);
      saveRpg(m, rpg);
      return m.reply(novaRpgBox("deathrpg", `☠️ Kamu tewas!\nKehilangan: ${lostGold} gold.\nGunakan .revive untuk hidup kembali (biaya 200 gold).`, "error"));
    }
  await animGeneric(m, sock, "☠️", "Death Check");
    return m.reply(novaRpgBox("deathrpg", `❤️ Kamu masih hidup.\nHP: ${rpg.hp}/${rpg.maxHp}`, "info"));
  } catch (e) {
    return m.reply(novaRpgBox("deathrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
