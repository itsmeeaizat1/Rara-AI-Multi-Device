// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG WhereAmI — Cek lokasi pemain
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "whereamirpg", alias: ["whereamirpg"], aliases: ["whereamirpg", "whereami", "lokasi"],
  category: "rpg", description: "Cek lokasi kamu di dunia RPG",
  usage: ".whereamirpg", example: ".whereamirpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("whereamirpg", "RPG belum siap.", "error"));
    const loc = rpg.location || "desa";
    return m.reply(claraWrap("whereamirpg", `📍 Kamu berada di: *${loc}*`, "info"));
  } catch (e) {
    return m.reply(claraWrap("whereamirpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
