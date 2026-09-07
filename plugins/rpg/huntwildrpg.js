import { ensureRpg, saveRpg, addItem, useEnergy, addExp } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "huntwildrpg", alias: ["huntwildrpg", "huntwild"],
  category: "rpg", description: "Berburu hewan liar (10 energy)",
  usage: ".huntwildrpg", example: ".huntwildrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 15, energi: 10, isEnabled: true,
};
const ANIMALS = ["rusa", "kelinci", "beruang", "serigala", "rubah", "babi hutan"];
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("huntwildrpg", "RPG belum siap.", "error"));
    if (rpg.energy < 10) return m.reply(novaRpgBox("huntwildrpg", "Energy tidak cukup.", "error"));
    useEnergy(m, 10, sock);
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    addItem(m, `daging_${animal}`, 1);
    addExp(m, 20);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🏹", "Hunting Wild");
    return m.reply(novaRpgBox("huntwildrpg", `🏹 Kamu berburu dan mendapatkan *daging ${animal}*!\n+20 EXP`, "success"));
  } catch (e) { return m.reply(novaRpgBox("huntwildrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
