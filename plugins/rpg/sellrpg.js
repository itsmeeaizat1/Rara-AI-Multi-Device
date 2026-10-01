import { animShop } from "../../src/lib/rara-rpg-anim.js";
import { ensureRpg, saveRpg, removeItem, addGold, getItemCount } from "../../src/lib/rara-rpg-service.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "sell", alias: ["sell", "sellrpg", "jual"],
  category: "rpg", description: "Jual item dari inventory (100 gold per item)",
  usage: ".sell <item>", example: ".sell ramuan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("sellrpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text) return m.reply(raraRpgBox("sellrpg", `Ketik nama item untuk dijual.\nContoh: ${m.prefix}sellrpg ramuan`, "guide"));
    if (getItemCount(m, text) <= 0) return m.reply(raraRpgBox("sellrpg", `Kamu tidak punya *${text}*.`, "error"));
    removeItem(m, text, 1, sock);
    addGold(m, 100);
    saveRpg(m, rpg);
    await m.react("🐣");
    await animShop(m, sock, "sell");
    return m.reply(raraRpgBox("sellrpg", `💰 Kamu menjual *${text}* seharga 100 gold.`, "success"));
  } catch (e) { return m.reply(raraRpgBox("sellrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
