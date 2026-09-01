// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Bless — Blessing harian random buff
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "blessrpg", alias: ["blessrpg"], aliases: ["blessrpg", "bless", "berkat"],
  category: "rpg", description: "Terima blessing harian (random buff)",
  usage: ".blessrpg", example: ".blessrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, energi: 0, isEnabled: true,
};

const BUFFS = [
  { name: "+10 ATK", apply: rpg => rpg.atk += 10 },
  { name: "+20 DEF", apply: rpg => rpg.def += 20 },
  { name: "+15 HP", apply: rpg => { rpg.hp = Math.min(rpg.hp + 15, rpg.maxHp); } },
  { name: "+5 SPD", apply: rpg => rpg.spd += 5 },
  { name: "+10% Crit", apply: rpg => rpg.critRate += 10 },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("blessrpg", "RPG belum siap.", "error"));
    if (rpg.lastBless && Date.now() - rpg.lastBless < 86400000) return m.reply(claraWrap("blessrpg", "Kamu sudah menerima bless hari ini.", "info"));
    const buff = BUFFS[Math.floor(Math.random() * BUFFS.length)];
    buff.apply(rpg);
    rpg.lastBless = Date.now();
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("blessrpg", `💠 Kamu diberkati hari ini!\nEffect: *${buff.name}*`, "success"));
  } catch (e) {
    return m.reply(claraWrap("blessrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
