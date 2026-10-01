// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/rara-countdown.js";

const pluginConfig = {
  name: "tugas",
  alias: ["tugas"],
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
  if (!db.setting("eduTasks")) db.setting("eduTasks", {}); // db.setting(key, value) — BUKAN setSetting
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
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null; // 31/02 dll ditolak
  return dt;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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

/** Akhir hari deadline (23:59:59) — batas terakhir ngerjain. */
function deadlineEodTs(t) {
  const d = new Date(t.deadline);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Sisa ms menuju akhir hari deadline. */
function remainingMs(t) {
  return deadlineEodTs(t) - Date.now();
}

// ═════════════════════════════════════════════════════════════════
// H-1 LIVE TICKER (13 Sep 2026) — tugas terdekat ≤ 48 jam → kartu
// countdown 🕒 edit-in-place sampai deadline (akhir hari) tiba.
// Guard anti stack: 1 ticker per task aktif (global.__tugasTickers).
// ═════════════════════════════════════════════════════════════════
function buildTaskTickCard(t, remMs) {
  const lines = [
    "⏰ *TUGAS PALING DEKET*",
    "",
    `${urgencyEmoji(daysUntil(t.deadline))} ${t.id} — ${t.name}`,
  ];
  if (t.subject) lines.push(`📚 ${t.subject}`);
  lines.push(`📅 Deadline: ${formatDate(t.deadline)}`);
  lines.push("");
  lines.push(`🕒 Sisa: *${formatRemaining(remMs)}*`);
  lines.push("");
  lines.push("_udah dikerjain belum nih?_ ✨");
  return raraWrap("Deadline Terdekat", lines.join("\n"));
}

function buildTaskFinalCard(t) {
  return raraWrap("Deadline Terdekat", [
    "⌛ *WAKTU HABIS!*",
    "",
    `🔴 ${t.id} — ${t.name}`,
    `📅 Deadline: ${formatDate(t.deadline)}`,
    "",
    "_deadline hari terakhir udah lewat — buruan kejar / tandai done_",
  ].join("\n"));
}

function buildTaskCancelledCard(t) {
  return raraWrap("Deadline Terdekat", [
    "✅ *COUNTDOWN DIBATALKAN*",
    "",
    `${t.id} — ${t.name}`,
    "",
    "_tugas udah selesai/dihapus — countdown mati sendiri_ ✨",
  ].join("\n"));
}

function fireTaskTicker(sock, chat, t, watch) {
  const key = t.id;
  const g = (global.__tugasTickers = global.__tugasTickers || {});
  if (g[key]) return; // ticker task ini lagi jalan — gak dobel
  g[key] = true;
  const targetTs = deadlineEodTs(t);
  runLiveTicker({
    sock,
    chat,
    m: null,
    initialCard: buildTaskTickCard(t, remainingMs(t)),
    tickCard: (st) => buildTaskTickCard(t, st.remainingMs),
    // closing adaptif: dibatalin (done/dihapus) ≠ deadline beneran habis
    finalCard: () => (typeof watch === "function" && watch() ? buildTaskCancelledCard(t) : buildTaskFinalCard(t)),
    mode: "down",
    targetTs,
    maxEdits: 40, // ≤48 jam: ngetick ~1 jam pertama, sisanya settle final statis
    isCancelled: typeof watch === "function" ? watch : null, // tugas done/dihapus → ticker batal
  }).finally(() => { delete g[key]; });
}

/** Cari tugas pending terdekat yang ≤ 48 jam → fire ticker. */
function fireNearestTaskTicker(sock, chat, tasks, watchFor) {
  const pending = tasks
    .filter((t) => t.status === "pending")
    .filter((t) => remainingMs(t) > 0 && remainingMs(t) <= 48 * 3600000)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  if (pending.length === 0) return null;
  fireTaskTicker(sock, chat, pending[0], watchFor(pending[0].id));
  return pending[0];
}

/** Watch: tugas masih pending? (dipakai isCancelled ticker — tugas
 * done/dihapus → ticker berhenti, gak ngitung nyasar) */
function makeWatch(db, sender, id) {
  return () => {
    try {
      const t = getTasks(db, sender).find((x) => x.id === id);
      return !t || t.status !== "pending"; // dihapus/done → ticker batal
    } catch {
      return true;
    }
  };
}

async function handler(m, { sock, args, db }) {
  const sender = m.sender;
  const database = db || getDatabase();
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);
  const prefix = m.prefix || ".";

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Tracker Tugas Kuliah\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${prefix}tugas add <deadline> | <nama> | <matkul>\` - Tambah tugas\n`;
    txt += `2. \`${prefix}tugas list\` - Lihat semua tugas\n`;
    txt += `3. \`${prefix}tugas pending\` - Tugas belum selesai\n`;
    txt += `4. \`${prefix}tugas done <id>\` - Tandai selesai\n`;
    txt += `5. \`${prefix}tugas del <id>\` - Hapus tugas\n`;
    txt += `6. \`${prefix}tugas clear\` - Hapus semua tugas\n\n`;
    txt += `Format deadline: DD/MM atau DD/MM/YYYY\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${prefix}tugas add 25/12 | Essay Filsafat | Filsafat Umum\`\n`;
    txt += `\`${prefix}tugas list\``;
    return await m.reply( txt, { commandName: "tugas" });
  }
  try {
    // === ADD ===
    if (cmd === "add" || cmd === "tambah") {
      const input = cmdArgs.join(" ");
      const parts = input.split("|").map(s => s.trim());
      if (parts.length < 2) {
        return m.reply(raraWrap("tugas", "Format salah!\n\n💡 *Contoh:* `.tugas add 25/12 | Essay Filsafat | Filsafat Umum`\n\nFormat: <deadline> | <nama tugas> | <matkul (opsional)>"));
      }

      const deadline = parseDate(parts[0]);
      if (!deadline) {
        return m.reply(raraWrap("tugas", `Format tanggal salah!\n\nGunakan: DD/MM atau DD/MM/YYYY\n💡 *Contoh:* 25/12 atau 25/12/2026`));
      }

      const name = parts[1] || "Tanpa nama";
      const subject = parts[2] || "";
      const id = genId();
      const tasks = getTasks(database, sender);
      tasks.push({ id, name, deadline: deadline.toISOString(), subject, status: "pending", notes: "", created: Date.now() });
      saveStore(database);

      const days = daysUntil(deadline);
      const sisa = remainingMs({ deadline: deadline.toISOString() });
      let txt = `Tugas Ditambahkan!\n\n`;
      txt += `ID: ${id}\n`;
      txt += `Nama: ${name}\n`;
      if (subject) txt += `Matkul: ${subject}\n`;
      txt += `Deadline: ${formatDate(deadline)}\n`;
      txt += `Status: ${days < 0 ? "TERLEWAT" : days === 0 ? "HARI INI" : days + " hari lagi"}\n`;
      if (days >= 0 && sisa <= 48 * 3600000) txt += `\n🕒 *Countdown live menyusul di bawah* 👇`;
      txt += `\n\n_Ketik \`${prefix}tugas done ${id}\` jika sudah selesai_`;
      await m.reply(txt);

      // deadline ≤ 48 jam → ticker H-1 live
      if (days >= 0 && sisa > 0 && sisa <= 48 * 3600000) {
        const t = getTasks(database, sender).find((x) => x.id === id);
        fireTaskTicker(sock, m.chat, t, makeWatch(database, sender, id));
      }
    }

    // === LIST ===
    else if (cmd === "list" || cmd === "all" || cmd === "semua") {
      const tasks = getTasks(database, sender);
      if (tasks.length === 0) {
        return m.reply(raraWrap("tugas", "Belum ada tugas tersimpan.\n\nKetik `.tugas add` untuk menambah."));
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

      // tugas terdekat ≤ 48 jam → ticker live
      fireNearestTaskTicker(sock, m.chat, tasks, (id) => makeWatch(database, sender, id));
    }

    // === PENDING ===
    else if (cmd === "pending" || cmd === "aktif") {
      const tasks = getTasks(database, sender);
      const pending = tasks.filter(t => t.status === "pending");
      if (pending.length === 0) {
        return m.reply(raraWrap("Tugas", "Tidak ada tugas pending. Semua selesai!"));
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

      fireNearestTaskTicker(sock, m.chat, pending, (id) => makeWatch(database, sender, id));
    }

    // === DONE ===
    else if (cmd === "done" || cmd === "selesai") {
      const id = cmdArgs[0]?.toUpperCase();
      const tasks = getTasks(database, sender);
      const task = tasks.find(t => t.id === id);
      if (!task) {
        return m.reply(raraWrap("Tugas", `Tugas *${id || "?"}* gak ketemu.\n\nCek ID di \`${prefix}tugas list\``));
      }
      if (task.status === "done") {
        return m.reply(raraWrap("Tugas", `Tugas *${task.id}* udah DONE duluan.`));
      }
      task.status = "done";
      saveStore(database);
      await m.reply(raraWrap("Tugas", `Tugas selesai!\n\n${task.id} - ${task.name}\nGood job! 🎉`));
    }

    // === DELETE ===
    else if (cmd === "del" || cmd === "hapus") {
      const id = cmdArgs[0]?.toUpperCase();
      const tasks = getTasks(database, sender);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) {
        return m.reply(raraWrap("Tugas", `Tugas *${id || "?"}* gak ketemu.\n\nCek ID di \`${prefix}tugas list\``));
      }
      const removed = tasks.splice(idx, 1)[0];
      saveStore(database);
      await m.reply(raraWrap("Tugas", `Tugas dihapus!\n\n${removed.id} - ${removed.name}`));
    }

    // === CLEAR ===
    else if (cmd === "clear" || cmd === "reset") {
      const tasks = getTasks(database, sender);
      const n = tasks.length;
      tasks.length = 0;
      saveStore(database);
      await m.reply(raraWrap("Tugas", n > 0 ? `Semua tugas dihapus (${n})!` : "Belum ada tugas yang perlu dihapus."));
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${prefix}tugas help\` untuk bantuan.`);
    }
  } catch (e) {
    console.error("[TUGAS] Error:", e.message);
    await m.reply(raraWrap("tugas", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
