// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Class — Pilih kelas karakter (knight/mage/archer)
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "classrpg", alias: ["classrpg", "class", "kelas"],
  category: "rpg", description: "Pilih kelas RPG (knight, mage, archer)",
  usage: ".classrpg <knight/mage/archer>", example: ".classrpg mage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const CLASSES = {
  knight: { atk: 15, def: 20, spd: 8, hp: 120, desc: "Tank dengan DEF tinggi" },
  mage: { atk: 25, def: 5, spd: 12, hp: 80, mana: 100, desc: "Damage dealer dengan magic" },
  archer: { atk: 20, def: 8, spd: 18, hp: 90, critRate: 15, desc: "Speed & critical dealer" },
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("classrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (rpg.job && rpg.job !== "novice") return m.reply(claraWrap("classrpg", `Kamu sudah memilih kelas: *${rpg.job}*\nGunakan .scrollclass untuk reset.`, "info"));
    if (!text || !CLASSES[text]) return m.reply(claraWrap("classrpg", `Kelas tersedia:\n⚔️ knight — ${CLASSES.knight.desc}\n🔮 mage — ${CLASSES.mage.desc}\n🏹 archer — ${CLASSES.archer.desc}\n\nContoh: ${m.prefix}classrpg mage`, "guide"));
    const c = CLASSES[text];
    rpg.job = text; rpg.atk = c.atk; rpg.def = c.def; rpg.spd = c.spd; rpg.maxHp = c.hp; rpg.hp = c.hp;
    if (c.mana) { rpg.maxMana = c.mana; rpg.mana = c.mana; }
    if (c.critRate) rpg.critRate = c.critRate;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(claraWrap("classrpg", `✅ Kamu kini seorang *${text}*!\n⚔️ ATK: ${c.atk} | 🛡️ DEF: ${c.def} | ⚡ SPD: ${c.spd} | ❤️ HP: ${c.hp}`, "success"));
  } catch (e) {
    console.error("classrpg error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("classrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
