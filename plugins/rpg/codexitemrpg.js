import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "codexitem", alias: ["codexitem", "codexitemrpg"],
  category: "rpg", description: "Detail item RPG",
  usage: ".codexitem", example: ".codexitem",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
  await animGeneric(m, sock, "📖", "Opening Codex Items");
    return m.reply(novaRpgBox("codexitemrpg", `📚 *KODEX ITEM DETAIL*\n\n🧪 Ramuan: +50 HP\n🔑 Kunci: Buka peti harta\n💀 Tulang: Bahan alchemy\n🌿 Herbal: Bahan crafting\n⚔️ Pedang: +15 ATK\n🛡️ Armor: +15 DEF\n Fragmen: Crafting material\n💎 Gem: Premium currency`, "info"));
  } catch (e) { return m.reply(novaRpgBox("codexitemrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
