import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "talent", alias: ["talent", "talentrpg"],
  category: "rpg", description: "Lihat talent berdasar kelas",
  usage: ".talent", example: ".talent",
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
    if (!rpg) return m.reply(raraRpgBox("talentrpg", "RPG belum siap.", "error"));
    const talent = TALENTS[rpg.job] || "Belum tersedia";
  await animGeneric(m, sock, "🌟", "Loading Talents");
    return m.reply(raraRpgBox("talentrpg", `💡 *Talent Class ${rpg.job}:*\n${talent}`, "info"));
  } catch (e) { return m.reply(raraRpgBox("talentrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
