// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG DarkMode — Mode gelap RPG
import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "darkmode", alias: ["darkmode", "darkmoderpg"],
  category: "rpg", description: "Aktifkan dark mode RPG (efek negatif meningkat di malam hari)",
  usage: ".darkmode", example: ".darkmode",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("darkmoderpg", "RPG belum siap.", "error"));
    rpg.mode = rpg.mode === "dark" ? "normal" : "dark";
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🌑", "Dark Mode");
    return m.reply(raraRpgBox("darkmoderpg", rpg.mode === "dark" ? `🌑 Kamu memasuki *DARK MODE RPG*. Efek negatif meningkat di malam hari, tapi drop rate juga naik.` : `☀️ Kamu kembali ke *NORMAL MODE*.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("darkmoderpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
