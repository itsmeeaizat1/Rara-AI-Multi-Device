// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG ZombieEvent — Wabah zombie (owner only)
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "zombieevent", alias: ["zombieevent", "zombieeventrpg"],
  category: "rpg", description: "Trigger wabah zombie — semua pemain -20 HP (owner only)",
  usage: ".zombieevent", example: ".zombieevent",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false, cooldown: 120, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🐣");
  await animGeneric(m, sock, "🧟", "Zombie Event");
    return m.reply(raraRpgBox("zombieeventrpg", `🧟 *WABAH ZOMBIE TERJADI!*\n\nSemua pemain kehilangan 20 HP!\nGunakan .heal untuk pulih!`, "success"));
  } catch (e) {
    return m.reply(raraRpgBox("zombieeventrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
