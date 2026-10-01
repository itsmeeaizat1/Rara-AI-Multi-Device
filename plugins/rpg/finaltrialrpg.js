import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "finaltrialrpg", alias: ["finaltrialrpg", "ujian"],
  category: "rpg", description: "Ujian akhir — lawan 3 boss beruntun (min level 99)",
  usage: ".finaltrialrpg", example: ".finaltrialrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 50, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("finaltrialrpg", "RPG belum siap.", "error"));
    if (rpg.level < 99) return m.reply(raraRpgBox("finaltrialrpg", "🚫 Butuh level 99 untuk ikut ujian akhir.", "error"));
    await m.react("🐣");
  await animGeneric(m, sock, "⚖️", "Final Trial");
    return m.reply(raraRpgBox("finaltrialrpg", `🔥 *UJIAN DIMULAI!*\n\nKamu menghadapi 3 boss secara beruntun...\n1. Shadow Knight\n2. Inferno Dragon\n3. Void Emperor\n\nBersiaplah, petualang!`, "success"));
  } catch (e) { return m.reply(raraRpgBox("finaltrialrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
