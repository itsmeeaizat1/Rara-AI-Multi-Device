// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const pluginConfig = {
  name: "jadwalku",
  alias: ["jadwalku", "jadwal"],
  category: "education",
  description: "Jadwal kuliah personal - catat dan cek jadwal kelas harian",
  usage: ".jadwal <command>",
  example: ".jadwal list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// Database-backed store: sender -> [{ id, day, startTime, endTime, subject, room, lecturer }]
function getStore(db) {
  if (!db.setting("eduSchedules")) db.setting("eduSchedules", {}); // setting(key, value) = getter+setter (setSetting tidak ada)
  return db.setting("eduSchedules");
}
function saveStore(db) { db.save(); }

const DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
const DAY_EMOJI = { "senin": "Sen", "selasa": "Sel", "rabu": "Rab", "kamis": "Kam", "jumat": "Jum", "sabtu": "Sab", "minggu": "Min" };

function getSchedule(db, sender) {
  const store = getStore(db);
  if (!store[sender]) store[sender] = [];
  return store[sender];
}

function genId() {
  return "JW" + Math.random().toString(36).substring(2, 5).toUpperCase();
}

function parseTime(str) {
  const match = str.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function getCurrentDay() {
  const days = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  return days[new Date().getDay()];
}

function formatDay(day) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const db = getDatabase();
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Jadwal Kuliah\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}jadwal add <hari> | <jam mulai> | <jam selesai> | <matkul> | <ruang (opsional)>\` - Tambah jadwal\n`;
    txt += `2. \`${m.prefix}jadwal list\` - Lihat semua jadwal\n`;
    txt += `3. \`${m.prefix}jadwal hari <nama hari>\` - Lihat jadwal per hari\n`;
    txt += `4. \`${m.prefix}jadwal today\` - Lihat jadwal hari ini\n`;
    txt += `5. \`${m.prefix}jadwal next\` - Kelas terdekat\n`;
    txt += `6. \`${m.prefix}jadwal del <id>\` - Hapus jadwal\n`;
    txt += `7. \`${m.prefix}jadwal clear\` - Hapus semua jadwal\n\n`;
    txt += `Hari: senin, selasa, rabu, kamis, jumat, sabtu, minggu\n`;
    txt += `Format jam: HH.MM atau HH:MM\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}jadwal add senin | 08.00 | 09.30 | Kalkulus | R.301\`\n`;
    txt += `\`${m.prefix}jadwal today\``;
    return await m.reply( txt, { commandName: "jadwal" });
  }
  try {
    // === ADD ===
    if (cmd === "add" || cmd === "tambah") {
      const input = cmdArgs.join(" ");
      const parts = input.split("|").map(s => s.trim());
      if (parts.length < 4) {
        return m.reply(raraWrap("jadwal", "Format salah!\n\n💡 *Contoh:* `.jadwal add senin | 08.00 | 09.30 | Kalkulus | R.301`\n\nFormat: <hari> | <jam mulai> | <jam selesai> | <matkul> | <ruang (opsional)>"));
      }

      const day = parts[0].toLowerCase();
      if (!DAYS.includes(day)) {
        return m.reply(raraError("Jadwal", `Hari gak valid nih! Pilih: ${DAYS.join(", ")}`));
      }

      const startTime = parseTime(parts[1]);
      if (!startTime) {
        return m.reply(raraError("Jadwal", `Jam mulai gak valid nih! Format: HH.MM atau HH:MM`));
      }

      const endTime = parseTime(parts[2]);
      if (!endTime) {
        return m.reply(raraError("Jadwal", `Jam selesai gak valid nih! Format: HH.MM atau HH:MM`));
      }

      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return m.reply(raraWrap("Jadwal", "Jam selesai harus setelah jam mulai!"));
      }

      const subject = parts[3] || "Tanpa nama";
      const room = parts[4] || "";
      const id = genId();
      const schedule = getSchedule(db, sender);
      schedule.push({ id, day, startTime, endTime, subject, room, created: Date.now() });
      saveStore(db);

      let txt = `Jadwal Ditambahkan!\n\n`;
      txt += `ID: ${id}\n`;
      txt += `Hari: ${formatDay(day)}\n`;
      txt += `Jam: ${startTime} - ${endTime}\n`;
      txt += `Matkul: ${subject}\n`;
      if (room) txt += `Ruang: ${room}\n`;
      await m.reply(txt);
    }

    // === LIST ALL ===
    else if (cmd === "list" || cmd === "all" || cmd === "semua") {
      const schedule = getSchedule(db, sender);
      if (schedule.length === 0) {
        return m.reply(raraWrap("jadwal", "Belum ada jadwal tersimpan.\n\nKetik `.jadwal add` untuk menambah."));
      }

      // Group by day
      let txt = `Jadwal Kuliah (${schedule.length} kelas)\n\n`;
      for (const day of DAYS) {
        const dayClasses = schedule.filter(s => s.day === day).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        if (dayClasses.length === 0) continue;
        txt += `${formatDay(day)}\n`;
        for (const c of dayClasses) {
          txt += `  ${c.startTime}-${c.endTime} | ${c.subject}`;
          if (c.room) txt += ` | ${c.room}`;
          txt += ` [${c.id}]\n`;
        }
        txt += `\n`;
      }
      await m.reply(txt);
    }

    // === TODAY ===
    else if (cmd === "today" || cmd === "hariini" || cmd === "sekarang") {
      const schedule = getSchedule(db, sender);
      const today = getCurrentDay();
      const todayClasses = schedule.filter(s => s.day === today).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      if (todayClasses.length === 0) {
        return m.reply(raraWrap("Jadwal", `Hari ini (${formatDay(today)}) tidak ada kelas. Santai dulu!`));
      }

      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let txt = `Jadwal Hari Ini (${formatDay(today)})\n\n`;
      for (const c of todayClasses) {
        const startMin = timeToMinutes(c.startTime);
        const endMin = timeToMinutes(c.endTime);
        let status = "";
        if (nowMin < startMin) status = ` (dalam ${Math.round((startMin - nowMin) / 60 * 10) / 10} jam)`;
        else if (nowMin >= startMin && nowMin < endMin) status = " (SEDANG BERLANGSUNG)";
        else status = " (selesai)";

        txt += `${c.startTime}-${c.endTime} | ${c.subject}`;
        if (c.room) txt += ` | ${c.room}`;
        txt += `${status}\n`;
      }
      await m.reply(txt);
    }

    // === NEXT CLASS ===
    else if (cmd === "next" || cmd === "berikutnya" || cmd === "selanjutnya") {
      const schedule = getSchedule(db, sender);
      const today = getCurrentDay();
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      // Find next class today
      let nextClass = null;
      let nextDay = today;
      let dayOffset = 0;

      for (let offset = 0; offset < 7; offset++) {
        const dayIdx = (DAYS.indexOf(today) + offset) % 7;
        const checkDay = DAYS[dayIdx];
        const dayClasses = schedule.filter(s => s.day === checkDay).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        for (const c of dayClasses) {
          if (offset === 0 && timeToMinutes(c.startTime) <= nowMin) continue;
          nextClass = c;
          nextDay = checkDay;
          dayOffset = offset;
          break;
        }
        if (nextClass) break;
      }

      if (!nextClass) {
        return m.reply(raraWrap("Jadwal", "Tidak ada kelas terjadwal untuk minggu ini!"));
      }

      let txt = `Kelas Terdekat\n\n`;
      if (dayOffset === 0) txt += `Hari ini`;
      else if (dayOffset === 1) txt += `Besok`;
      else txt += `${dayOffset} hari lagi (${formatDay(nextDay)})`;
      txt += `\n\n`;
      txt += `${nextClass.startTime}-${nextClass.endTime}\n`;
      txt += `${nextClass.subject}\n`;
      if (nextClass.room) txt += `Ruang: ${nextClass.room}\n`;

      if (dayOffset === 0) {
        const minsUntil = timeToMinutes(nextClass.startTime) - nowMin;
        const hoursUntil = Math.floor(minsUntil / 60);
        const minsRem = minsUntil % 60;
        txt += `Dimulai dalam: ${hoursUntil > 0 ? hoursUntil + " jam " : ""}${minsRem} menit`;
      }
      await m.reply(txt);
    }

    // === BY DAY ===
    else if (cmd === "hari") {
      const day = cmdArgs[0]?.toLowerCase();
      if (!day || !DAYS.includes(day)) {
        return m.reply(raraError("Jadwal", `Hari gak valid nih! Pilih: ${DAYS.join(", ")}`));
      }

      const schedule = getSchedule(db, sender);
      const dayClasses = schedule.filter(s => s.day === day).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      if (dayClasses.length === 0) {
        return m.reply(raraWrap("Jadwal", `${formatDay(day)} tidak ada kelas.`));
      }

      let txt = `Jadwal ${formatDay(day)}\n\n`;
      for (const c of dayClasses) {
        txt += `${c.startTime}-${c.endTime} | ${c.subject}`;
        if (c.room) txt += ` | ${c.room}`;
        txt += ` [${c.id}]\n`;
      }
      await m.reply(txt);
    }

    // === DELETE ===
    else if (cmd === "del" || cmd === "hapus") {
      const id = cmdArgs[0]?.toUpperCase();

      const schedule = getSchedule(db, sender);
      const idx = schedule.findIndex(s => s.id === id);

      const removed = schedule.splice(idx, 1)[0];
      await m.reply(raraWrap("Jadwal", `Jadwal dihapus!\n\n${removed.subject} - ${formatDay(removed.day)} ${removed.startTime}`));
    }

    // === CLEAR ===
    else if (cmd === "clear" || cmd === "reset") {
      getStore(db)[sender] = [];
      saveStore(db);
      await m.reply(raraWrap("Jadwal", "Semua jadwal dihapus!"));
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}jadwal help\` untuk bantuan.`);
    }
  } catch (e) {
    console.error("[JADWAL] Error:", e.message);
    await m.reply(raraWrap("jadwal", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
