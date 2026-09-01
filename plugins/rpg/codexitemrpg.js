import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "codexitemrpg", alias: ["codexitemrpg", "codexitem"],
  category: "rpg", description: "Detail item RPG",
  usage: ".codexitemrpg", example: ".codexitemrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    return m.reply(claraWrap("codexitemrpg", `📚 *KODEX ITEM DETAIL*\n\n🧪 Ramuan: +50 HP\n🔑 Kunci: Buka peti harta\n💀 Tulang: Bahan alchemy\n🌿 Herbal: Bahan crafting\n⚔️ Pedang: +15 ATK\n🛡️ Armor: +15 DEF\n✨ Fragmen: Crafting material\n💎 Gem: Premium currency`, "info"));
  } catch (e) { return m.reply(claraWrap("codexitemrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
