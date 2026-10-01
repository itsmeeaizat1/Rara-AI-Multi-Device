// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Distortion — Zona distorsi (random loot)
import { ensureRpg, saveRpg, addItem, useEnergy } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "distortion", alias: ["distortion", "distortionrpg"],
  category: "rpg", description: "Masuk zona distorsi — dapat random loot (biaya 20 energy)",
  usage: ".distortion", example: ".distortion",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 20, isEnabled: true,
};

const EFFECTS = ["🌪️ Kabut misterius mengelilingimu", "🪞 Cermin waktu retak", "🕳️ Lubang ke dimensi lain terbuka"];
const LOOT = ["potion", "elixir", "fabric", "bone", "gold", "gem_fragment"];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("distortionrpg", "RPG belum siap.", "error"));
    if (rpg.energy < 20) return m.reply(raraRpgBox("distortionrpg", "Energy tidak cukup.", "error"));
    useEnergy(m, 20, sock);
    const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
    const item = LOOT[Math.floor(Math.random() * LOOT.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    addItem(m, item, qty);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🌀", "Distortion");
    return m.reply(raraRpgBox("distortionrpg", `${effect}\n\n🎁 Kamu mendapat ${qty}x *${item}* dari zona distorsi.`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("distortionrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
