// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Panduan — Panduan lengkap RPG
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "panduan", alias: ["panduan", "panduanrpg", "rpgtutor", "tutorrpg"],
  category: "rpg", description: "Panduan lengkap perintah RPG",
  usage: ".panduan", example: ".panduan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
  await animGeneric(m, sock, "📋", "Loading Guide");
    return m.reply(novaRpgBox("panduanrpg", `💰 Ekonomi:\n.work, .daily, .quest, .hunt, .mine, .fish, .forage, .farm, .cook, .craft\n\n⚔️ Combat:\n.duel, .combo, .buff, .debuff, .curse, .ward, .trap, .defend\n\n🛒 Market:\n.shoprpg, .sell, .trading, .market\n\n🗺️ Eksplorasi:\n.travelrpg, .maprpg, .whereamirpg, .weathersystemrpg\n\n🏰 Sistem:\n.classrpg, .buildrpg, .statrpg, .medalrpg, .mailbox, .guildrpg, .kingdom\n\n🎲 Event:\n.worldevent, .zombieevent, .bossfight, .dragonraid\n\n🔮 Mystical:\n.blessrpg, .spirit, .mutate, .timetravel, .reincarnate, .distortion\n\n🎭 Sosial:\n.roleplayrpg, .riddlerpg, .lorerpg, .narratorrpg, .panduanrpg`, "info"));
  } catch (e) {
    return m.reply(novaRpgBox("panduanrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
