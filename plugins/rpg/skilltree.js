// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Skill Tree — Tree progression, talent, learnskill, research, mutate

import { ensureRpg, saveRpg, SKILL_DB } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "skilltree",
  alias: ["skilltree", "research"],
  category: "rpg",
  description: "Skill tree, talent class, belajar skill, riset & mutasi skill",
  usage: ".skilltree | .talent | .learnskill <nama> | .research | .mutate",
  example: ".skilltree",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

const SKILL_PATHS = {
  warrior: [
    { name: "Power Strike", desc: "Damage +1.5x", next: "Shield Bash" },
    { name: "Shield Bash", desc: "Stun + defense break", next: "War Cry" },
    { name: "War Cry", desc: "Buff ATK semua party", next: "MAX" },
  ],
  mage: [
    { name: "Fireball", desc: "Damage api 2x", next: "Ice Spear" },
    { name: "Ice Spear", desc: "Slow + damage 1.8x", next: "Meteor" },
    { name: "Meteor", desc: "Damage masif 4x", next: "MAX" },
  ],
  archer: [
    { name: "Quick Shot", desc: "Serangan cepat 1.3x", next: "Piercing Arrow" },
    { name: "Piercing Arrow", desc: "Tembus armor 2x", next: "Rain of Arrows" },
    { name: "Rain of Arrows", desc: "AOE 2.5x", next: "MAX" },
  ],
  assassin: [
    { name: "Shadow Slash", desc: "Damage 1.8x", next: "Vanish" },
    { name: "Vanish", desc: "Invisible + buff", next: "Death Strike" },
    { name: "Death Strike", desc: "Damage masif 5x", next: "MAX" },
  ],
  healer: [
    { name: "Heal", desc: "Heal HP 150", next: "Heal All" },
    { name: "Heal All", desc: "Heal party 100", next: "Resurrect" },
    { name: "Resurrect", desc: "Revive fallen ally", next: "MAX" },
  ],
  tank: [
    { name: "Taunt", desc: "Paksa musuh serangmu", next: "Iron Wall" },
    { name: "Iron Wall", desc: "DEF +50%", next: "Fortress" },
    { name: "Fortress", desc: "Imunitas 1 turn", next: "MAX" },
  ],
};

const TALENTS = {
  warrior:   { name: "⚔️ War Veteran", desc: "Damage +10 saat duel", bonus: { atk: 10 } },
  mage:      { name: "🔮 Arcane Mind", desc: "Skill cooldown -10%", bonus: { cooldown: -10 } },
  archer:    { name: "🏹 Hawkeye", desc: "Critical +15%", bonus: { critRate: 15 } },
  assassin:  { name: "🔪 Shadow Step", desc: "Evasion +12%", bonus: { evasion: 12 } },
  healer:    { name: "💚 Divine Touch", desc: "Heal +25%", bonus: { healBonus: 25 } },
  tank:      { name: "🛡️ Iron Body", desc: "DEF +20%", bonus: { def: 20 } },
  berserker: { name: "🩸 Bloodlust", desc: "Lifesteal +15%", bonus: { lifesteal: 15 } },
  novice:    { name: "🌱 Beginner Luck", desc: "EXP +10%", bonus: { expBonus: 10 } },
};

