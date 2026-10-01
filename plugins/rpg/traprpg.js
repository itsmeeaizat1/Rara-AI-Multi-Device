// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Trap — Pasang jebakan
import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "trap", alias: ["trap", "traprpg", "jebak"],
  category: "rpg", description: "Pasang jebakan di lokasi saat ini",
  usage: ".trap", example: ".trap",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 10, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("traprpg", "RPG belum siap.", "error"));
    rpg.trap = true;
    rpg.trapExpire = Date.now() + 1800000;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🪤", "Setting Trap");
    return m.reply(raraRpgBox("traprpg", `🕳️ Kamu memasang jebakan di lokasi saat ini. Aktif 30 menit.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("traprpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
