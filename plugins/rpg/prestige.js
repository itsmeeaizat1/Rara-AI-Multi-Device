// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Prestige — Reset level for permanent stat boost (different from rebirth)

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

/** Bar progress level ke syarat standar ▰▱ (14 Sep — bar untuk semua progress level) */
function reqBar(cur, target) {
  const c = Math.max(0, cur || 0), mx = Math.max(0, target || 0);
  const filled = mx > 0 ? Math.min(10, Math.round((c / mx) * 10)) : 0;
  return "▰".repeat(filled) + "▱".repeat(10 - filled) + ` ${c}/${mx}`;
}

const pluginConfig = {
  name: "prestige",
  alias: ["prestige"],
  category: "rpg",
  description: "Prestige (reset Lv.50+) & reinkarnasi (reset Lv.30+) untuk bonus permanen",
  usage: ".prestige | .reincarnate",
  example: ".prestige",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("prestige", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "prestige") {
  await animGeneric(m, sock, "⭐", "Prestige");
      if (rpg.level < 50) return m.reply(novaRpgBox("prestige",
        `Minimal level 50 untuk prestige.\n\n📊 Progress kamu:\n${reqBar(rpg.level || 1, 50)}\n\nTerus berpetualang naik level!`, "info"));

      await m.react("🕒");
      rpg.level = 1;
      rpg.exp = 0;
      rpg.expNext = 100;
      rpg.gold = (rpg.gold || 0) + 1000;
      rpg.statBoost = (rpg.statBoost || 0) + 1;
      rpg.prestigeCount = (rpg.prestigeCount || 0) + 1;
      rpg.atk = (rpg.atk || 10) + 5;
      rpg.def = (rpg.def || 5) + 5;
      rpg.hp = (rpg.hp || 100) + 50;
      rpg.maxHp = (rpg.maxHp || 100) + 50;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu melakukan *Prestige*!\n\nPrestige: Ke-" + rpg.prestigeCount + "\nGold: +1000\nATK: +5\nDEF: +5\nHP: +50\nStat boost permanen setiap prestige");
    }

    if (command === "reincarnate" || command === "reinkarnasi") {
      if (rpg.level < 30) return m.reply(novaRpgBox("reincarnate",
        `Minimal level 30 untuk reinkarnasi.\n\n📊 Progress kamu:\n${reqBar(rpg.level || 1, 30)}\n\nTerus berpetualang naik level!`, "info"));

      await m.react("🕒");
      rpg.level = 1;
      rpg.exp = 0;
      rpg.expNext = 100;
      rpg.gold = 0;
      rpg.reincarnation = (rpg.reincarnation || 0) + 1;
      rpg.passiveBonus = (rpg.passiveBonus || 0) + 5;
      rpg.atk = (rpg.atk || 10) + 3;
      rpg.def = (rpg.def || 5) + 3;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu telah bereinkarnasi!\n\nReinkarnasi: Ke-" + rpg.reincarnation + "\nPassive bonus: +" + rpg.passiveBonus + "% power\nBonus permanen setiap reinkarnasi");
    }
  } catch (e) {
    console.error("prestige error:", e.message);
    await m.react("❌");
    return m.reply(novaRpgBox(m.command || "prestige", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
