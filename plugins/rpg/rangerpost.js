// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rangerpost.js — Ranger Post (daily patrol duty, earn salary)
// Rombak khas (batch #14): animasi Radar Patroli + item khas
// Lencana Jasa + tool Radar Ranger (+10% salary & reward per level).
// FIX: expReward tadinya di-declare tapi GAK PERNAH dibayar →
// sekarang addExp beneran (bonus: auto payout uang dari addExp).

import { getDatabase } from "../../src/lib/rara-database.js";
import { ensureRpg, addExp, getCash, spendCash, formatRp } from "../../src/lib/rara-rpg-service.js";
import { shapeRanger } from "../../src/lib/rara-rpg-shapes.js";
import { raraGameBox, gameCTA, raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "rangerpost",
  alias: ["rangerpost", "rangerduty", "patrolduty", "ranger"],
  category: "rpg",
  description: "Ranger Post — daily check-in, patrol duty, salary RPG",
  usage: ".rangerpost (check-in/info)\n.rangerpost task <1-3> (lakukan tugas)\n.rangerpost radar (status tool)\n.rangerpost upgrade (upgrade radar)",
  example: ".rangerpost\n.rangerpost task 1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 3, isEnabled: true,
};

const TASKS = [
  { id: 1, name: "Defeat Monster", emoji: "⚔️", successRate: 0.7, reward: 300, expReward: 50, desc: "Kalahkan monster liar di area" },
  { id: 2, name: "Rescue Civilian", emoji: "🆘", successRate: 0.6, reward: 400, expReward: 60, desc: "Selamatkan warga terancam" },
  { id: 3, name: "Gather Intel", emoji: "📜", successRate: 0.8, reward: 200, expReward: 30, desc: "Kumpulkan info musuh" },
];

const NARRATIVES = {
  success: [
    "Berhasil! Tugas diselesaikan dengan sempurna.",
    "Misi selesai! Kamu dapat pujian dari komandan.",
    "Tugas rampung! Reward sudah ditransfer.",
  ],
  fail: [
    "Gagal! Musuh terlalu kuat, kamu mundur.",
    "Misi gagal! Warga tidak bisa diselamatkan kali ini.",
    "Info yang dikumpulkan tidak akurat. Coba lagi besok.",
  ],
};

