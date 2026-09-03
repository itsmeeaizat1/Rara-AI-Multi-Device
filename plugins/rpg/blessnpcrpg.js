import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
const pluginConfig = {
  name: "blessnpcrpg", alias: ["blessnpcrpg", "blessnpc"],
  category: "rpg", description: "Blessing dari NPC (random buff)",
  usage: ".blessnpcrpg", example: ".blessnpcrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 60, energi: 0, isEnabled: true,
};
const BONUSES = ["+10 HP", "+5 DEF", "+100 EXP", "+5 ATK", "+3 SPD", "+5% Crit"];
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("blessnpcrpg", "RPG belum siap.", "error"));
    const buff = BONUSES[Math.floor(Math.random() * BONUSES.length)];
    if (buff.includes("HP")) rpg.hp = Math.min(rpg.hp + 10, rpg.maxHp);
    if (buff.includes("DEF")) rpg.def += 5;
    if (buff.includes("EXP")) rpg.exp += 100;
    if (buff.includes("ATK")) rpg.atk += 5;
    if (buff.includes("SPD")) rpg.spd += 3;
    if (buff.includes("Crit")) rpg.critRate += 5;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🙏", "Blessing NPC");
    return m.reply(claraWrap("blessnpcrpg", `NPC memberkati kamu!\nEffect: *${buff}*`, "success"));
  } catch (e) { return m.reply(claraWrap("blessnpcrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
