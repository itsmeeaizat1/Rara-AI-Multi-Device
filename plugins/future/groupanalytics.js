// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "groupanalytics", alias: ["groupanalytics"], category: "future",
  alias: ["groupanalytics"],
  description: "Analisis statistik grup", usage: ".groupanalytics",
  example: ".groupanalytics", isOwner: true, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 30, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase();
    const gid = m.key?.remoteJid || "";
    if (!db.msgStats) db.msgStats = {};
    const stats = db.msgStats[gid] || { total: 0, users: {}, hourly: {}, daily: {} };
    
    const topUsers = Object.entries(stats.users || {}).sort((a,b) => b[1]-a[1]).slice(0, 5);
    const topHours = Object.entries(stats.hourly || {}).sort((a,b) => b[1]-a[1]).slice(0, 3);
    
    let text = claraWrap("Group Analytics", "📊") + "\n\n";
    text += claraWrap("sTats", [`│ ❏ Total pesan: *${stats.total || 0}*`, `│ ❏ Member aktif: *${Object.keys(stats.users || {}).length}*`].join("\n")) + "\n\n";
    if (topUsers.length) {
      text += "*ᴛᴏᴘ ᴍᴇᴍʙᴇʀꜱ:*\n";
      topUsers.forEach(([u, c], i) => { text += `${i+1}. @${u.split("@")[0]} - ${c} pesan\n`; });
    }
    if (topHours.length) {
      text += "\n*ᴊᴀᴍ ᴛᴇʀꜱɪʙᴜᴋ:*\n";
      topHours.forEach(([h, c]) => { text += `│ ❏ ${h}:00 - ${c} pesan\n`; });
    }
    text += "\n" + separator("━", 22) + "\n" + tipText("Stats direset setiap hari");
    await m.reply(text);
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };