import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "trapwildrpg", alias: ["trapwildrpg", "trapwild", "jebakanwild"],
  category: "rpg", description: "Pasang jebakan hewan liar",
  usage: ".trapwildrpg", example: ".trapwildrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 10, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("trapwildrpg", "RPG belum siap.", "error"));
    rpg.trapwild = true;
    rpg.trapwildExpire = Date.now() + 1800000;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("trapwildrpg", `🪤 Jebakan hewan liar telah dipasang. Aktif 30 menit.`, "success"));
  } catch (e) { return m.reply(claraWrap("trapwildrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
