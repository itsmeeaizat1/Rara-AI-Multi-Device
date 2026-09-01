// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Medal — Tampilkan medali pemain
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "medalrpg", alias: ["medalrpg", "medal", "medali"],
  category: "rpg", description: "Tampilkan medali yang dimiliki",
  usage: ".medalrpg", example: ".medalrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("medalrpg", "RPG belum siap.", "error"));
    const medals = rpg.achievements || [];
    if (!medals.length) return m.reply(claraWrap("medalrpg", "🎖️ Kamu belum punya medali.", "info"));
    return m.reply(claraWrap("medalrpg", `🎖️ *MEDALI-MU:*\n${medals.map(a => `🏅 ${a}`).join("\n")}`, "info"));
  } catch (e) {
    return m.reply(claraWrap("medalrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
