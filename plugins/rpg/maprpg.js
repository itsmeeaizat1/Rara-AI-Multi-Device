// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Map — Tampilkan peta dunia
import { ensureRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "map", alias: ["map", "maprpg", "peta"],
  category: "rpg", description: "Tampilkan peta dunia RPG",
  usage: ".map", example: ".map",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("maprpg", "RPG belum siap.", "error"));
    const loc = rpg.location || "desa";
    await animGeneric(m, sock, '🗺️', 'Opening map');
    return m.reply(raraRpgBox("maprpg", `🗺️ *PETA DUNIA RPG*\n\n🌲 Hutan Kabut\n⛩️ Desa Hilang\n🏰 Kastil Tua\n🌋 Gunung Merapi\n🏯 Kuil Kuno\n\n📍 Lokasi kamu: *${loc}*\nGunakan .travelrpg <lokasi> untuk pindah.`, "info"));
  } catch (e) {
    return m.reply(raraRpgBox("maprpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
