// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "tugas",
  alias: ["tugas", "tugasedu", "tugasmhs"],
  category: "education",
  description: "Tracker deadline tugas - catat, lihat, dan kelola tugas kuliah",
  usage: ".tugas <command>",
  example: ".tugas list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// Database-backed store: sender -> [{ id, name, deadline, subject, status, notes }]
function getStore(db) {
  if (!db.setting("eduTasks")) db.setSetting("eduTasks", {});
  return db.setting("eduTasks");
}
function saveStore(db) { db.save(); }

function getTasks(db, sender) {
  const store = getStore(db);
  if (!store[sender]) store[sender] = [];
  return store[sender];
}

function genId() {
  return "TG" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function parseDate(str) {
  // Accept: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM
  const today = new Date();
  let d, m, y;
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 2) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = today.getFullYear(); }
    else if (parts.length === 3) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
  } else if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 2) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = today.getFullYear(); }
    else if (parts.length === 3) {
      if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]); }
      else { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
    }
  }
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target - now;
  return Math.ceil(diff / 86400000);
}

function urgencyEmoji(days) {
  if (days < 0) return "🔴";
  if (days === 0) return "🔴";
  if (days <= 1) return "🟠";
  if (days <= 3) return "🟡";
  return "🟢";
}

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Tracker Tugas Kuliah\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}tugas add <deadline> | <nama> | <matkul>\` - Tambah tugas\n`;
    txt += `2. \`${m.prefix}tugas list\` - Lihat semua tugas\n`;
    txt += `3. \`${m.prefix}tugas pending\` - Tugas belum selesai\n`;
    txt += `4. \`${m.prefix}tugas done <id>\` - Tandai selesai\n`;
    txt += `5. \`${m.prefix}tugas del <id>\` - Hapus tugas\n`;
    txt += `6. \`${m.prefix}tugas clear\` - Hapus semua tugas\n\n`;
    txt += `Format deadline: DD/MM atau DD/MM/YYYY\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}tugas add 25/12 | Essay Filsafat | Filsafat Umum\`\n`;
    txt += `\`${m.prefix}tugas list\``;
    return await m.reply( txt, { commandName: "tugas" });
  }

  await m.react("🐣");

  try {
    // === ADD ===
    if (cmd === "add" || cmd === "tambah") {
      const input = cmdArgs.join(" ");
      const parts = input.split("|").map(s => s.trim());
      if (parts.length < 2) {
        return m.reply(claraWrap("tugas", "Format salah!\n\nContoh: `.tugas add 25/12 | Essay Filsafat | Filsafat Umum`\n\nFormat: <deadline> | <nama tugas> | <matkul (opsional)>"));
      }

      const deadline = parseDate(parts[0]);
      if (!deadline) {
        return m.reply(claraWrap("tugas", `Format tanggal salah!\n\nGunakan: DD/MM atau DD/MM/YYYY\nContoh: 25/12 atau 25/12/2026`));
      }

      const name = parts[1] || "Tanpa nama";
      const subject = parts[2] || "";
      const id = genId();
      const tasks = getTasks(db, sender);
      tasks.push({ id, name, deadline, subject, status: "pending", notes: "", created: Date.now() });
      saveStore(db);

      const days = daysUntil(deadline);
      let txt = `Tugas Ditambahkan!\n\n`;
      txt += `ID: ${id}\n`;
      txt += `Nama: ${name}\n`;
      if (subject) txt += `Matkul: ${subject}\n`;
      txt += `Deadline: ${formatDate(deadline)}\n`;
      txt += `Status: ${days < 0 ? "TERLEWAT" : days === 0 ? "HARI INI" : days + " hari lagi"}\n\n`;
      txt += `_Ketik \`${m.prefix}tugas done ${id}\` jika sudah selesai_`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === LIST ===
    else if (cmd === "list" || cmd === "all" || cmd === "semua") {
      const tasks = getTasks(db, sender);
      if (tasks.length === 0) {
        return m.reply(claraWrap("tugas", "Belum ada tugas tersimpan.\n\nKetik `.tugas add` untuk menambah."));
      }

      // Sort by deadline
      tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      let txt = `Daftar Tugas (${tasks.length})\n\n`;
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const days = daysUntil(t.deadline);
        txt += `${urgencyEmoji(days)} ${t.id} - ${t.name}\n`;
        if (t.subject) txt += `   Matkul: ${t.subject}\n`;
        txt += `   Deadline: ${formatDate(t.deadline)}\n`;
        if (t.status === "done") txt += `   Status: DONE\n`;
        else if (days < 0) txt += `   Status: TERLEWAT (${Math.abs(days)} hari lalu)\n`;
        else if (days === 0) txt += `   Status: HARI INI!\n`;
        else txt += `   Status: ${days} hari lagi\n`;
        txt += `\n`;
      }
      const pending = tasks.filter(t => t.status === "pending").length;
      const done = tasks.filter(t => t.status === "done").length;
      txt += `Total: ${tasks.length} | Pending: ${pending} | Done: ${done}`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === PENDING ===
    else if (cmd === "pending" || cmd === "aktif") {
      const tasks = getTasks(db, sender);
      const pending = tasks.filter(t => t.status === "pending");
      if (pending.length === 0) {
        return m.reply(claraWrap("Tugas", "Tidak ada tugas pending. Semua selesai!"));
      }

      pending.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      let txt = `Tugas Pending (${pending.length})\n\n`;
      for (let i = 0; i < pending.length; i++) {
        const t = pending[i];
        const days = daysUntil(t.deadline);
        txt += `${urgencyEmoji(days)} ${t.id} - ${t.name}\n`;
        if (t.subject) txt += `   Matkul: ${t.subject}\n`;
        txt += `   Deadline: ${formatDate(t.deadline)}\n`;
        if (days < 0) txt += `   Status: TERLEWAT (${Math.abs(days)} hari)\n`;
        else if (days === 0) txt += `   Status: HARI INI!\n`;
        else txt += `   Status: ${days} hari lagi\n`;
        txt += `\n`;
      }
      await m.reply(txt);
      await m.react("✅");
    }

    // === DONE ===
    else if (cmd === "done" || cmd === "selesai") {
      const id = cmdArgs[0]?.toUpperCase();

      const tasks = getTasks(db, sender);
      const task = tasks.find(t => t.id === id);

      task.status = "done";
      await m.reply(claraWrap("Tugas", `Tugas selesai!\n\n${task.id} - ${task.name}\n> Good job! 🎉`));
      await m.react("✅");
    }

    // === DELETE ===
    else if (cmd === "del" || cmd === "hapus") {
      const id = cmdArgs[0]?.toUpperCase();

      const tasks = getTasks(db, sender);
      const idx = tasks.findIndex(t => t.id === id);

      const removed = tasks.splice(idx, 1)[0];
      await m.reply(claraWrap("Tugas", `Tugas dihapus!\n\n${removed.id} - ${removed.name}`));
      await m.react("✅");
    }

    // === CLEAR ===
    else if (cmd === "clear" || cmd === "reset") {
      taskStore.set(sender, []);
      await m.reply(claraWrap("Tugas", "Semua tugas dihapus!"));
      await m.react("✅");
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}tugas help\` untuk bantuan.`);
    }
  } catch (e) {
    console.error("[TUGAS] Error:", e.message);
    await m.reply(claraWrap("tugas", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
