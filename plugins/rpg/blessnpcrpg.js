import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "blessnpc", alias: ["blessnpc", "blessnpcrpg"],
  category: "rpg", description: "Blessing dari NPC (random buff)",
  usage: ".blessnpc", example: ".blessnpc",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 60, energi: 0, isEnabled: true,
};
const BONUSES = ["+10 HP", "+5 DEF", "+100 EXP", "+5 ATK", "+3 SPD", "+5% Crit"];
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("blessnpcrpg", "RPG belum siap.", "error"));
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
    return m.reply(raraRpgBox("blessnpcrpg", `NPC memberkati kamu!\nEffect: *${buff}*`, "success"));
  } catch (e) { return m.reply(raraRpgBox("blessnpcrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
