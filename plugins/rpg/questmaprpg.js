import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "questmap", alias: ["questmap", "questmaprpg"],
  category: "rpg", description: "Peta quest dunia RPG",
  usage: ".questmap", example: ".questmap",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
  await animGeneric(m, sock, "🗺️", "Quest Map");
    return m.reply(novaRpgBox("questmaprpg",
      `🗺️ *PETA QUEST DUNIA RPG*\n\n1. 🌲 Hutan Gelap — Kalahkan 3 serigala\n2. 🏰 Kastil Retak — Temukan Pedang Warisan\n3. 🌋 Gunung Lava — Bertahan dari Boss Api\n4. 🏯 Kuil Kuno — Pecahkan teka-teki\n5. 🌊 Laut Dalam — Buktikan keberanian\n\nGunakan .quest untuk ambil quest.`, "info"));
  } catch (e) { return m.reply(novaRpgBox("questmaprpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
