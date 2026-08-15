import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

// VN files for sad moments (put files in assets/vn/)
const VN_DIR = path.join(process.cwd(), "assets", "audio");
const VN_PUTUS = "vn_putus_sedih.mp3"; // VN saat putus

const pluginConfig = {
  name: "putusmatch",
  alias: ["putusmatch"],
  category: "game",
  description: "Putus sama pacar (jadian)",
  usage: ".putusmatch",
  example: ".putusmatch",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const PUTUS_QUOTES = [
  "Kalau memang bukan untuk selamanya, biarkan berakhir di sini.",
  "Gue lepas lu bukan karena gue nggak sayang, tapi karena gue sayang diri gue juga.",
  "Nggak semua cerita harus berakhir bahagia, tapi semua bisa jadi pelajaran.",
  "Mending berpisah sekarang daripada dipaksa dan ujungnya saling nyakitin.",
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    if (!user.rpg) user.rpg = {};

    if (!user.rpg.dating) {
      const text =
        claraWrap("Belum Jadian", ["◦ Kamu belum jadian sama siapapun!",
          "◦ Ketik *" + prefix + "jadian @member* untuk mulai"].join("\n")) + "\n" +
        tipText("Belum pacaran, mau putus sama siapa? 😂");

      await sendReplyWithNav(sock, m, text, "putusmatch");
      return { handled: true };
    }

    const partnerJid = user.rpg.dating;
    const partnerUser = db.getUser(partnerJid);
    const partnerName = partnerUser?.name || partnerJid.split("@")[0];
    const myName = user.name || m.pushName || m.sender.split("@")[0];

    // Clear dating from both
    user.rpg.dating = null;
    user.rpg.datingAt = null;
    user.rpg.partner = null;

    if (partnerUser && partnerUser.rpg) {
      partnerUser.rpg.dating = null;
      partnerUser.rpg.datingAt = null;
      partnerUser.rpg.partner = null;
    }

    db.save();

    const quote = PUTUS_QUOTES[Math.floor(Math.random() * PUTUS_QUOTES.length)];
    const time = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    let text = "";
    text += "💔💔💔\n";
    text += "💔 *PUTUS PACARAN* 💔\n";
    text += "💔💔💔\n\n";
    text += "“" + quote + "”\n\n";
    text += separator("─", 28) + "\n";
    text += "👤 " + myName + " 💔 " + partnerName + "\n";
    text += "📅 " + time + "\n";
    text += "🚫 Status: *Putus*\n";
    text += separator("─", 28) + "\n\n";
    text += "@" + m.sender.split("@")[0] + " putus dengan @" + partnerJid.split("@")[0] + "\n\n";
    text += tipText("Semoga kamu nemu yang lebih baik");

    await sock.sendMessage(m.chat, { text: text, mentions: [m.sender, partnerJid] });

    // Kirim VN musik sedih (jika file ada)
    try {
      const vnPath = path.join(VN_DIR, VN_PUTUS);
      if (fs.existsSync(vnPath)) {
        const vnBuffer = fs.readFileSync(vnPath);
        await sock.sendMessage(m.chat, {
          audio: vnBuffer,
          mimetype: "audio/mpeg",
          ptt: true,
        });
      }
    } catch (e) {
      console.log("[putus.js] VN error:", e.message);
    }

    return { handled: true };
  } catch (error) {
    await m.reply("Error: " + error.message);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
