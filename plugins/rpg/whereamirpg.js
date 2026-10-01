// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG WhereAmI — Cek lokasi pemain
import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "whereami", alias: ["whereami", "whereamirpg", "lokasi"],
  category: "rpg", description: "Cek lokasi kamu di dunia RPG",
  usage: ".whereami", example: ".whereami",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("whereamirpg", "RPG belum siap.", "error"));
    const loc = rpg.location || "desa";
  await animGeneric(m, sock, "📍", "Locating");
    return m.reply(raraRpgBox("whereamirpg", `📍 Kamu berada di: *${loc}*`, "info"));
  } catch (e) {
    return m.reply(raraRpgBox("whereamirpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
