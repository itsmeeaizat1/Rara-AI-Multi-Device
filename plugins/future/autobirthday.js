// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autobirthday", alias: ["autobirthday"], category: "future",
  alias: ["autobirthday"],
  description: "Catat & reminder ulang tahun", usage: ".autobirthday <add/list>",
  example: ".autobirthday add Budi 17-08", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    if (!db.birthdays) db.birthdays = [];
    
    if (action === "add") {
      const name = args[1]; const date = args[2];
      if (!name || !date) throw new Error("Format: .autobirthday add <nama> <DD-MM>");
      db.birthdays.push({ name, date, by: m.sender, created: Date.now() });
      db.write();
      await m.reply(claraWrap("Auto Birthday", [`Nama: *${name}*`, `Tanggal: *${date}*`,
        "Bot akan ucapkan selamat ultah otomatis"].join("\n")));
    } else if (action === "list") {
      if (!db.birthdays.length) {
        await m.reply(claraWrap("Auto Birthday", ["Belum ada ulang tahun tercatat", `Ketik: *${prefix}autobirthday add <nama> <DD-MM>*`].join("\n")));
        return { handled: true };
      }
      let text = claraWrap("Birthday List", "🎂") + "\n\n";
      db.birthdays.forEach((b, i) => { text += `${i+1}. 🎂 ${b.name} - ${b.date}\n`; });
      text += "\n";
      await m.reply(text);
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };