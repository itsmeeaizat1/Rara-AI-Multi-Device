// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Defend — Perkuat pertahanan markas
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "defendrpg", alias: ["defendrpg", "defend", "pertahanan"],
  category: "rpg", description: "Perkuat markas. DEF +50 (butuh markas)",
  usage: ".defendrpg", example: ".defendrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 20, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("defendrpg", "RPG belum siap.", "error"));
    if (!rpg.build) return m.reply(novaRpgBox("defendrpg", "🧱 Kamu belum punya markas. Ketik .buildrpg dulu.", "guide"));
    rpg.def += 50;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🛡️", "Defending");
    return m.reply(novaRpgBox("defendrpg", `🛡️ Kamu memperkuat markas. DEF bertambah +50.`, "success"));
  } catch (e) {
    return m.reply(novaRpgBox("defendrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
