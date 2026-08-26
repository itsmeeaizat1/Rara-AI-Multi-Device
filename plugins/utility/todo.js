// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "todo", alias: ["todo", "todolist", "tasklist"], category: "utility",
  description: "To-do list personal", usage: ".todo <add/del/list/clear>",
  example: ".todo add beli beras", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const task = args.slice(1).join(" ").trim();
    const db = getDatabase();
    if (!db.todo) db.todo = {};
    const sender = m.sender || m.key?.participant || "";
    if (!db.todo[sender]) db.todo[sender] = [];
    const todos = db.todo[sender];

    if (action === "add" && task) {
      todos.push({ text: task, done: false, created: Date.now() });
      db.write();
      await m.reply(claraWrap("To-Do List", [`│ ❏ Tugas: *${task}*`, `│ ❏ Total: *${todos.length}*`].join("\n")) + "\n" + tipText(`Ketik ${prefix}todo list untuk lihat semua`));
    } else if (action === "done" && task) {
      const idx = parseInt(task) - 1;
      if (idx >= 0 && idx < todos.length) { todos[idx].done = true; db.write(); }
      await m.reply(claraWrap("To-Do List", [`│ ❏ Tugas #${idx+1} ditandai selesai`].join("\n")));
    } else if (action === "del" && task) {
      const idx = parseInt(task) - 1;
      if (idx >= 0 && idx < todos.length) { todos.splice(idx, 1); db.write(); }
      await m.reply(claraWrap("To-Do List", [`│ ❏ Tugas #${idx+1} dihapus`].join("\n")));
    } else if (action === "clear") {
      todos.length = 0; db.write();
      await m.reply(claraWrap("To-Do List", ["│ ❏ Semua tugas dihapus"].join("\n")));
    } else {
      if (!todos.length) {
        await m.reply(claraWrap("To-Do List", ["│ ❏ Belum ada tugas", `│ ❏ Ketik: *${prefix}todo add <tugas>*`].join("\n")));
        return { handled: true };
      }
      let text = claraHeader("To-Do List", "📝") + "\n\n";
      todos.forEach((t, i) => {
        text += `${t.done ? "✅" : "⬜"} ${i+1}. ${t.text}\n`;
      });
      text += "\n" + separator("━", 22) + "\n" + tipText(`${prefix}todo done <nomor> | ${prefix}todo del <nomor>`);
      await m.reply(text);
    }
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`│ ❏ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };