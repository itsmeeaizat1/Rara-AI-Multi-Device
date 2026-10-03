import { ensureRpg, saveRpg, removeItem, regenHP, regenMana, getItemCount } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "itemuse", alias: ["itemuse", "itemuserpg"],
  category: "rpg", description: "Gunakan item dari inventory",
  usage: ".itemuse <item>", example: ".itemuse ramuan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
const ITEM_EFFECTS = {
  ramuan: (rpg, m) => { regenHP(m, 50); return "HP +50"; },
  elixir: (rpg, m) => { regenHP(m, 100); regenMana(m, 50); return "HP +100, Mana +50"; },
  potion: (rpg, m) => { regenHP(m, 30); return "HP +30"; },
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("itemuserpg", "RPG belum siap.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text) return m.reply(raraRpgBox("itemuserpg", `Gunakan: ${m.prefix}itemuserpg <item>\nContoh: ${m.prefix}itemuserpg ramuan`, "guide"));
    if (getItemCount(m, text) <= 0) return m.reply(raraRpgBox("itemuserpg", `Item *${text}* tidak ditemukan di inventory.`, "error"));
    if (!ITEM_EFFECTS[text]) return m.reply(raraRpgBox("itemuserpg", `Item *${text}* tidak bisa digunakan.`, "error"));
    removeItem(m, text, 1, sock);
    const effect = ITEM_EFFECTS[text](rpg, m);
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🎒", "Using Item");
    return m.reply(raraRpgBox("itemuserpg", `✅ Kamu menggunakan *${text}*. Effect: ${effect}`, "success"));
  } catch (e) { return m.reply(raraRpgBox("itemuserpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
