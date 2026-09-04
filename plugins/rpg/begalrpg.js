// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Begal — Rob other players for gold (risky)

import {
  ensureRpg, saveRpg, addGold, removeGold, addExp,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap, reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { animBegal } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "begalrpg",
  alias: ["begalrpg", "begal", "rampok"],
  category: "rpg",
  description: "Rampok gold player lain — success tergantung level perbedaan",
  usage: ".begalrpg @tag",
  example: ".begalrpg @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const BEGAL_COOLDOWN = 5 * 60 * 1000;
const BEGAL_ENERGY = 10;
const SUCCESS_BASE = 50; // 50% base
const STOLEN_PERCENT = [5, 15]; // 5-15% dari gold target
const CAUGHT_PENALTY = 0.1; // 10% gold sendiri kena fine

async function handler(m, { sock }) {
  try {
    let targetJid = m.mentionedJid?.[0];
    if (!targetJid && m.quoted) targetJid = m.quoted.sender;

    if (!targetJid) {
      return m.reply(claraWrap("begalrpg", "Tag target! Contoh: .begalrpg @user", "warn"));
    }

    if (targetJid === m.sender) {
      return m.reply(claraWrap("begalrpg", "Nggak bisa begal diri sendiri 😅", "warn"));
    }

    await m.react("🕒");
    await animBegal(m, sock);

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("begalrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastBegal");
    if (cd) {
      await reactCooldown(m);
      return m.reply(claraWrap("begalrpg", `Cooldown begal tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < BEGAL_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("begalrpg", `Energi kurang! Butuh *${BEGAL_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    // Init target
    const targetRpg = ensureRpg({ sender: targetJid }, targetJid.split("@")[0]);
    if (!targetRpg) {
      return m.reply(claraWrap("begalrpg", "Target belum terdaftar RPG.", "warn"));
    }

    if (targetRpg.gold < 10) {
      await m.react("❌");
      return m.reply(claraWrap("begalrpg", `Target *${targetJid.split("@")[0]}* terlalu miskin untuk dirampok 😅`, "warn"));
    }

    // Success rate: base 50% + level difference bonus
    const levelDiff = rpg.level - targetRpg.level;
    let successRate = SUCCESS_BASE + levelDiff * 2;
    successRate = Math.max(15, Math.min(80, successRate)); // clamp 15-80%

    const success = Math.random() * 100 < successRate;

    // Energy cost
    rpg.energy = Math.max(0, rpg.energy - BEGAL_ENERGY);

    if (success) {
      // Stolen amount
      const percent = (STOLEN_PERCENT[0] + Math.random() * (STOLEN_PERCENT[1] - STOLEN_PERCENT[0])) / 100;
      const stolen = Math.floor(targetRpg.gold * percent);
      const actualStolen = Math.min(stolen, targetRpg.gold);

      removeGold({ sender: targetJid }, actualStolen, sock);
      addGold(m, actualStolen);

      // Small EXP
      const expGain = 20 + Math.floor(Math.random() * 30);
      addExp(m, expGain); // Note: addExp needs rpg context

      saveRpg(m, { energy: rpg.energy, begalSuccess: (rpg.begalSuccess || 0) + 1 });
      saveRpg({ sender: targetJid }, { gotRobbed: (targetRpg.gotRobbed || 0) + 1 });
      setCooldown(m, "lastBegal", BEGAL_COOLDOWN);

      await m.react("🐣");
      return m.reply(novaGameBox({
        title: "begalrpg", icon: "🗡️",
        flavor: "🥷 *BERHASIL MERAMPOK!*",
        body: [
          `🗡️ ${m.pushName} merampok ${targetJid.split("@")[0]}`,
          "",
          `│ • 📊 Success rate : ${Math.floor(successRate)}%`,
          `│ • 💰 Rampokan : +${actualStolen} gold`,
          `│ • ✨ EXP : +${expGain}`,
          "",
          "❗ Rampok lagi = makin besar cooldown",
        ].join("\n"),
        cta: gameCTA("begalrpg"),
      }));
    } else {
      // Caught! Penalty
      const fine = Math.floor(rpg.gold * CAUGHT_PENALTY);
      const actualFine = Math.min(fine, rpg.gold);

      if (actualFine > 0) {
        removeGold(m, actualFine, sock);
      }

      saveRpg(m, { energy: rpg.energy, begalFailed: (rpg.begalFailed || 0) + 1 });
      setCooldown(m, "lastBegal", BEGAL_COOLDOWN);

      await m.react("❌");
      return m.reply(novaGameBox({
        title: "begalrpg", icon: "🗡️",
        flavor: "🚨 *KETAHUAN! KAMU DITANGKAP!*",
        body: [
          `🗡️ ${m.pushName} mencoba rampok ${targetJid.split("@")[0]}`,
          "",
          `│ • 💸 Denda : -${actualFine} gold`,
          "",
          "💡 Level lebih tinggi dari target = success rate lebih besar",
        ].join("\n"),
        cta: gameCTA("begalrpg"),
      }));
    }
  } catch (err) {
    console.error("begalrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("begalrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
