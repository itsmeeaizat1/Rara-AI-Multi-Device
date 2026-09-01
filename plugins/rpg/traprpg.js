// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Trap — Pasang jebakan
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "traprpg", alias: ["traprpg"], aliases: ["traprpg", "trap", "jebak"],
  category: "rpg", description: "Pasang jebakan di lokasi saat ini",
  usage: ".traprpg", example: ".traprpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 20, energi: 10, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("traprpg", "RPG belum siap.", "error"));
    rpg.trap = true;
    rpg.trapExpire = Date.now() + 1800000;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("traprpg", `🕳️ Kamu memasang jebakan di lokasi saat ini. Aktif 30 menit.`, "success"));
  } catch (e) {
    return m.reply(claraWrap("traprpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
