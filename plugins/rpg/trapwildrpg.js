import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "trapwildrpg", alias: ["trapwildrpg", "trapwild", "jebakanwild"],
  category: "rpg", description: "Pasang jebakan hewan liar",
  usage: ".trapwildrpg", example: ".trapwildrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 10, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("trapwildrpg", "RPG belum siap.", "error"));
    rpg.trapwild = true;
    rpg.trapwildExpire = Date.now() + 1800000;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🪤", "Wild Trap");
    return m.reply(novaRpgBox("trapwildrpg", `🪤 Jebakan hewan liar telah dipasang. Aktif 30 menit.`, "success"));
  } catch (e) { return m.reply(novaRpgBox("trapwildrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
