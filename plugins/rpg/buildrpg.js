// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Build — Bangun markas pemain
import { ensureRpg, saveRpg, removeGold } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "build", alias: ["build", "buildrpg", "markas"],
  category: "rpg", description: "Bangun markas (biaya 500 gold, +DEF, +safezone)",
  usage: ".build", example: ".build",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("buildrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));
  await animGeneric(m, sock, "🏗️", "Building");
    if (rpg.build) return m.reply(raraRpgBox("buildrpg", `🏠 Kamu sudah punya markas: *${rpg.build}*`, "info"));
    if (rpg.gold < 500) return m.reply(raraRpgBox("buildrpg", `💰 Butuh 500 gold. Kamu punya ${rpg.gold}.`, "error"));
    removeGold(m, 500, sock);
    rpg.build = "markas kayu";
    rpg.def += 10;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(raraRpgBox("buildrpg", `🧱 Kamu membangun *markas kayu*.\nDEF +10. Markas adalah safezone aman dari serangan.`, "success"));
  } catch (e) {
    console.error("buildrpg error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("buildrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
