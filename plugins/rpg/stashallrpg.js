import { ensureRpg, saveRpg, addItem, removeItem, getItemCount } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "stashallrpg", alias: ["stashallrpg", "stashall"],
  category: "rpg", description: "Pindah semua item ke storage",
  usage: ".stashallrpg", example: ".stashallrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("stashallrpg", "RPG belum siap.", "error"));
    const inv = rpg.inventory || {};
    const items = Object.keys(inv).filter(k => inv[k] > 0);
    if (!items.length) return m.reply(claraWrap("stashallrpg", "Inventory kosong.", "info"));
    let count = 0;
    for (const item of items) {
      const qty = inv[item];
      if (!rpg.storage) rpg.storage = {};
      rpg.storage[item] = (rpg.storage[item] || 0) + qty;
      removeItem(m, item, qty, sock);
      count += qty;
    }
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("stashallrpg", `📦 ${count} item dipindah ke storage.`, "success"));
  } catch (e) { return m.reply(claraWrap("stashallrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
