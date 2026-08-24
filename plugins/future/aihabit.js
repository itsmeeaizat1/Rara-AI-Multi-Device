// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "aihabit", alias: ["habitcoach", "habittracker", "habit"], category: "future",
  description: "AI habit coach & tracker", usage: ".aihabit <add/list/streak>",
  example: ".aihabit add olahraga 30 hari", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: true, cooldown: 2, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    if (!db.habits) db.habits = {};
    const sender = m.sender || "";
    if (!db.habits[sender]) db.habits[sender] = [];
    
    if (action === "add") {
      const habit = args.slice(1).join(" ");
      if (!habit) throw new Error("Nama habit kosong");
      db.habits[sender].push({ name: habit, streak: 0, lastCheck: 0, created: Date.now() });
      db.write();
      await m.reply(claraWrap("AI Habit", [`  ┊  ➶ Habit: *${habit}*`, `  ┊  ➶ Ketik *${prefix}aihabit done* untuk check-in`].join("\n")));
    } else if (action === "done") {
      const idx = parseInt(args[1] || "1") - 1;
      const habit = db.habits[sender][idx];
      if (!habit) throw new Error("Habit tidak ditemukan");
      const today = new Date().toDateString();
      if (new Date(habit.lastCheck).toDateString() === today) throw new Error("Sudah check-in hari ini!");
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      habit.streak = new Date(habit.lastCheck).toDateString() === yesterday ? habit.streak + 1 : 1;
      habit.lastCheck = Date.now(); db.write();
      await m.reply(claraWrap("AI Habit", [`  ┊  ➶ Habit: *${habit.name}*`, `  ┊  ➶ Streak: *${habit.streak} hari* 🔥`].join("\n")));
    } else {
      if (!db.habits[sender].length) {
        await m.reply(claraWrap("AI Habit", ["  ┊  ➶ Belum ada habit", `  ┊  ➶ Ketik: *${prefix}aihabit add <nama>*`].join("\n")));
        return { handled: true };
      }
      let text = claraWrap("Habit Tracker", "🎯") + "\n\n";
      db.habits[sender].forEach((h, i) => {
        text += `${i+1}. ${h.name} - 🔥 ${h.streak} hari\n`;
      });
      text += "\n" + separator("━", 22) + "\n" + tipText(`${prefix}aihabit done <nomor> untuk check-in`);
      await m.reply(text);
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };