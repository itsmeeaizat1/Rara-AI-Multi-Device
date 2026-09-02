import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
const pluginConfig = {
  name: "passiverpg", alias: ["passiverpg", "passive", "pasif"],
  category: "rpg", description: "Lihat skill pasif",
  usage: ".passiverpg", example: ".passiverpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("passiverpg", "RPG belum siap.", "error"));
    const passive = rpg.passive || "Belum ada";
  await animGeneric(m, sock, "🛡️", "Passive Skill");
    return m.reply(claraWrap("passiverpg", `🌀 *Skill Pasif:* ${passive}`, "info"));
  } catch (e) { return m.reply(claraWrap("passiverpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
