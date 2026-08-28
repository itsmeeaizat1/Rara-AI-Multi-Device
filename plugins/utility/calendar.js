// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "calendar", alias: ["calendar"], category: "utility",
  alias: ["calendar"],
  description: "Kalender event grup", usage: ".calendar <add/list/del>",
  example: ".calendar add 25-12-2026 Natal", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const gid = m.key?.remoteJid || "";
    if (!db.calendar) db.calendar = {};
    if (!db.calendar[gid]) db.calendar[gid] = [];

    if (action === "add") {
      const date = args[1]; const name = args.slice(2).join(" ");
      if (!date || !name) throw new Error("Format: .calendar add DD-MM-YYYY nama_event");
      db.calendar[gid].push({ date, name, created: Date.now() });
      db.write();
      await m.reply(claraWrap("Kalender", [`│ Tanggal: *${date}*`, `│ Event: *${name}*`].join("\n")));
    } else if (action === "del") {
      const idx = parseInt(args[1]) - 1;
      db.calendar[gid].splice(idx, 1); db.write();
      await m.reply(claraWrap("Kalender", [`│ Event #${idx+1} dihapus`].join("\n")));
    } else {
      if (!db.calendar[gid].length) {
        await m.reply(claraWrap("Kalender", ["│ Belum ada event", `│ Ketik: *${prefix}calendar add <tgl> <nama>*`].join("\n")));
        return { handled: true };
      }
      db.calendar[gid].sort((a,b) => {
        const [da,ma,ya] = a.date.split("-").map(Number);
        const [db2,mb,yb] = b.date.split("-").map(Number);
        return new Date(ya,ma-1,da) - new Date(yb,mb-1,db2);
      });
      let text = claraHeader("Kalender Event", "📅") + "\n\n";
      db.calendar[gid].forEach((e, i) => { text += `${i+1}. 📅 *${e.date}* - ${e.name}\n`; });
      text += "\n" + separator("━", 22) + "\n" + tipText(`${prefix}calendar del <nomor> untuk hapus`);
      await m.reply(text);
    }
  } catch (e) {
    await m.reply(claraWrap("Gagal nih", [`│ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };