import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "savepoint", alias: ["savepoint", "savepointrpg", "savedata"],
  category: "rpg", description: "Simpan progres RPG",
  usage: ".savepoint", example: ".savepoint",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("savepointrpg", "RPG belum siap.", "error"));
    rpg.savePoint = Date.now();
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "💾", "Saving Points");
    return m.reply(novaRpgBox("savepointrpg", `💾 Kamu menyentuh *Save Point*. Progresmu disimpan.`, "success"));
  } catch (e) { return m.reply(novaRpgBox("savepointrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
