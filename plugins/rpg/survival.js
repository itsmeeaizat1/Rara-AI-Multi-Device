// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// survival.js — Survival mode (HP, hunger, thirst management)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "survival",
  alias: ["survival", "over生存", "surviverpg"],
  category: "rpg",
  description: "Survival mode — kelola HP, hunger, thirst untuk bertahan hidup",
  usage: ".survival (status)\n.survival drink (minum)\n.survival rest (istirahat)\n.survival hunt (berburu makanan)\n.survival revive (hidup lagi)",
  example: ".survival",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const DECAY_INTERVAL = 30 * 60 * 1000; // 30 min per decay tick
const MAX_HP = 200, MAX_HUNGER = 100, MAX_THIRST = 100;

async function getData(db, sender) {
  let data = await db.getPlayerData?.(sender, "survival") || null;
  if (!data) {
    data = { hp: MAX_HP, hunger: MAX_HUNGER, thirst: MAX_THIRST, lastUpdate: Date.now(), alive: true, deaths: 0, daysSurvived: 0 };
  }
  // Apply decay
  const now = Date.now();
  const elapsed = now - (data.lastUpdate || now);
  const ticks = Math.floor(elapsed / DECAY_INTERVAL);
  if (ticks > 0) {
    data.hunger = Math.max(0, data.hunger - ticks * 5);
    data.thirst = Math.max(0, data.thirst - ticks * 8);
    if (data.hunger === 0 || data.thirst === 0) {
      data.hp = Math.max(0, data.hp - ticks * 10);
    }
    if (data.hp === 0) data.alive = false;
    data.lastUpdate = now;
    data.daysSurvived = (data.daysSurvived || 0) + ticks;
    await db.setPlayerData?.(sender, "survival", data);
  }
  return data;
}

function bar(val, max) {
  const pct = Math.floor((val / max) * 10);
  return "█".repeat(pct) + "░".repeat(10 - pct);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    let data = await getData(db, m.sender);

    if (!data.alive) {
      if (subCmd === "revive" || subCmd === "hidup") {
        const cost = 1000;
        try {
          const gold = await db.getGold?.(m.sender) || 0;
          if (gold < cost) {
            await m.react("❌");
            return m.reply(claraWrap("survival", `Kamu mati! Butuh ${cost} gold untuk revive.`, "error"));
          }
          await db.minGold?.(m.sender, cost);
        } catch {}
        data.hp = MAX_HP;
        data.hunger = MAX_HUNGER;
        data.thirst = MAX_THIRST;
        data.alive = true;
        data.deaths = (data.deaths || 0) + 1;
        data.lastUpdate = Date.now();
        await db.setPlayerData?.(m.sender, "survival", data);
        await m.react("🐣");
        return m.reply(claraWrap("survival", `💚 Kamu hidup lagi! HP & stats penuh.\nTotal kematian: ${data.deaths}`));
      }
      return m.reply(claraWrap("survival", `💀 Kamu MATI!\n\nRevive: ${m.prefix}survival revive (1000g)`, "error"));
    }

    if (subCmd === "drink" || subCmd === "minum") {
      if (data.thirst >= MAX_THIRST) return m.reply(claraWrap("survival", "Thirst penuh!", "error"));
      data.thirst = Math.min(MAX_THIRST, data.thirst + 40);
      data.lastUpdate = Date.now();
      await db.setPlayerData?.(m.sender, "survival", data);
      await m.react("🐣");
      return m.reply(claraWrap("survival", `💧 Minum berhasil! Thirst: ${data.thirst}/${MAX_THIRST}`));
    }

    if (subCmd === "rest" || subCmd === "istirahat") {
      if (data.hp >= MAX_HP) return m.reply(claraWrap("survival", "HP penuh!", "error"));
      const cost = 20;
      try { await db.minEnergi?.(m.sender, cost); } catch {}
      data.hp = Math.min(MAX_HP, data.hp + 50);
      data.hunger = Math.max(0, data.hunger - 5);
      data.lastUpdate = Date.now();
      await db.setPlayerData?.(m.sender, "survival", data);
      await m.react("🐣");
      return m.reply(claraWrap("survival", `🛌 Istirahat! HP +50 (${data.hp}/${MAX_HP})\nHunger -5 (${data.hunger})`));
    }

    if (subCmd === "hunt" || subCmd === "berburu") {
      await m.react("🕒");
      const success = Math.random() > 0.3;
      if (success) {
        data.hunger = Math.min(MAX_HUNGER, data.hunger + 30);
        try { await db.addGold?.(m.sender, 100); } catch {}
        data.lastUpdate = Date.now();
        await db.setPlayerData?.(m.sender, "survival", data);
        await m.react("🐣");
        return m.reply(claraWrap("survival", `🏹 Berburu berhasil! Hunger +30 (+100g)\nHunger: ${data.hunger}/${MAX_HUNGER}`));
      } else {
        data.hp = Math.max(0, data.hp - 20);
        data.lastUpdate = Date.now();
        await db.setPlayerData?.(m.sender, "survival", data);
        await m.react("🐣");
        return m.reply(claraWrap("survival", `🏹 Berburu gagal! Hewan melawan, HP -20 (${data.hp}/${MAX_HP})`));
      }
    }

    // STATUS (default)
    let msg = `╭──「 *sᴜʀᴠɪᴠᴀʟ* 」\n`;
    msg += `│ ❤️ HP:      [${bar(data.hp, MAX_HP)}] ${data.hp}/${MAX_HP}\n`;
    msg += `│ 🍖 Hunger:  [${bar(data.hunger, MAX_HUNGER)}] ${data.hunger}/${MAX_HUNGER}\n`;
    msg += `│ 💧 Thirst:  [${bar(data.thirst, MAX_THIRST)}] ${data.thirst}/${MAX_THIRST}\n`;
    msg += `│\n`;
    msg += `│ Days: *${data.daysSurvived || 0}* | Deaths: *${data.deaths || 0}*\n`;
    if (data.hunger < 20) msg += `│ ⚠️ Hunger kritis! Berburu segera.\n`;
    if (data.thirst < 20) msg += `│ ⚠️ Thirst kritis! Minum segera.\n`;
    msg += `│\n`;
    msg += `│ ${m.prefix}survival drink - minum\n`;
    msg += `│ ${m.prefix}survival rest - istirahat (+HP)\n`;
    msg += `│ ${m.prefix}survival hunt - berburu (+hunger)\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("survival error:", err);
    await m.react("❌");
    return m.reply(claraWrap("survival", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
