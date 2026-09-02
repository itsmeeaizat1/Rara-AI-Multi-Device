// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Buff — Buff ATK diri sendiri
import { ensureRpg, saveRpg, useMana } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "buffrpg", alias: ["buffrpg", "buff"],
  category: "rpg", description: "Buff ATK +10 (biaya 10 mana)",
  usage: ".buffrpg", example: ".buffrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("buffrpg", "RPG belum siap.", "error"));
    if (rpg.mana < 10) return m.reply(claraWrap("buffrpg", "Mana tidak cukup. Butuh 10 mana.", "error"));
    useMana(m, 10, sock);
    rpg.atk += 10;
    rpg.buffActive = true;
    rpg.buffExpire = Date.now() + 3600000;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "💪", "Applying Buff");
    return m.reply(claraWrap("buffrpg", `🔆 Kamu menerima buff: ATK +10 (1 jam)`, "success"));
  } catch (e) {
    return m.reply(claraWrap("buffrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
