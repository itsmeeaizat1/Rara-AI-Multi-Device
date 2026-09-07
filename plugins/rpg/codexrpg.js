import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "codexrpg", alias: ["codexrpg", "codex"],
  category: "rpg", description: "Kodex item RPG",
  usage: ".codexrpg", example: ".codexrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
  await animGeneric(m, sock, "📖", "Opening Codex");
    return m.reply(novaRpgBox("codexrpg", `📜 *KODEX ITEM RPG*\n\n🗡️ pedang → +atk\n🛡️ armor → +def\n🧪 ramuan → pulih HP\n💀 tulang + kulit → ramuan (via .alchemist)\n🔑 kunci → buka peti\n fragmen → crafting material\n💎 gem → premium currency`, "info"));
  } catch (e) { return m.reply(novaRpgBox("codexrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
