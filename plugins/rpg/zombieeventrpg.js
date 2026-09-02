// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG ZombieEvent — Wabah zombie (owner only)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "zombieeventrpg", alias: ["zombieeventrpg", "zombieevent"],
  category: "rpg", description: "Trigger wabah zombie — semua pemain -20 HP (owner only)",
  usage: ".zombieeventrpg", example: ".zombieeventrpg",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false, cooldown: 120, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🐣");
  await animGeneric(m, sock, "🧟", "Zombie Event");
    return m.reply(claraWrap("zombieeventrpg", `🧟 *WABAH ZOMBIE TERJADI!*\n\nSemua pemain kehilangan 20 HP!\nGunakan .heal untuk pulih!`, "success"));
  } catch (e) {
    return m.reply(claraWrap("zombieeventrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
