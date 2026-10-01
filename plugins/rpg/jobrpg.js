// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Job Class — Change job, view skills, unlock/upgrade skills

import {
  ensureRpg, changeJob, unlockSkill, upgradeSkill,
  getAvailableSkills, JOB_DB, SKILL_DB
} from "../../src/lib/nova-rpg-service.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "job",
  alias: ["job", "jobrpg", "setclass"],
  category: "rpg",
  description: "Lihat/ganti job class dan kelola skill RPG",
  usage: ".job <list|change <job|skill <list|unlock|upgrade>>",
  example: ".job list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const RARITY_EMOJI = { common: "⬜", uncommon: "🟩", rare: "🟦", epic: "🟪", legendary: "🟨" };

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("jobrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Default: show current job + skills
    if (!action || action === "info") {
      const currentJob = JOB_DB[rpg.job] || { name: "Pemula" };
      let msg = "";
      msg += `👤 ${m.pushName || "Player"} | Lv.${rpg.level}\n`;
      msg += `
`;
      msg += `👔 Job: *${currentJob.name}*\n`;
      msg += `📊 Job Level: *${rpg.jobLevel || 1}*\n`;
      msg += `📖 Job EXP: *${rpg.jobExp || 0}/${rpg.jobExpNext || 50}*\n`;
      msg += `Skill Points: *${rpg.skillPoints || 0}*\n`;
      msg += `
`;

      // Current skills
      if (rpg.skills && rpg.skills.length > 0) {
        msg += `📜 *skill aktiғ*\n`;
        for (const skill of rpg.skills) {
          const sDef = SKILL_DB[skill.id];
          if (!sDef) continue;
          msg += `⚡ ${skill.name} (Lv.${skill.level})\n`;
          msg += `MP: ${skill.mpCost} | Power: ${skill.power}x\n`;
        }
      } else {
        msg += `📜 Belum ada skill aktif\n`;
      }

      msg += `
`;
      msg += `📌 .jobrpg list — lihat semua job\n`;
      msg += `📌 .jobrpg change <job> — ganti job\n`;
      msg += `📌 .jobrpg skill list — lihat skill tersedia\n`;
      
      return m.reply(novaRpgBox("jobrpg", msg));
    }

    // List all jobs
    if (action === "list") {
      let msg = "";
      msg += `Pilih job (butuh Lv.10 untuk ganti)\n`;
      msg += `
`;

      for (const [id, job] of Object.entries(JOB_DB)) {
        const isCurrent = id === rpg.job;
        const mark = isCurrent ? " ← *aktif*" : "";
        msg += `${isCurrent ? "✅" : "🔹"} *${job.name}* (${id})${mark}\n`;
        msg += `ATK +${job.atkBonus} | DEF +${job.defBonus} | SPD +${job.spdBonus} | HP +${job.hpBonus} | MP +${job.mpBonus}\n`;
      }

      msg += `
`;
      msg += `📌 .jobrpg change <nama_job> untuk ganti\n`;
      
      return m.reply(novaRpgBox("jobrpg", msg));
    }

    // Change job
    if (action === "change" || action === "ganti") {
      const jobName = args[1]?.toLowerCase();
  await animGeneric(m, sock, "💼", "Job Search");
      if (!jobName) return m.reply(novaRpgBox("jobrpg", "Job apa? Ketik .jobrpg list untuk lihat pilihan.", "warn"));

      if (!JOB_DB[jobName]) {
        return m.reply(novaRpgBox("jobrpg", `Job *${jobName}* tidak dikenal. Ketik .jobrpg list.`, "warn"));
      }

      const result = changeJob(m, jobName);

      if (result.success) {
        await m.react("🐣");
        return m.reply(novaGameBox({
          title: "jobrpg", icon: "💼",
          flavor: "✅ *JOB BERHASIL DIGANTI!*",
          body: [
            `│ • 👔 Job baru : ${result.job.name}`,
            `│ • ⚔️ ATK : +${result.job.atkBonus}`,
            `│ • 🛡️ DEF : +${result.job.defBonus}`,
            `│ • 💨 SPD : +${result.job.spdBonus}`,
            `│ • ❤️ HP : +${result.job.hpBonus}`,
            `│ • 🔮 MP : +${result.job.mpBonus}`,
            "",
            "⚠️ Skill lama direset, skill points dikembalikan.",
            "Ketik .jobrpg skill list untuk lihat skill baru.",
          ].join("\n"),
          cta: gameCTA("jobrpg"),
        }));
      } else {
        return m.reply(novaRpgBox("jobrpg", result.reason || "Gagal ganti job.", "warn"));
      }
    }

    // Skills
    if (action === "skill") {
      const skillAction = args[1]?.toLowerCase();

      // List available skills
      if (!skillAction || skillAction === "list") {
        const available = getAvailableSkills(m);
        const mySkills = rpg.skills || [];

        let msg = "";
        msg += `Skill Points: *${rpg.skillPoints || 0}*\n`;
        msg += `👔 Job: *${JOB_DB[rpg.job]?.name || "Pemula"}*\n`;
        msg += `
`;

        // Owned skills
        if (mySkills.length > 0) {
          msg += `📜 *skill milik* (${mySkills.length})\n`;
          for (const s of mySkills) {
            const sDef = SKILL_DB[s.id];
            if (!sDef) continue;
            msg += `⚡ ${s.name} Lv.${s.level}/10\n`;
            msg += `MP: ${s.mpCost} | Power: ${s.power}x | CD: ${s.cooldown}r\n`;
          }
          msg += `
`;
        }

        // Available to unlock
        if (available.length > 0) {
          msg += `📋 *bisa dibuka*\n`;
          for (const s of available) {
            const sDef = SKILL_DB[s];
            if (!sDef) continue;
            msg += `🔹 ${sDef.name} (${s}) — Lv.${sDef.minLevel} | MP ${sDef.mpCost}\n`;
          }
          msg += `
`;
          msg += `📌 .jobrpg skill unlock <nama> — buka skill\n`;
        } else {
          msg += `📋 Semua skill untuk job ini sudah dibuka\n`;
        }

        if (mySkills.length > 0) {
          msg += `📌 .jobrpg skill upgrade <nama> — upgrade skill\n`;
        }

        
        return m.reply(novaRpgBox("jobrpg", msg));
      }

      // Unlock skill
      if (skillAction === "unlock" || skillAction === "buka") {
        const skillId = args[2]?.toLowerCase();
        if (!skillId) return m.reply(novaRpgBox("jobrpg", "Skill apa? Ketik .jobrpg skill list", "warn"));

        const result = unlockSkill(m, skillId);

        if (result.success) {
          await m.react("🐣");
          return m.reply(novaGameBox({
            title: "jobrpg", icon: "⚡",
            flavor: "⚡ *SKILL TERBUKA!*",
            body: [
              `│ • ⚡ Skill : ${result.skill.name} (${skillId})`,
              `│ • 🔮 MP : ${result.skill.mpCost}`,
              `│ • 💥 Power : ${result.skill.power}x`,
              `│ • 🎯 Sisa skill points : ${rpg.skillPoints - 1}`,
            ].join("\n"),
            cta: gameCTA("jobrpg"),
          }));
        } else {
          return m.reply(novaRpgBox("jobrpg", result.reason || "Gagal unlock skill.", "warn"));
        }
      }

      // Upgrade skill
      if (skillAction === "upgrade" || skillAction === "naik") {
        const skillId = args[2]?.toLowerCase();
        if (!skillId) return m.reply(novaRpgBox("jobrpg", "Skill apa? Ketik .jobrpg skill list", "warn"));

        const result = upgradeSkill(m, skillId);

        if (result.success) {
          await m.react("🐣");
          return m.reply(novaGameBox({
            title: "jobrpg", icon: "⬆️",
            flavor: "⬆️ *SKILL DI-UPGRADE!*",
            body: [
              `│ • ⚡ Skill : ${result.skill.name}`,
              `│ • 📈 Level : Lv.${result.skill.level}`,
              `│ • 💥 Power : ${result.skill.power}x`,
              `│ • 🔮 MP : ${result.skill.mpCost}`,
            ].join("\n"),
            cta: gameCTA("jobrpg"),
          }));
        } else {
          return m.reply(novaRpgBox("jobrpg", result.reason || "Gagal upgrade skill.", "warn"));
        }
      }
    }

    return m.reply(novaRpgBox("jobrpg", "Aksi tidak dikenal. Ketik .jobrpg untuk info, .jobrpg list untuk lihat job.", "warn"));
  } catch (err) {
    console.error("jobrpg error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("jobrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
