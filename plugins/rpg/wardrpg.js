// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Ward — Aktifkan ward proteksi
import { ensureRpg, saveRpg, useMana } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "ward", alias: ["ward", "wardrpg", "perlindungan"],
  category: "rpg", description: "Aktifkan ward proteksi dari trap & curse (10 mana)",
  usage: ".ward", example: ".ward",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("wardrpg", "RPG belum siap.", "error"));
    if (rpg.mana < 10) return m.reply(raraRpgBox("wardrpg", "Mana tidak cukup.", "error"));
    useMana(m, 10, sock);
    rpg.ward = true;
    rpg.wardExpire = Date.now() + 3600000;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🛡️", "Warding");
    return m.reply(raraRpgBox("wardrpg", `🔆 Ward aktif! Lokasimu aman dari trap & curse selama 1 jam.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("wardrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
