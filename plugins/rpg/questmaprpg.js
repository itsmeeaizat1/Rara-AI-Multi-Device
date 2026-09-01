import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "questmaprpg", alias: ["questmaprpg", "questmap"],
  category: "rpg", description: "Peta quest dunia RPG",
  usage: ".questmaprpg", example: ".questmaprpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    return m.reply(claraWrap("questmaprpg",
      `🗺️ *PETA QUEST DUNIA RPG*\n\n1. 🌲 Hutan Gelap — Kalahkan 3 serigala\n2. 🏰 Kastil Retak — Temukan Pedang Warisan\n3. 🌋 Gunung Lava — Bertahan dari Boss Api\n4. 🏯 Kuil Kuno — Pecahkan teka-teki\n5. 🌊 Laut Dalam — Buktikan keberanian\n\nGunakan .quest untuk ambil quest.`, "info"));
  } catch (e) { return m.reply(claraWrap("questmaprpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
