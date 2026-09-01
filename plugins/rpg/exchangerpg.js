import { ensureRpg, saveRpg, removeItem, addGold, getItemCount } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "exchangerpg", alias: ["exchangerpg", "exchange", "tukar"],
  category: "rpg", description: "Tukar item jadi 200 gold",
  usage: ".exchangerpg <item>", example: ".exchangerpg tulang",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("exchangerpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text) return m.reply(claraWrap("exchangerpg", `Gunakan: ${m.prefix}exchangerpg <item>\nContoh: ${m.prefix}exchangerpg tulang`, "guide"));
    if (getItemCount(m, text) <= 0) return m.reply(claraWrap("exchangerpg", `Kamu tidak punya item *${text}*.`, "error"));
    removeItem(m, text, 1, sock);
    addGold(m, 200);
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("exchangerpg", `🪙 Kamu menukar *${text}* jadi 200 gold.`, "success"));
  } catch (e) { return m.reply(claraWrap("exchangerpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
