// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Reincarnate — Reinkarnasi (reset level, bonus permanen)
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "reincarnaterpg", alias: ["reincarnaterpg", "reincarnate"],
  category: "rpg", description: "Reinkarnasi — reset level untuk bonus permanen (min level 30)",
  usage: ".reincarnaterpg", example: ".reincarnaterpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 50, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("reincarnaterpg", "RPG belum siap.", "error"));
    if (rpg.level < 30) return m.reply(claraWrap("reincarnaterpg", "🧘 Hanya yang sudah mencapai level 30 bisa bereinkarnasi.", "error"));
    rpg.level = 1; rpg.exp = 0; rpg.expNext = 100;
    rpg.reincarnation = (rpg.reincarnation || 0) + 1;
    rpg.passiveBonus = (rpg.passiveBonus || 0) + 5;
    rpg.atk += 5; rpg.def += 5;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("reincarnaterpg", `🔁 Kamu telah bereinkarnasi!\nReinkarnasi ke-${rpg.reincarnation}\nBonus permanen: +5% power\nATK & DEF +5 permanen`, "success"));
  } catch (e) {
    return m.reply(claraWrap("reincarnaterpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
