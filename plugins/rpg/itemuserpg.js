import { ensureRpg, saveRpg, removeItem, regenHP, regenMana, getItemCount } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "itemuserpg", alias: ["itemuserpg", "itemuse"],
  category: "rpg", description: "Gunakan item dari inventory",
  usage: ".itemuserpg <item>", example: ".itemuserpg ramuan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
const ITEM_EFFECTS = {
  ramuan: rpg => { regenHP(m, 50); return "HP +50"; },
  elixir: rpg => { regenHP(m, 100); regenMana(m, 50); return "HP +100, Mana +50"; },
  potion: rpg => { regenHP(m, 30); return "HP +30"; },
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("itemuserpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text) return m.reply(claraWrap("itemuserpg", `Gunakan: ${m.prefix}itemuserpg <item>\nContoh: ${m.prefix}itemuserpg ramuan`, "guide"));
    if (getItemCount(m, text) <= 0) return m.reply(claraWrap("itemuserpg", `Item *${text}* tidak ditemukan di inventory.`, "error"));
    if (!ITEM_EFFECTS[text]) return m.reply(claraWrap("itemuserpg", `Item *${text}* tidak bisa digunakan.`, "error"));
    removeItem(m, text, 1, sock);
    const effect = ITEM_EFFECTS[text](rpg);
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("itemuserpg", `✅ Kamu menggunakan *${text}*. Effect: ${effect}`, "success"));
  } catch (e) { return m.reply(claraWrap("itemuserpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
