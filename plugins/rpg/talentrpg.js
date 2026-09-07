import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "talentrpg", alias: ["talentrpg", "talent"],
  category: "rpg", description: "Lihat talent berdasar kelas",
  usage: ".talentrpg", example: ".talentrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
const TALENTS = {
  knight: "⚔️ Damage +10 saat duel",
  mage: "🔮 Skill cooldown -10%",
  archer: "🏹 Critical +15%",
  novice: "Pilih kelas dulu (.classrpg)",
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("talentrpg", "RPG belum siap.", "error"));
    const talent = TALENTS[rpg.job] || "Belum tersedia";
  await animGeneric(m, sock, "🌟", "Loading Talents");
    return m.reply(novaRpgBox("talentrpg", `💡 *Talent Class ${rpg.job}:*\n${talent}`, "info"));
  } catch (e) { return m.reply(novaRpgBox("talentrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
