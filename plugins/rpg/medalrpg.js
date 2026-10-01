// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Medal — Tampilkan medali pemain
import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "medal", alias: ["medal", "medalrpg", "medali"],
  category: "rpg", description: "Tampilkan medali yang dimiliki",
  usage: ".medal", example: ".medal",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("medalrpg", "RPG belum siap.", "error"));
    const medals = rpg.achievements || [];
    if (!medals.length) return m.reply(raraRpgBox("medalrpg", "🎖️ Kamu belum punya medali.", "info"));
    await animGeneric(m, sock, '🏅', 'Loading medals');
    return m.reply(raraRpgBox("medalrpg", `🎖️ *MEDALI-MU:*\n${medals.map(a => `🏅 ${a}`).join("\n")}`, "info"));
  } catch (e) {
    return m.reply(raraRpgBox("medalrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
