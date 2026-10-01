import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "atmall", alias: ["atmall", "atmallrpg", "atmleaderboard"],
  category: "rpg", description: "Leaderboard bank terkaya",
  usage: ".atmall", example: ".atmall",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("atmallrpg", "RPG belum siap.", "error"));
  await animGeneric(m, sock, "🛒", "ATM Transaction");
    return m.reply(raraRpgBox("atmallrpg", `🏦 *ATMALL LEADERBOARD*\n\nCek ranking bank terkaya di grup ini.\nGunakan .leaderboardrpg untuk ranking lengkap.`, "info"));
  } catch (e) { return m.reply(raraRpgBox("atmallrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