// ─── KHAS RANGERPOST: 🎖️ Lencana Jasa & 📡 Radar Ranger ───
const TOOL = {
  name: "📡 Radar Ranger", dbKey: "rangerTool",
  BADGE_CHANCE: 30,             // % per tugas sukses (hari perfect 3/3 → +2 bonus)
  badgeCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 25000 * (lv + 1),
  bonus: (lv) => 0.1 * lv,      // salary & task reward +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, badges: 0 });

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function taskListBody(data, prefix) {
  return TASKS.map((t) => {
    const done = data.tasksDone?.includes(t.id);
    return done
      ? `${t.emoji} ${t.name} ✅`
      : `${t.emoji} ${t.name} → ${prefix}rangerpost task ${t.id}`;
  }).join("\n");
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args?.[0] || "").toLowerCase();
    const db = await getDatabase();
    const today = getTodayKey();
    let data = await db.getPlayerData?.(m.sender, "rangerpost") || { lastCheckIn: null, tasksDone: [], successCount: 0, totalGold: 0, level: 1, days: 0 };
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    // ── subcommand khas: radar status ──
    if (subCmd === "radar" || subCmd === "status") {
      return m.reply(raraRpgBox("rangerpost",
        `📡 RADAR RANGER KAMU\n\n` +
        `Level : *Lv.${lv}*\n⭐ Bonus : +${10 * lv}% salary & reward\n🎖️ Lencana Jasa : ${tool.badges || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.badgeCost(lv)}x Lencana + ${formatRp(TOOL.rpCost(lv))}\nKetik: ${m.prefix}rangerpost upgrade`));
    }

    // ── subcommand khas: upgrade ──
    if (subCmd === "upgrade") {
      const needB = TOOL.badgeCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.badges || 0) < needB) {
        await m.react("❌");
        return m.reply(raraRpgBox("rangerpost",
          `🎖️ Upgrade Radar ke Lv.${lv + 1} butuh:\n\n• Lencana Jasa : ${needB}x (punya ${tool.badges || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Lencana didapat dari tugas sukses — 30% per tugas, hari perfect (3/3 sukses) bonus +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        await m.react("❌");
        return m.reply(raraRpgBox("rangerpost", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.badges = (fresh.badges || 0) - needB;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      await db.setPlayerData?.(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("rangerpost",
        `📡 RADAR UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n⭐ Bonus : +${10 * (lv + 1)}% salary & reward\n\n🎖️ Material : −${needB} Lencana Jasa\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    // ── task ──
    if (subCmd === "task" || subCmd === "tugas") {
      const taskId = parseInt(m.args?.[1] || "0");
      const task = TASKS.find((t) => t.id === taskId);
      if (!task) {
        return m.reply(raraRpgBox("rangerpost", `Tugas tidak ditemukan. Pilih 1-3.`, "guide"));
      }
      if (data.tasksDone?.includes(taskId)) {
        return m.reply(raraRpgBox("rangerpost", `Tugas "${task.name}" sudah diselesaikan hari ini.`, "error"));
      }

      await m.react("⏲️");
      const success = Math.random() < task.successRate;

      // Animasi khas: radar patroli
      await shapeRanger(m, sock, task, success);

      let rewardGain = 0;
      if (success) {
        rewardGain = Math.floor(task.reward * (1 + TOOL.bonus(lv)));
        await db.addGold?.(m.sender, rewardGain);
        data.totalGold = (data.totalGold || 0) + rewardGain;
        // FIX BUG LAMA: expReward tadinya gak pernah dibayar
        addExp(m, task.expReward);
        data.successCount = (data.successCount || 0) + 1;
      }

      data.tasksDone.push(taskId);

      // 🎖️ Lencana Jasa — 30% per sukses; hari perfect (3/3 sukses) bonus +2
      let badgeGain = 0;
      if (success) {
        if (Math.random() * 100 < TOOL.BADGE_CHANCE) badgeGain = 1;
        if (data.tasksDone.length === 3 && data.successCount === 3) badgeGain += 2;
        if (badgeGain > 0) {
          const fresh = getTool(m.sender);
          fresh.badges = (fresh.badges || 0) + badgeGain;
          await db.setPlayerData?.(m.sender, TOOL.dbKey, fresh);
        }
      }
      await db.setPlayerData?.(m.sender, "rangerpost", data);

      const remaining = 3 - data.tasksDone.length;
      await m.react("🐣");
      return m.reply(raraGameBox({
        title: "rangerpost", icon: "🎖️",
        flavor: success ? "🏆 *BERHASIL!*" : "💀 *GAGAL!*",
        body: [
          `${task.emoji} ${task.name} — ${task.desc}`,
          "",
          success ? NARRATIVES.success[Math.floor(Math.random() * NARRATIVES.success.length)]
                  : NARRATIVES.fail[Math.floor(Math.random() * NARRATIVES.fail.length)],
          "",
          ...(success ? [`💰 Reward : +${rewardGain} gold`] : ["Tidak ada reward kali ini"]),
          ...(success ? [`⭐ EXP : +${task.expReward}`] : []),
          ...(success ? [`💵 Uang : Rp ${formatRp(getCash(m))}`] : []),
          ...(badgeGain ? [`🎖️ Lencana Jasa : +${badgeGain}x (total ${getTool(m.sender).badges}x)`] : []),
          `📋 Sisa tugas : ${remaining}`,
          ...(remaining === 0 ? ["", "🎯 Semua tugas hari ini selesai! Kembali besok."] : []),
        ].join("\n"),
        cta: gameCTA("rangerpost"),
      }));
    }

    // ── auto check-in harian ──
    if (data.lastCheckIn !== today) {
      data.lastCheckIn = today;
      data.tasksDone = [];
      data.successCount = 0;
      data.days = (data.days || 0) + 1;
      const salary = Math.floor((data.level || 1) * 100 * (1 + TOOL.bonus(lv)));
      await db.addGold?.(m.sender, salary);
      data.totalGold = (data.totalGold || 0) + salary;

      let leveled = false;
      if (data.days % 7 === 0) {
        data.level = (data.level || 1) + 1;
        leveled = true;
      }
      await db.setPlayerData?.(m.sender, "rangerpost", data);
      await m.react("🐣");
      return m.reply(raraGameBox({
        title: "rangerpost", icon: "🎖️",
        flavor: "🎖️ *CHECK-IN BERHASIL!*",
        body: [
          `💰 Salary harian : +${salary} gold`,
          `📅 Hari bertugas : ${data.days}`,
          `🎖️ Ranger level : ${data.level || 1}`,
          ...(lv ? [`📡 Radar : Lv.${lv} (+${10 * lv}%)`] : []),
          ...(leveled ? ["", `⭐ LEVEL UP! Ranger Lv.${data.level}`] : []),
          "",
          "Tugas hari ini:",
          taskListBody(data, m.prefix),
        ].join("\n"),
        cta: gameCTA("rangerpost"),
      }));
    }

    // ── STATUS (default) ──
    return m.reply(raraRpgBox("rangerpost",
      `🎖️ RANGER POST\n\n` +
      `Ranger Level : *${data.level || 1}*\n` +
      `Hari bertugas : *${data.days || 0}*\n` +
      `Total gaji terkumpul : *${data.totalGold || 0} gold*\n` +
      `📡 Radar : Lv.${lv}${lv ? ` (+${10 * lv}%)` : ""}\n\n` +
      `Tugas hari ini (${data.tasksDone?.length || 0}/3):\n${taskListBody(data, m.prefix)}`));
  } catch (err) {
    console.error("rangerpost error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("rangerpost", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
