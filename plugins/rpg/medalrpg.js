// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Medal — Tampilkan medali pemain
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "medalrpg", alias: ["medalrpg", "medal", "medali"],
  category: "rpg", description: "Tampilkan medali yang dimiliki",
  usage: ".medalrpg", example: ".medalrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("medalrpg", "RPG belum siap.", "error"));
    const medals = rpg.achievements || [];
    if (!medals.length) return m.reply(novaRpgBox("medalrpg", "🎖️ Kamu belum punya medali.", "info"));
    await animGeneric(m, sock, '🏅', 'Loading medals');
    return m.reply(novaRpgBox("medalrpg", `🎖️ *MEDALI-MU:*\n${medals.map(a => `🏅 ${a}`).join("\n")}`, "info"));
  } catch (e) {
    return m.reply(novaRpgBox("medalrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
