// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "automute",
  aliases: ["automute", "autoclose"],
  category: "group",
  description: "Auto mute/unmute grup berdasarkan jadwal",
  usage: ".automute set <mulai> <selesai> (contoh: .automute set 23:00 06:00) | .automute on | .automute off | .automute status | .automute list",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;

    if (!db.data.autoMute) db.data.autoMute = {};
    if (!db.data.autoMute[groupId]) {
      db.data.autoMute[groupId] = { schedules: [], enabled: false };
      await db.save();
    }

    const data = db.data.autoMute[groupId];
    const sub = (args[0] || "").toLowerCase();

    if (sub === "set") {
      const startTime = args[1];
      const endTime = args[2];
      if (!startTime || !endTime) {
        return m.reply(claraWrap("Auto Mute", [
          `Cara: ${usedPrefix}automute set <mulai> <selesai>`,
          `Contoh: ${usedPrefix}automute set 23:00 06:00`,
          `Format jam: HH:MM (24 jam)`,
        ].join("\n")));
      }
      const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return m.reply(claraWrap("Auto Mute", "Format jam salah! Gunakan HH:MM (contoh: 23:00, 06:00)"));
      }
      const existing = data.schedules.findIndex(s => s.start === startTime && s.end === endTime);
      if (existing >= 0) {
        data.schedules[existing].start = startTime;
        data.schedules[existing].end = endTime;
      } else {
        data.schedules.push({ start: startTime, end: endTime });
      }
      await db.save();
      return m.reply(claraWrap("Auto Mute", [
        `Jadwal auto-mute disimpan!`,
        `Mute: ${startTime}`,
        `Unmute: ${endTime}`,
        "",
        `Aktifkan dengan: ${usedPrefix}automute on`,
      ].join("\n")));
    }

    if (sub === "on") {
      if (data.schedules.length === 0) {
        return m.reply(claraWrap("Auto Mute", `Belum ada jadwal. Set dulu dengan ${usedPrefix}automute set <mulai> <selesai>`));
      }
      data.enabled = true;
      await db.save();
      return m.reply(claraWrap("Auto Mute", `Auto-mute diaktifkan! ${data.schedules.length} jadwal aktif.`));
    }

    if (sub === "off") {
      data.enabled = false;
      await db.save();
      return m.reply(claraWrap("Auto Mute", "Auto-mute dimatikan."));
    }

    if (sub === "status") {
      const status = data.enabled ? "AKTIF" : "MATI";
      const scheduleList = data.schedules.length > 0
        ? data.schedules.map((s, i) => `${i + 1}. Mute ${s.start} - Unmute ${s.end}`).join("\n")
        : "Belum ada jadwal.";
      return m.reply(claraWrap("Auto Mute", [
        `Status: ${status}`,
        `Jadwal:`,
        scheduleList,
      ].join("\n")));
    }

    if (sub === "del" || sub === "remove") {
      const idx = parseInt(args[1]) - 1;
      if (isNaN(idx) || idx < 0 || idx >= data.schedules.length) {
        return m.reply(`Cara: ${usedPrefix}automute del <nomor>`);
      }
      data.schedules.splice(idx, 1);
      await db.save();
      return m.reply(claraWrap("Auto Mute", `Jadwal ${idx + 1} dihapus.`));
    }

    return m.reply(claraWrap("Auto Mute", [
      `Auto Mute - Auto mute/unmute grup by schedule`,
      "",
      `Command:`,
      `1. ${usedPrefix}automute set <mulai> <selesai>`,
      `2. ${usedPrefix}automute on`,
      `3. ${usedPrefix}automute off`,
      `4. ${usedPrefix}automute status`,
      `5. ${usedPrefix}automute del <nomor>`,
      "",
      `Contoh: ${usedPrefix}automute set 23:00 06:00`,
    ].join("\n")));
  } catch (e) {
    console.error("automute error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
