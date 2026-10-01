import { ensureRpg, saveRpg, useEnergy } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "fortify", alias: ["fortify", "fortifyrpg"],
  category: "rpg", description: "Perkuat markas — DEF +10 (butuh markas, 15 energy)",
  usage: ".fortify", example: ".fortify",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 15, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("fortifyrpg", "RPG belum siap.", "error"));
    if (!rpg.build) return m.reply(raraRpgBox("fortifyrpg", "Kamu belum punya markas.", "error"));
    if (rpg.energy < 15) return m.reply(raraRpgBox("fortifyrpg", "Energy tidak cukup.", "error"));
    useEnergy(m, 15, sock);
    rpg.def += 10;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🛡️", "Fortifying");
    return m.reply(raraRpgBox("fortifyrpg", `🏗️ Markasmu diperkuat. DEF +10.`, "success"));
  } catch (e) { return m.reply(raraRpgBox("fortifyrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
