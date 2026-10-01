import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "codex", alias: ["codex", "codexrpg"],
  category: "rpg", description: "Kodex item RPG",
  usage: ".codex", example: ".codex",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
  await animGeneric(m, sock, "📖", "Opening Codex");
    return m.reply(raraRpgBox("codexrpg", `📜 *KODEX ITEM RPG*\n\n🗡️ pedang → +atk\n🛡️ armor → +def\n🧪 ramuan → pulih HP\n💀 tulang + kulit → ramuan (via .alchemist)\n🔑 kunci → buka peti\n fragmen → crafting material\n💎 gem → premium currency`, "info"));
  } catch (e) { return m.reply(raraRpgBox("codexrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
