// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import * as timeHelper from "../../src/lib/nova-time.js";

const pluginConfig = {
  name: "sewainfo",
  alias: ["sewainfo", "infosewa", "carasewa"],
  category: "group",
  description: "Info cara sewa bot",
  usage: ".sewainfo",
  example: ".sewainfo",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

function formatCountdown(expiredAt) {
  const diff = expiredAt - Date.now();
  if (diff <= 0) return "EXPIRED";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return days + " hari " + hours + " jam";
  if (hours > 0) return hours + " jam " + minutes + " menit";
  return minutes + " menit";
}

function handler(m, { sock }) {
  const db = getDatabase();
  if (!db.db.data.sewa) {
    db.db.data.sewa = { enabled: false, groups: {} };
    db.db.write();
  }

  const sewaData = db.db.data.sewa.groups[m.chat];

  if (sewaData) {
    const groupName = sewaData.name || m.chat.split("@")[0];

    if (sewaData.isLifetime) {
      return m.reply( claraWrap("Sewa Bot", ["Grup: *" + groupName + "*", "Status: *ᴘᴇʀᴍᴀɴᴇɴᴛ* ♾️", "Bot aktif selamanya di grup ini.", "", "Untuk sewa bot di grup lain, hubungi owner."].join("\n")), "sewainfo");
    }

    const countdown = formatCountdown(sewaData.expiredAt);
    const expiredStr = timeHelper.fromTimestamp(sewaData.expiredAt, "D MMMM YYYY HH:mm");

    return m.reply( claraWrap("Sewa Bot", ["Grup: *" + groupName + "*", "Sisa waktu: *" + countdown + "*", "Berakhir: *" + expiredStr + "*", "", "Untuk perpanjang sewa, hubungi owner bot."].join("\n")), "sewainfo");
  }

  // Grup tidak terdaftar - tampilkan info cara sewa
  return m.reply( "📝 *ᴄᴀʀᴀ ꜱᴇᴡᴀ ʙᴏᴛ*\n\n" +
    "Mau pakai bot ini di grup kamu?\n\n" +
    "*ᴄᴀʀᴀ ꜱᴇᴡᴀ:*\n" +
    "1. Hubungi owner bot\n" +
    "2. Kirim link invite grup kamu\n" +
    "3. Pilih durasi sewa\n" +
    "4. Bot auto-join ke grup\n\n" +
    "*ꜰᴏʀᴍᴀᴛ ᴅᴜʀᴀꜱɪ:*\n" +
    "30i = 30 menit\n" +
    "12h = 12 jam\n" +
    "7d = 7 hari\n" +
    "1m = 1 bulan\n" +
    "1y = 1 tahun\n" +
    "lifetime = permanen\n\n" +
    "Hubungi owner untuk info lebih lanjut.", "sewainfo");
}

export { pluginConfig as config, handler };
