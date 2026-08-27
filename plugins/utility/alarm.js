// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "alarm", alias: ["alarm"], category: "utility",
  alias: ["alarm"],
  description: "Alarm pengingat pribadi", usage: ".alarm <HH:MM> <pesan>",
  example: ".alarm 07:30 bangun sekolah", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = (m.text || "").trim();
    if (!input) {
      await m.reply(claraWrap("Alarm", [`│ Penggunaan: *${prefix}alarm <HH:MM> <pesan>*`,
        `│ Contoh: *${prefix}alarm 07:30 bangun sekolah*`,
        `│ Hapus: *${prefix}alarm list* / *${prefix}alarm del <nomor>*`].join("\n")));
      return { handled: true };
    }
    const args = input.split(/\s+/);
    if (args[0] === "list") {
      if (!global.alarms) global.alarms = {};
      const myAlarms = global.alarms[m.sender] || [];
      if (!myAlarms.length) {
        await m.reply(claraWrap("Alarm", ["│ Tidak ada alarm aktif"].join("\n")));
        return { handled: true };
      }
      let text = claraHeader("Alarm Aktif", "⏰") + "\n\n";
      myAlarms.forEach((a, i) => { text += `${i+1}. *${a.time}* - ${a.message}\n`; });
      text += "\n" + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }
    if (args[0] === "del") {
      const idx = parseInt(args[1]) - 1;
      if (!global.alarms) global.alarms = {};
      if (!global.alarms[m.sender]) global.alarms[m.sender] = [];
      global.alarms[m.sender].splice(idx, 1);
      await m.reply(claraWrap("Alarm", [`│ Alarm #${idx+1} dihapus`].join("\n")));
      return { handled: true };
    }
    const time = args[0];
    const message = args.slice(1).join(" ") || "Alarm!";
    if (!/^\d{1,2}:\d{2}$/.test(time)) throw new Error("Format waktu: HH:MM");
    const [h, min] = time.split(":").map(Number);
    if (!global.alarms) global.alarms = {};
    if (!global.alarms[m.sender]) global.alarms[m.sender] = [];
    global.alarms[m.sender].push({ time, message, active: true });
    await m.reply(claraWrap("Alarm", [`│ Waktu: *${time}*`, `│ Pesan: *${message}*`,
      `│ Total alarm: *${global.alarms[m.sender].length}*`].join("\n")) + "\n" + tipText("Alarm berjalan selama bot online"));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`│ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };