import { ensureRpg, saveRpg, removeGold } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "learnskill", alias: ["learnskill", "learnskillrpg", "belajarskill"],
  category: "rpg", description: "Pelajari skill baru (biaya 200 gold)",
  usage: ".learnskill <skill>", example: ".learnskill fireball",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 10, isEnabled: true,
};
const SKILLS = ["fireball", "heal", "iceblast", "thunderstrike", "shadowveil", "holyshield"];
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("learnskillrpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text || !SKILLS.includes(text)) return m.reply(raraRpgBox("learnskillrpg", `Skill tersedia: ${SKILLS.join(", ")}\nContoh: ${m.prefix}learnskillrpg fireball`, "guide"));
    if (rpg.gold < 200) return m.reply(raraRpgBox("learnskillrpg", `💰 Butuh 200 gold. Kamu punya ${rpg.gold}.`, "error"));
    if (!rpg.skills) rpg.skills = [];
  await animGeneric(m, sock, "📖", "Learning Skill");
    if (rpg.skills.includes(text)) return m.reply(raraRpgBox("learnskillrpg", "Kamu sudah punya skill ini.", "info"));
    removeGold(m, 200, sock);
    rpg.skills.push(text);
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(raraRpgBox("learnskillrpg", `🎓 Kamu mempelajari skill *${text}*!`, "success"));
  } catch (e) { return m.reply(raraRpgBox("learnskillrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
