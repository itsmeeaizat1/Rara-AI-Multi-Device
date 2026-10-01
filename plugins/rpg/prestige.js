// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Prestige — Reset level for permanent stat boost (different from rebirth)

import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { replyWithCardPreview } from "../../src/lib/rara-level.js";

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
    if (!rpg) return m.reply(raraRpgBox("prestige", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "prestige") {
  await animGeneric(m, sock, "⭐", "Prestige");
      if (rpg.level < 50) {
        const txt = raraRpgBox("prestige",
          `Minimal level 50 untuk prestige.\n\n📊 Progress kamu:\n${reqBar(rpg.level || 1, 50)}\n\nTerus berpetualang naik level!`, "info");
        const sent = await replyWithCardPreview(m, txt, {
          title: "PRESTIGE",
          name: m.pushName || "Player",
          infoLine: `Syarat: Level 50  •  Prestige: Ke-${rpg.prestigeCount || 0}`,
          bigValue: String(rpg.level || 1),
          bigLabel: "LEVEL",
          bars: [{ label: "Progress ke syarat", cur: rpg.level || 1, max: 50, c1: "#ff00cc", c2: "#3333ff" }],
        }, { body: "Butuh Level 50 untuk Prestige" });
        return sent || m.reply(txt);
      }

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
      const txt = "Kamu melakukan *Prestige*!\n\nPrestige: Ke-" + rpg.prestigeCount + "\nGold: +1000\nATK: +5\nDEF: +5\nHP: +50\nStat boost permanen setiap prestige";
      const sent = await replyWithCardPreview(m, txt, {
        title: "PRESTIGE",
        name: m.pushName || "Player",
        infoLine: "Gold +1000  •  ATK +5  •  DEF +5  •  HP +50",
        bigValue: String(rpg.prestigeCount || 1),
        bigLabel: "PRESTIGE",
      }, { body: "Prestige berhasil — stat boost permanen" });
      return sent || m.reply(txt);
    }

    if (command === "reincarnate" || command === "reinkarnasi") {
      if (rpg.level < 30) {
        const txt = raraRpgBox("reincarnate",
          `Minimal level 30 untuk reinkarnasi.\n\n📊 Progress kamu:\n${reqBar(rpg.level || 1, 30)}\n\nTerus berpetualang naik level!`, "info");
        const sent = await replyWithCardPreview(m, txt, {
          title: "REINKARNASI",
          name: m.pushName || "Player",
          infoLine: `Syarat: Level 30  •  Reinkarnasi: Ke-${rpg.reincarnation || 0}`,
          bigValue: String(rpg.level || 1),
          bigLabel: "LEVEL",
          bars: [{ label: "Progress ke syarat", cur: rpg.level || 1, max: 30, c1: "#ff00cc", c2: "#3333ff" }],
        }, { body: "Butuh Level 30 untuk Reinkarnasi" });
        return sent || m.reply(txt);
      }

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
      const txt = "Kamu telah bereinkarnasi!\n\nReinkarnasi: Ke-" + rpg.reincarnation + "\nPassive bonus: +" + rpg.passiveBonus + "% power\nBonus permanen setiap reinkarnasi";
      const sent = await replyWithCardPreview(m, txt, {
        title: "REINKARNASI",
        name: m.pushName || "Player",
        infoLine: `Passive bonus: +${rpg.passiveBonus || 5}% power  •  ATK +3  •  DEF +3`,
        bigValue: String(rpg.reincarnation || 1),
        bigLabel: "REINKARNASI",
      }, { body: "Reinkarnasi berhasil — bonus permanen" });
      return sent || m.reply(txt);
    }
  } catch (e) {
    console.error("prestige error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox(m.command || "prestige", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
