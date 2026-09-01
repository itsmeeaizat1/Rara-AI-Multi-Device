// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rangerpost.js — Ranger Post (daily patrol duty, earn salary)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rangerpost",
  alias: ["rangerpost", "rangerduty", "patrolduty", "ranger"],
  category: "rpg",
  description: "Ranger Post — daily check-in, patrol duty, salary RPG",
  usage: ".rangerpost (check-in/info)\n.rangerpost task <1-3> (lakukan tugas)",
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

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const today = getTodayKey();
    let data = await db.getPlayerData?.(m.sender, "rangerpost") || { lastCheckIn: null, tasksDone: [], totalGold: 0, level: 1, days: 0 };

    // Auto check-in
    if (data.lastCheckIn !== today) {
      data.lastCheckIn = today;
      data.tasksDone = [];
      data.days = (data.days || 0) + 1;
      const salary = (data.level || 1) * 100;
      try { await db.addGold?.(m.sender, salary); } catch {}
      data.totalGold = (data.totalGold || 0) + salary;

      // Level up every 7 days
      if (data.days % 7 === 0) {
        data.level = (data.level || 1) + 1;
      }
      await db.setPlayerData?.(m.sender, "rangerpost", data);
      await m.react("🐣");
      let msg = "";
      msg += `🎖️ Daily Check-in Berhasil!\n`;
      msg += `Salary: *+${salary} gold*\n`;
      msg += `Days: *${data.days}*\n`;
      msg += `Ranger Level: *${data.level || 1}*\n`;
      if (data.days % 7 === 0) msg += `⭐ LEVEL UP! Ranger Lv.${data.level}\n`;
      msg += `
`;
      msg += `Tugas hari ini:\n`;
      TASKS.forEach(t => {
        const done = data.tasksDone?.includes(t.id);
        msg += `${t.emoji} ${t.name} ${done ? "✅" : `→ ${m.prefix}rangerpost task ${t.id}`}\n`;
      });
            return m.reply(msg);
    }

    if (subCmd === "task" || subCmd === "tugas") {
      const taskId = parseInt(m.args[1] || "0");
      const task = TASKS.find(t => t.id === taskId);
      if (!task) {
        return m.reply(claraWrap("rangerpost", `Tugas tidak ditemukan. Pilih 1-3.`, "guide"));
      }

      if (data.tasksDone?.includes(taskId)) {
        return m.reply(claraWrap("rangerpost", `Tugas "${task.name}" sudah diselesaikan hari ini.`, "error"));
      }

      await m.react("🕒");

      const success = Math.random() < task.successRate;
      const narrative = success
        ? NARRATIVES.success[Math.floor(Math.random() * NARRATIVES.success.length)]
        : NARRATIVES.fail[Math.floor(Math.random() * NARRATIVES.fail.length)];

      if (success) {
        try { await db.addGold?.(m.sender, task.reward); } catch {}
        data.totalGold = (data.totalGold || 0) + task.reward;
      }

      data.tasksDone.push(taskId);
      await db.setPlayerData?.(m.sender, "rangerpost", data);

      await m.react("🐣");
      let msg = "";
      msg += `${task.emoji} *${task.name}*\n`;
      msg += `${task.desc}\n`;
      msg += `
`;
      msg += `${narrative}\n`;
      msg += `
`;
      if (success) {
        msg += `🏆 *BERHASIL!*\n`;
        msg += `Reward: +${task.reward} gold\n`;
      } else {
        msg += `💀 *GAGAL!*\n`;
        msg += `Tidak ada reward\n`;
      }
      const remaining = 3 - data.tasksDone.length;
      msg += `Sisa tugas: *${remaining}*\n`;
            return m.reply(msg);
    }

    // STATUS (default)
    let msg = "";
    msg += `Ranger Level: *${data.level || 1}*\n`;
    msg += `Total Days: *${data.days || 0}*\n`;
    msg += `Total Gold: *${data.totalGold || 0}*\n`;
    msg += `
`;
    msg += `Tugas hari ini (${data.tasksDone?.length || 0}/3):\n`;
    TASKS.forEach(t => {
      const done = data.tasksDone?.includes(t.id);
      msg += `${t.emoji} ${t.name} ${done ? "✅" : "📋"}\n`;
      if (!done) msg += `Reward: ${t.reward}g | ${m.prefix}rangerpost task ${t.id}\n`;
    });
        return m.reply(msg);
  } catch (err) {
    console.error("rangerpost error:", err);
    await m.react("❌");
    return m.reply(claraWrap("rangerpost", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
