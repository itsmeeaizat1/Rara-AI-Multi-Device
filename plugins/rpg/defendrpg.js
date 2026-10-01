// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Defend — Perkuat pertahanan markas
import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "defend", alias: ["defend", "defendrpg", "pertahanan"],
  category: "rpg", description: "Perkuat markas. DEF +50 (butuh markas)",
  usage: ".defend", example: ".defend",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 20, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("defendrpg", "RPG belum siap.", "error"));
    if (!rpg.build) return m.reply(raraRpgBox("defendrpg", "🧱 Kamu belum punya markas. Ketik .buildrpg dulu.", "guide"));
    rpg.def += 50;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🛡️", "Defending");
    return m.reply(raraRpgBox("defendrpg", `🛡️ Kamu memperkuat markas. DEF bertambah +50.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("defendrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
