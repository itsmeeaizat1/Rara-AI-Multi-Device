import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "passive", alias: ["passive", "passiverpg", "pasif"],
  category: "rpg", description: "Lihat skill pasif",
  usage: ".passive", example: ".passive",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("passiverpg", "RPG belum siap.", "error"));
    const passive = rpg.passive || "Belum ada";
  await animGeneric(m, sock, "🛡️", "Passive Skill");
    return m.reply(raraRpgBox("passiverpg", `🌀 *Skill Pasif:* ${passive}`, "info"));
  } catch (e) { return m.reply(raraRpgBox("passiverpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
