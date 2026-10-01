// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Spirit — Panggil roh petarung
import { ensureRpg, saveRpg, useMana } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "spirit", alias: ["spirit", "spiritrpg", "roh"],
  category: "rpg", description: "Panggil roh petarung (DMG +20 selama 1 jam, 25 mana)",
  usage: ".spirit", example: ".spirit",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 60, energi: 10, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("spiritrpg", "RPG belum siap.", "error"));
    if (rpg.mana < 25) return m.reply(raraRpgBox("spiritrpg", "Mana tidak cukup. Butuh 25.", "error"));
    useMana(m, 25, sock);
    rpg.spiritActive = true;
    rpg.spiritExpire = Date.now() + 3600000;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🏹", "Loading");
    return m.reply(raraRpgBox("spiritrpg", `🪶 Kamu memanggil roh petarung! DMG +20 selama 1 jam.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("spiritrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
