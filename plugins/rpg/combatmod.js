// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Combat Modifiers — Buff, Debuff, Bless, Curse, Ward, Trap

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "combatmod",
  alias: ["combatmod"],
  aliases: ["buff", "debuff", "bless", "blessnpc", "curse", "ward", "trap"],
  category: "rpg",
  description: "Buff/debuff combat, bless harian, curse musuh, ward & trap",
  usage: ".buff | .debuff (reply) | .bless | .curse (reply) | .ward | .trap",
  example: ".buff",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 2, isEnabled: true,
};

const BUFFS = [
  { name: "ATK +10", stat: "atk", value: 10 },
  { name: "DEF +20", stat: "def", value: 20 },
  { name: "SPD +15", stat: "spd", value: 15 },
  { name: "HP +100", stat: "hp", value: 100 },
  { name: "Crit +10%", stat: "critRate", value: 10 },
];
const BLESSINGS = ["+10 ATK", "+20 DEF", "+15 HP", "+100 Gold", "+50 EXP"];
const DEBUFFS = ["burn", "slow", "poison", "weaken"];

async function handler(m, { sock, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("combatmod", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // .buff — self buff random
    if (command === "buff") {
      const buff = BUFFS[Math.floor(Math.random() * BUFFS.length)];
      await m.react("🕒");
      rpg.buffs = rpg.buffs || [];
      rpg.buffs.push({ name: buff.name, stat: buff.stat, value: buff.value, expires: Date.now() + 3600000 });
      rpg[buff.stat] = (rpg[buff.stat] || 0) + buff.value;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ʙᴜғғ* 」\n│ 🔆 Kamu menerima buff: *" + buff.name + "*\n│ ⏱️ Berlangsung 1 jam\n╰──────────");
    }

    // .debuff — debuff target (reply)
    if (command === "debuff") {
      if (!m.quoted) return m.reply(claraWrap("debuff", "Reply target untuk diberi debuff.", "guide"));
      const target = m.quoted.sender || m.quoted.participant;
      if (!target) return m.reply(claraWrap("debuff", "Target tidak ditemukan.", "error"));
      const debuff = DEBUFFS[Math.floor(Math.random() * DEBUFFS.length)];
      await m.react("🕒");
      const targetRpg = ensureRpg({ sender: target }, "");
      if (!targetRpg) return m.reply(claraWrap("debuff", "Target belum terdaftar RPG.", "error"));
      targetRpg.debuffs = targetRpg.debuffs || [];
      targetRpg.debuffs.push({ name: debuff, expires: Date.now() + 1800000 });
      saveRpg({ sender: target }, targetRpg);
      await m.react("🐣");
      return m.reply("╭──「 *ᴅᴇʙᴜғғ* 」\n│ 🔥 Musuh terkena efek *" + debuff + "*!\n│ ⏱️ Berlangsung 30 menit\n╰──────────");
    }

    // .bless — daily random blessing
    if (command === "bless") {
      const lastBless = rpg.lastBless || 0;
      if (Date.now() - lastBless < 86400000) {
        const remaining = 86400000 - (Date.now() - lastBless);
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        return m.reply(claraWrap("bless", "Kamu sudah menerima blessing hari ini.\nCoba lagi dalam " + hours + "j " + mins + "m.", "info"));
      }
      await m.react("🕒");
      const blessing = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
      rpg.lastBless = Date.now();
      if (blessing.includes("ATK")) rpg.atk = (rpg.atk || 10) + 10;
      else if (blessing.includes("DEF")) rpg.def = (rpg.def || 5) + 20;
      else if (blessing.includes("HP")) rpg.hp = (rpg.hp || 100) + 15;
      else if (blessing.includes("Gold")) rpg.gold = (rpg.gold || 0) + 100;
      else if (blessing.includes("EXP")) rpg.exp = (rpg.exp || 0) + 50;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ʙʟᴇss* 」\n│ 💠 Kamu diberkati hari ini!\n│ Efek: *" + blessing + "*\n╰──────────");
    }

    // .blessnpc — NPC blessing (random small bonus)
    if (command === "blessnpc") {
      const bonus = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
      await m.react("🕒");
      if (bonus.includes("ATK")) rpg.atk = (rpg.atk || 10) + 10;
      else if (bonus.includes("DEF")) rpg.def = (rpg.def || 5) + 5;
      else if (bonus.includes("HP")) rpg.hp = (rpg.hp || 100) + 100;
      else if (bonus.includes("Gold")) rpg.gold = (rpg.gold || 0) + 100;
      else if (bonus.includes("EXP")) rpg.exp = (rpg.exp || 0) + 50;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ʙʟᴇss ɴᴘᴄ* 」\n│ ✨ NPC memberkati kamu!\n│ Efek: *" + bonus + "*\n╰──────────");
    }

    // .curse — curse target (reply)
    if (command === "curse") {
      if (!m.quoted) return m.reply(claraWrap("curse", "Reply target untuk dikutuk.", "guide"));
      const target = m.quoted.sender || m.quoted.participant;
      if (!target) return m.reply(claraWrap("curse", "Target tidak ditemukan.", "error"));
      await m.react("🕒");
      const targetRpg = ensureRpg({ sender: target }, "");
      if (!targetRpg) return m.reply(claraWrap("curse", "Target belum terdaftar RPG.", "error"));
      targetRpg.cursed = true;
      targetRpg.curseTime = Date.now() + 3600000;
      saveRpg({ sender: target }, targetRpg);
      await m.react("🐣");
      return m.reply("╭──「 *ᴄᴜʀsᴇ* 」\n│ 👻 Target telah dikutuk!\n│ Efek negatif aktif selama 1 jam\n╰──────────");
    }

    // .ward — protection from traps & curses
    if (command === "ward") {
      await m.react("🕒");
      rpg.ward = true;
      rpg.wardTime = Date.now() + 3600000;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ᴡᴀʀᴅ* 」\n│ 🔆 Ward aktif!\n│ Lokasimu aman dari trap & curse selama 1 jam\n╰──────────");
    }

    // .trap — set trap
    if (command === "trap") {
      await m.react("🕒");
      rpg.trap = true;
      rpg.trapTime = Date.now() + 1800000;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭──「 *ᴛʀᴀᴘ* 」\n│ 🕳️ Jebakan dipasang di lokasi saat ini!\n│ Aktif selama 30 menit\n╰──────────");
    }
  } catch (e) {
    console.error("combatmod error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "combatmod", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
