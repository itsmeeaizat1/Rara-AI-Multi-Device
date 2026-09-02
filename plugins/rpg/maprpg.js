// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Map — Tampilkan peta dunia
import { ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "maprpg", alias: ["maprpg", "map", "peta"],
  category: "rpg", description: "Tampilkan peta dunia RPG",
  usage: ".maprpg", example: ".maprpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("maprpg", "RPG belum siap.", "error"));
    const loc = rpg.location || "desa";
    await animGeneric(m, sock, '🗺️', 'Opening map');
    return m.reply(claraWrap("maprpg", `🗺️ *PETA DUNIA RPG*\n\n🌲 Hutan Kabut\n⛩️ Desa Hilang\n🏰 Kastil Tua\n🌋 Gunung Merapi\n🏯 Kuil Kuno\n\n📍 Lokasi kamu: *${loc}*\nGunakan .travelrpg <lokasi> untuk pindah.`, "info"));
  } catch (e) {
    return m.reply(claraWrap("maprpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
