import { ensureRpg, saveRpg, removeItem, addGold, getItemCount } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "exchange", alias: ["exchange", "exchangerpg", "tukar"],
  category: "rpg", description: "Tukar item jadi 200 gold",
  usage: ".exchange <item>", example: ".exchange tulang",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("exchangerpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text) return m.reply(raraRpgBox("exchangerpg", `Gunakan: ${m.prefix}exchangerpg <item>\nContoh: ${m.prefix}exchangerpg tulang`, "guide"));
    if (getItemCount(m, text) <= 0) return m.reply(raraRpgBox("exchangerpg", `Kamu tidak punya item *${text}*.`, "error"));
    removeItem(m, text, 1, sock);
    addGold(m, 200);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "💱", "Exchange");
    return m.reply(raraRpgBox("exchangerpg", `🪙 Kamu menukar *${text}* jadi 200 gold.`, "success"));
  } catch (e) { return m.reply(raraRpgBox("exchangerpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
