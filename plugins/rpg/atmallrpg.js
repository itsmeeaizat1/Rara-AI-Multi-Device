import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "atmallrpg", alias: ["atmallrpg", "atmall", "atmleaderboard"],
  category: "rpg", description: "Leaderboard bank terkaya",
  usage: ".atmallrpg", example: ".atmallrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("atmallrpg", "RPG belum siap.", "error"));
  await animGeneric(m, sock, "🛒", "ATM Transaction");
    return m.reply(novaRpgBox("atmallrpg", `🏦 *ATMALL LEADERBOARD*\n\nCek ranking bank terkaya di grup ini.\nGunakan .leaderboardrpg untuk ranking lengkap.`, "info"));
  } catch (e) { return m.reply(novaRpgBox("atmallrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
