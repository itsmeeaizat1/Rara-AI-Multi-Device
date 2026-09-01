// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Build — Bangun markas pemain
import { ensureRpg, saveRpg, removeGold } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "buildrpg", alias: ["buildrpg", "build", "markas"],
  category: "rpg", description: "Bangun markas (biaya 500 gold, +DEF, +safezone)",
  usage: ".buildrpg", example: ".buildrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("buildrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));
    if (rpg.build) return m.reply(claraWrap("buildrpg", `🏠 Kamu sudah punya markas: *${rpg.build}*`, "info"));
    if (rpg.gold < 500) return m.reply(claraWrap("buildrpg", `💰 Butuh 500 gold. Kamu punya ${rpg.gold}.`, "error"));
    removeGold(m, 500, sock);
    rpg.build = "markas kayu";
    rpg.def += 10;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("buildrpg", `🧱 Kamu membangun *markas kayu*.\nDEF +10. Markas adalah safezone aman dari serangan.`, "success"));
  } catch (e) {
    console.error("buildrpg error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("buildrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
