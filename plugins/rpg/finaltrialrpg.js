import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "finaltrialrpg", alias: ["finaltrialrpg"], aliases: ["finaltrialrpg", "finaltrial", "ujian"],
  category: "rpg", description: "Ujian akhir — lawan 3 boss beruntun (min level 99)",
  usage: ".finaltrialrpg", example: ".finaltrialrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 50, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("finaltrialrpg", "RPG belum siap.", "error"));
    if (rpg.level < 99) return m.reply(claraWrap("finaltrialrpg", "🚫 Butuh level 99 untuk ikut ujian akhir.", "error"));
    await m.react("🐣");
    return m.reply(claraWrap("finaltrialrpg", `🔥 *UJIAN DIMULAI!*\n\nKamu menghadapi 3 boss secara beruntun...\n1. Shadow Knight\n2. Inferno Dragon\n3. Void Emperor\n\nBersiaplah, petualang!`, "success"));
  } catch (e) { return m.reply(claraWrap("finaltrialrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
