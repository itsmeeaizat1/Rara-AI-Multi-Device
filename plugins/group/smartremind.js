// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "smartremind",
  aliases: ["smartremind", "sremind", "airemind"],
  category: "group",
  description: "AI auto-deteksi jadwal/acara dari pesan + set reminder otomatis",
  usage: ".smartremind <pesan alami> | .smartremind list | .smartremind del <id> | .smartremind auto on|off",
  isGroupOnly: true,
};

const TIME_PATTERNS = [
  { regex: /(?:besok|tomorrow)\s+(?:jam|pukul|at)?\s*(\d{1,2})(?::(\d{2}))?/i, offset: "tomorrow" },
  { regex: /(?:hari ini|today)\s+(?:jam|pukul|at)?\s*(\d{1,2})(?::(\d{2}))?/i, offset: "today" },
  { regex: /(?:jam|pukul|at)\s*(\d{1,2})(?::(\d{2}))?/i, offset: "today" },
  { regex: /(?:lusa|day after tomorrow)/i, offset: "lusa" },
  { regex: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(?:jam|pukul)?\s*(\d{1,2})(?::(\d{2}))?/i, offset: "date" },
  { regex: /(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:jam|pukul|at)?\s*(\d{1,2})(?::(\d{2}))?/i, offset: "weekday" },
];

function parseNaturalTime(text) {
  const now = new Date();
  for (const pat of TIME_PATTERNS) {
    const match = text.match(pat.regex);
    if (!match) continue;
    const hour = parseInt(match[1] || match[4] || 0);
    const minute = parseInt(match[2] || match[5] || 0);
    let target = new Date(now);

    if (pat.offset === "tomorrow") {
      target.setDate(target.getDate() + 1);
    } else if (pat.offset === "lusa") {
      target.setDate(target.getDate() + 2);
    } else if (pat.offset === "date") {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const year = match[3] ? parseInt(match[3]) + (match[3].length <= 2 ? 2000 : 0) : target.getFullYear();
      target = new Date(year, month, day, hour, minute);
    } else if (pat.offset === "weekday") {
      const days = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
      const dayMatch = text.toLowerCase().match(/senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday/);
      if (dayMatch) {
        const targetDay = days[dayMatch[0]];
        let diff = (targetDay - now.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        target.setDate(target.getDate() + diff);
      }
    }
    target.setHours(hour, minute, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }
  return null;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.smartRemind) db.data.smartRemind = {};
    if (!db.data.smartRemind[groupId]) {
      db.data.smartRemind[groupId] = { reminders: [], autoDetect: false, pendingId: 1 };
      await db.save();
    }

    const data = db.data.smartRemind[groupId];

    if (sub === "auto") {
      const toggle = (args[1] || "").toLowerCase();
      if (!["on", "off"].includes(toggle)) return m.reply(`Cara: ${usedPrefix}smartremind auto on|off`);
      data.autoDetect = toggle === "on";
      await db.save();
      return m.reply(claraWrap("Smart Remind", `Auto-detect ${toggle === "on" ? "diaktifkan" : "dimatikan"}. Bot akan scan pesan untuk jadwal otomatis.`));
    }

    if (sub === "list") {
      const active = data.reminders.filter(r => !r.done);
      if (active.length === 0) return m.reply(claraWrap("Smart Remind", "Belum ada reminder aktif."));
      const list = active.map(r => `${r.id}. ${r.text} - ${new Date(r.time).toLocaleString("id-ID")}`).join("\n");
      return m.reply(claraWrap("Smart Remind", `Reminder Aktif:\n\n${list}`));
    }

    if (sub === "del" || sub === "remove") {
      const id = parseInt(args[1]);
      if (!id) return m.reply(`Cara: ${usedPrefix}smartremind del <id>`);
      const idx = data.reminders.findIndex(r => r.id === id);
      if (idx === -1) return m.reply(`Reminder ID ${id} tidak ditemukan.`);
      data.reminders.splice(idx, 1);
      await db.save();
      return m.reply(claraWrap("Smart Remind", `Reminder ID ${id} dihapus.`));
    }

    if (!text) {
      return m.reply(claraWrap("Smart Remind", [
        `Smart Remind - AI-powered reminder dari pesan alami`,
        "",
        `Contoh:`,
        `${usedPrefix}smartremind besok jam 3 meeting klien`,
        `${usedPrefix}smartremind jumat pukul 19.00 ngumpul`,
        `${usedPrefix}smartremind 25/12 jam 20:00 nonton bareng`,
        "",
        `Command:`,
        `${usedPrefix}smartremind <pesan alami>`,
        `${usedPrefix}smartremind list`,
        `${usedPrefix}smartremind del <id>`,
        `${usedPrefix}smartremind auto on|off`,
      ].join("\n")));
    }

    const targetTime = parseNaturalTime(text);
    if (!targetTime) {
      return m.reply(claraWrap("Smart Remind", [
        `Tidak bisa mendeteksi waktu dari pesan.`,
        `Coba format: jam, besok jam, hari jam, tanggal/bulan jam`,
        `Contoh: ${usedPrefix}smartremind besok jam 14:00 gathering`,
      ].join("\n")));
    }

    const remindText = text.replace(/(?:besok|tomorrow|hari ini|today|lusa|jam|pukul|at|\d{1,2}[:.]?\d{0,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, "").trim() || "Reminder";

    const id = data.pendingId++;
    data.reminders.push({
      id,
      text: remindText,
      time: targetTime.getTime(),
      setBy: sender,
      done: false,
    });
    await db.save();

    const timeStr = targetTime.toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

    return m.reply(claraWrap("Smart Remind", [
      `Reminder berhasil diset!`,
      `Pesan: ${remindText}`,
      `Waktu: ${timeStr}`,
      `ID: ${id}`,
      "",
      `Bot akan ingatkan grup saat waktunya tiba.`,
    ].join("\n")));
  } catch (e) {
    console.error("smartremind error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
