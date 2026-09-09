import { ensureRpg, saveRpg, useEnergy } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "fortify", alias: ["fortify", "fortifyrpg"],
  category: "rpg", description: "Perkuat markas — DEF +10 (butuh markas, 15 energy)",
  usage: ".fortify", example: ".fortify",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 15, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("fortifyrpg", "RPG belum siap.", "error"));
    if (!rpg.build) return m.reply(novaRpgBox("fortifyrpg", "Kamu belum punya markas.", "error"));
    if (rpg.energy < 15) return m.reply(novaRpgBox("fortifyrpg", "Energy tidak cukup.", "error"));
    useEnergy(m, 15, sock);
    rpg.def += 10;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🛡️", "Fortifying");
    return m.reply(novaRpgBox("fortifyrpg", `🏗️ Markasmu diperkuat. DEF +10.`, "success"));
  } catch (e) { return m.reply(novaRpgBox("fortifyrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