const LEARNABLE = ["fireball", "heal", "iceblast", "iceSpear", "quickShot", "shadowSlash"];

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("skilltree", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // .skilltree — tampilkan tree
    if (command === "skilltree") {
      const job = rpg.job || "novice";
      const tree = SKILL_PATHS[job] || SKILL_PATHS.warrior;
      let msg = (m.pushName || "Player") + " | Job: " + job + "\n\n";
      for (let i = 0; i < tree.length; i++) {
        const skill = tree[i];
        const unlocked = rpg.skills?.some(s => s.name === skill.name);
        const mark = unlocked ? "✅" : "🔒";
        msg += mark + " [" + (i + 1) + "] " + skill.name + "\n";
        msg += "   " + skill.desc + "\n";
        if (skill.next !== "MAX") msg += "   -> " + skill.next + "\n";
      }
      msg += "\n.learnskill <nama> — pelajari skill\n";
      msg += ".talent — lihat talent class";
      await animGeneric(m, sock, '🌳', 'Opening skill tree');
      return m.reply(msg);
    }

    // .talent — tampilkan talent class
    if (command === "talent") {
      const job = rpg.job || "novice";
      const talent = TALENTS[job] || TALENTS.novice;
      let msg = "Class: " + job + "\n\n";
      msg += talent.name + "\n";
      msg += talent.desc + "\n\n";
      msg += "Talent aktif otomatis sesuai job";
      await animGeneric(m, sock, '🌳', 'Opening skill tree');
      return m.reply(msg);
    }

    // .learnskill <nama> — pelajari skill
    if (command === "learnskill") {
      const skillName = (text || "").trim().toLowerCase();
      if (!skillName) return m.reply(claraWrap("learnskill", "Skill tersedia: " + LEARNABLE.join(", "), "guide"));

      const skillId = LEARNABLE.find(s => s.toLowerCase() === skillName);
      if (!skillId) return m.reply(claraWrap("learnskill", "Skill tidak ditemukan. Tersedia: " + LEARNABLE.join(", "), "guide"));

      const skillDef = SKILL_DB[skillId];
      if (!skillDef) return m.reply(claraWrap("learnskill", "Skill tidak terdaftar di database.", "error"));

      if (rpg.skills?.some(s => s.id === skillId)) return m.reply(claraWrap("learnskill", "Kamu sudah punya skill ini.", "info"));

      if ((rpg.skillPoints || 0) < 1) return m.reply(claraWrap("learnskill", "Skill points tidak cukup. Butuh 1 SP.", "info"));

      await m.react("🕒");
      rpg.skills = rpg.skills || [];
      rpg.skills.push({ id: skillId, name: skillDef.name, level: 1, mpCost: skillDef.mpCost, power: skillDef.power });
      rpg.skillPoints = (rpg.skillPoints || 0) - 1;
      saveRpg(m, rpg);
      await m.react("🐣");
      await animGeneric(m, sock, '🌳', 'Opening skill tree');
      return m.reply("✅ Kamu mempelajari *" + skillDef.name + "*!\nMP Cost: " + skillDef.mpCost + "\nPower: " + skillDef.power + "x\nSP tersisa: " + rpg.skillPoints);
    }

    // .research — upgrade skill yang sudah ada
    if (command === "research") {
      if (!rpg.skills || rpg.skills.length === 0) return m.reply(claraWrap("research", "Kamu belum punya skill untuk di-upgrade.", "info"));
      if ((rpg.skillPoints || 0) < 1) return m.reply(claraWrap("research", "Skill points tidak cukup.", "info"));

      await m.react("🕒");
      const firstSkill = rpg.skills[0];
      firstSkill.level = (firstSkill.level || 1) + 1;
      firstSkill.power = (firstSkill.power || 1) + 0.5;
      rpg.skillPoints = (rpg.skillPoints || 0) - 1;
      saveRpg(m, rpg);
      await m.react("🐣");
      await animGeneric(m, sock, '🌳', 'Opening skill tree');
      return m.reply("Skill *" + firstSkill.name + "* di-upgrade!\nLv." + firstSkill.level + " | Power: " + firstSkill.power + "x\nSP tersisa: " + rpg.skillPoints);
    }

    // .mutate — random skill mutation
    if (command === "mutate") {
      if (!rpg.skills || rpg.skills.length === 0) return m.reply(claraWrap("mutate", "Kamu belum punya skill untuk dimutasi.", "info"));
      await m.react("🕒");
      const allSkills = Object.keys(SKILL_DB);
      const newSkillId = allSkills[Math.floor(Math.random() * allSkills.length)];
      const newSkillDef = SKILL_DB[newSkillId];
      const oldName = rpg.skills[0].name;
      rpg.skills[0] = { id: newSkillId, name: newSkillDef.name, level: 1, mpCost: newSkillDef.mpCost, power: newSkillDef.power };
      saveRpg(m, rpg);
      await m.react("🐣");
      await animGeneric(m, sock, '🌳', 'Opening skill tree');
      return m.reply("Skill *" + oldName + "* bermutasi jadi *" + newSkillDef.name + "*!\nMP: " + newSkillDef.mpCost + " | Power: " + newSkillDef.power + "x");
    }
  } catch (e) {
    console.error("skilltree error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "skilltree", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };