// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mutate — Ubah skill random
import { ensureRpg, saveRpg, removeGold } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "mutate", alias: ["mutate", "mutaterpg"],
  category: "rpg", description: "Mutasi skill random (biaya 300 gold)",
  usage: ".mutate", example: ".mutate",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 60, energi: 10, isEnabled: true,
};

const SKILLS = ["firewave", "windblast", "darkspike", "thunderbolt", "iceshard", "holylight"];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("mutaterpg", "RPG belum siap.", "error"));
    if (rpg.gold < 300) return m.reply(novaRpgBox("mutaterpg", `💰 Butuh 300 gold. Kamu punya ${rpg.gold}.`, "error"));
    removeGold(m, 300, sock);
    const skill = SKILLS[Math.floor(Math.random() * SKILLS.length)];
    if (!rpg.skills) rpg.skills = [];
    if (rpg.skills.length > 0) rpg.skills[0] = skill; else rpg.skills.push(skill);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🧬", "Mutation");
    return m.reply(novaRpgBox("mutaterpg", `🧬 Skillmu berubah menjadi *${skill}*!`, "success"));
  } catch (e) {
    return m.reply(novaRpgBox("mutaterpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
