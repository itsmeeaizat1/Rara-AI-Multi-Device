import { ensureRpg, saveRpg, useEnergy } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
const pluginConfig = {
  name: "fortifyrpg", alias: ["fortifyrpg", "fortify"],
  category: "rpg", description: "Perkuat markas — DEF +10 (butuh markas, 15 energy)",
  usage: ".fortifyrpg", example: ".fortifyrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 15, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("fortifyrpg", "RPG belum siap.", "error"));
    if (!rpg.build) return m.reply(claraWrap("fortifyrpg", "Kamu belum punya markas.", "error"));
    if (rpg.energy < 15) return m.reply(claraWrap("fortifyrpg", "Energy tidak cukup.", "error"));
    useEnergy(m, 15, sock);
    rpg.def += 10;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🛡️", "Fortifying");
    return m.reply(claraWrap("fortifyrpg", `🏗️ Markasmu diperkuat. DEF +10.`, "success"));
  } catch (e) { return m.reply(claraWrap("fortifyrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
