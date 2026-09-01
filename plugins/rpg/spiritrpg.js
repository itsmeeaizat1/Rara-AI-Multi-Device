// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Spirit — Panggil roh petarung
import { ensureRpg, saveRpg, useMana } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spiritrpg", alias: ["spiritrpg", "spirit", "roh"],
  category: "rpg", description: "Panggil roh petarung (DMG +20 selama 1 jam, 25 mana)",
  usage: ".spiritrpg", example: ".spiritrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 60, energi: 10, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("spiritrpg", "RPG belum siap.", "error"));
    if (rpg.mana < 25) return m.reply(claraWrap("spiritrpg", "Mana tidak cukup. Butuh 25.", "error"));
    useMana(m, 25, sock);
    rpg.spiritActive = true;
    rpg.spiritExpire = Date.now() + 3600000;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("spiritrpg", `🪶 Kamu memanggil roh petarung! DMG +20 selama 1 jam.`, "success"));
  } catch (e) {
    return m.reply(claraWrap("spiritrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
