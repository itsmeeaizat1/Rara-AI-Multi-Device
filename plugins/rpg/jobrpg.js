// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Job Class — Change job, view skills, unlock/upgrade skills

import {
  ensureRpg, changeJob, unlockSkill, upgradeSkill,
  getAvailableSkills, JOB_DB, SKILL_DB
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "jobrpg",
  alias: ["jobrpg", "classrpg", "setclass"],
  category: "rpg",
  description: "Lihat/ganti job class dan kelola skill RPG",
  usage: ".jobrpg <list|change <job|skill <list|unlock|upgrade>>",
  example: ".jobrpg list",
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
    if (!rpg) return m.reply(claraWrap("jobrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Default: show current job + skills
    if (!action || action === "info") {
      const currentJob = JOB_DB[rpg.job] || { name: "Pemula" };
      let msg = `╭─「 *ᴊᴏʙ ᴄʟᴀss* 」\n`;
      msg += `│ 👤 ${m.pushName || "Player"} | Lv.${rpg.level}\n`;
      msg += `│\n`;
      msg += `│ 👔 Job: *${currentJob.name}*\n`;
      msg += `│ 📊 Job Level: *${rpg.jobLevel || 1}*\n`;
      msg += `│ 📖 Job EXP: *${rpg.jobExp || 0}/${rpg.jobExpNext || 50}*\n`;
      msg += `│ ✨ Skill Points: *${rpg.skillPoints || 0}*\n`;
      msg += `│\n`;

      // Current skills
      if (rpg.skills && rpg.skills.length > 0) {
        msg += `│ 📜 *sᴋɪʟʟ ᴀᴋᴛɪғ*\n`;
        for (const skill of rpg.skills) {
          const sDef = SKILL_DB[skill.id];
          if (!sDef) continue;
          msg += `│ ⚡ ${skill.name} (Lv.${skill.level})\n`;
          msg += `│     MP: ${skill.mpCost} | Power: ${skill.power}x\n`;
        }
      } else {
        msg += `│ 📜 Belum ada skill aktif\n`;
      }

      msg += `│\n`;
      msg += `│ 📌 .jobrpg list — lihat semua job\n`;
      msg += `│ 📌 .jobrpg change <job> — ganti job\n`;
      msg += `│ 📌 .jobrpg skill list — lihat skill tersedia\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    // List all jobs
    if (action === "list") {
      let msg = `╭─「 *ᴊᴏʙ ʟɪsᴛ* 」\n`;
      msg += `│ Pilih job (butuh Lv.10 untuk ganti)\n`;
      msg += `│\n`;

      for (const [id, job] of Object.entries(JOB_DB)) {
        const isCurrent = id === rpg.job;
        const mark = isCurrent ? " ← *aktif*" : "";
        msg += `│ ${isCurrent ? "✅" : "🔹"} *${job.name}* (${id})${mark}\n`;
        msg += `│     ATK +${job.atkBonus} | DEF +${job.defBonus} | SPD +${job.spdBonus} | HP +${job.hpBonus} | MP +${job.mpBonus}\n`;
      }

      msg += `│\n`;
      msg += `│ 📌 .jobrpg change <nama_job> untuk ganti\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    // Change job
    if (action === "change" || action === "ganti") {
      const jobName = args[1]?.toLowerCase();
      if (!jobName) return m.reply(claraWrap("jobrpg", "Job apa? Ketik .jobrpg list untuk lihat pilihan.", "warn"));

      if (!JOB_DB[jobName]) {
        return m.reply(claraWrap("jobrpg", `Job *${jobName}* tidak dikenal. Ketik .jobrpg list.`, "warn"));
      }

      const result = changeJob(m, jobName);

      if (result.success) {
        await m.react("🐣");
        let msg = `╭─「 *ᴊᴏʙ ᴄʜᴀɴɢᴇ* 」\n`;
        msg += `│ ✅ Job berhasil diganti!\n`;
        msg += `│\n`;
        msg += `│ 👔 Job baru: *${result.job.name}*\n`;
        msg += `│ 📊 Stats bonus:\n`;
        msg += `│   ATK +${result.job.atkBonus} | DEF +${result.job.defBonus}\n`;
        msg += `│   SPD +${result.job.spdBonus} | HP +${result.job.hpBonus}\n`;
        msg += `│   MP +${result.job.mpBonus}\n`;
        msg += `│\n`;
        msg += `│ ⚠️ Skill lama direset, skill points dikembalikan\n`;
        msg += `│ Ketik .jobrpg skill list untuk lihat skill baru\n`;
        msg += `╰──────────`;

        return m.reply(msg);
      } else {
        return m.reply(claraWrap("jobrpg", result.reason || "Gagal ganti job.", "warn"));
      }
    }

    // Skills
    if (action === "skill") {
      const skillAction = args[1]?.toLowerCase();

      // List available skills
      if (!skillAction || skillAction === "list") {
        const available = getAvailableSkills(m);
        const mySkills = rpg.skills || [];

        let msg = `╭─「 *sᴋɪʟʟs* 」\n`;
        msg += `│ ✨ Skill Points: *${rpg.skillPoints || 0}*\n`;
        msg += `│ 👔 Job: *${JOB_DB[rpg.job]?.name || "Pemula"}*\n`;
        msg += `│\n`;

        // Owned skills
        if (mySkills.length > 0) {
          msg += `│ 📜 *sᴋɪʟʟ ᴍɪʟɪᴋ* (${mySkills.length})\n`;
          for (const s of mySkills) {
            const sDef = SKILL_DB[s.id];
            if (!sDef) continue;
            msg += `│ ⚡ ${s.name} Lv.${s.level}/10\n`;
            msg += `│     MP: ${s.mpCost} | Power: ${s.power}x | CD: ${s.cooldown}r\n`;
          }
          msg += `│\n`;
        }

        // Available to unlock
        if (available.length > 0) {
          msg += `│ 📋 *ʙɪsᴀ ᴅɪʙᴜᴋᴀ*\n`;
          for (const s of available) {
            const sDef = SKILL_DB[s];
            if (!sDef) continue;
            msg += `│ 🔹 ${sDef.name} (${s}) — Lv.${sDef.minLevel} | MP ${sDef.mpCost}\n`;
          }
          msg += `│\n`;
          msg += `│ 📌 .jobrpg skill unlock <nama> — buka skill\n`;
        } else {
          msg += `│ 📋 Semua skill untuk job ini sudah dibuka\n`;
        }

        if (mySkills.length > 0) {
          msg += `│ 📌 .jobrpg skill upgrade <nama> — upgrade skill\n`;
        }

        msg += `╰──────────`;

        return m.reply(msg);
      }

      // Unlock skill
      if (skillAction === "unlock" || skillAction === "buka") {
        const skillId = args[2]?.toLowerCase();
        if (!skillId) return m.reply(claraWrap("jobrpg", "Skill apa? Ketik .jobrpg skill list", "warn"));

        const result = unlockSkill(m, skillId);

        if (result.success) {
          await m.react("🐣");
          let msg = `╭─「 *sᴋɪʟʟ ᴜɴʟᴏᴄᴋ* 」\n`;
          msg += `│ ✅ Skill berhasil dibuka!\n`;
          msg += `│ ⚡ ${result.skill.name} (${skillId})\n`;
          msg += `│ MP: ${result.skill.mpCost} | Power: ${result.skill.power}x\n`;
          msg += `│ Sisa skill points: *${rpg.skillPoints - 1}*\n`;
          msg += `╰──────────`;
          return m.reply(msg);
        } else {
          return m.reply(claraWrap("jobrpg", result.reason || "Gagal unlock skill.", "warn"));
        }
      }

      // Upgrade skill
      if (skillAction === "upgrade" || skillAction === "naik") {
        const skillId = args[2]?.toLowerCase();
        if (!skillId) return m.reply(claraWrap("jobrpg", "Skill apa? Ketik .jobrpg skill list", "warn"));

        const result = upgradeSkill(m, skillId);

        if (result.success) {
          await m.react("🐣");
          let msg = `╭─「 *sᴋɪʟʟ ᴜᴘɢʀᴀᴅᴇ* 」\n`;
          msg += `│ ✅ Skill berhasil di-upgrade!\n`;
          msg += `│ ⚡ ${result.skill.name} → Lv.${result.skill.level}\n`;
          msg += `│ Power: ${result.skill.power}x | MP: ${result.skill.mpCost}\n`;
          msg += `╰──────────`;
          return m.reply(msg);
        } else {
          return m.reply(claraWrap("jobrpg", result.reason || "Gagal upgrade skill.", "warn"));
        }
      }
    }

    return m.reply(claraWrap("jobrpg", "Aksi tidak dikenal. Ketik .jobrpg untuk info, .jobrpg list untuk lihat job.", "warn"));
  } catch (err) {
    console.error("jobrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("jobrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
