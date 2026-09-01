import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "savepointrpg", alias: ["savepointrpg"], aliases: ["savepointrpg", "savepoint", "savedata"],
  category: "rpg", description: "Simpan progres RPG",
  usage: ".savepointrpg", example: ".savepointrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("savepointrpg", "RPG belum siap.", "error"));
    rpg.savePoint = Date.now();
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("savepointrpg", `💾 Kamu menyentuh *Save Point*. Progresmu disimpan.`, "success"));
  } catch (e) { return m.reply(claraWrap("savepointrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
