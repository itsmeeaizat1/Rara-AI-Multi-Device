import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { alyaHeader,
  separator,
  tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "dashboardcouple",
  alias: ["dbcouple", "dbjadian", "dashboardjadian", "coupleboard", "jadianboard"],
  category: "rpg",
  description: "Dashboard couple RPG — leaderboard pasangan paling lama",
  usage: ".dbcouple",
  example: ".dbcouple",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 hari";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return days + " hari " + hours + " jam";
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 1) return hours + " jam " + mins + " menit";
  return mins + " menit";
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const now = Date.now();

    // Collect all married users from the database
    const allUsers = db.data?.users || {};
    const couples = [];
    const seen = new Set();

    for (const [jid, userData] of Object.entries(allUsers)) {
      const rpg = userData?.rpg || {};
      if (!rpg.spouse || seen.has(jid)) continue;

      const partnerJid = rpg.spouse;
      if (seen.has(partnerJid)) continue;

      const marriedAt = rpg.marriedAt || 0;
      const duration = now - marriedAt;

      const name1 = userData?.name || jid.split("@")[0];
      const partnerData = allUsers[partnerJid];
      const name2 = partnerData?.name || partnerJid.split("@")[0];

      couples.push({
        jid1: jid,
        jid2: partnerJid,
        name1: name1,
        name2: name2,
        marriedAt: marriedAt,
        duration: duration,
        dateStr: marriedAt ? new Date(marriedAt).toLocaleDateString("id-ID") : "Unknown",
      });

      seen.add(jid);
      seen.add(partnerJid);
    }

    // Sort by duration (longest first)
    couples.sort((a, b) => b.duration - a.duration);

    const totalCouples = couples.length;
    const myCouple = couples.find(
      (c) => c.jid1 === m.sender || c.jid2 === m.sender
    );

    // Build header
    let text = claraWrap("Dashboard Couple", "💑") + "\n\n";

    // Stats
    text += claraWrap("ʀᴀʅᴀʀʜ", ["◦ Total pasangan: *" + totalCouples + "*", "◦ Bonus married: *+5% EXP*", "◦ Biaya cerai: *25.000 koin*"].join("\n")) + "\n\n";

    // My couple status
    if (myCouple) {
      const myRank = couples.indexOf(myCouple) + 1;
      text += separator("━", 30) + "\n";
      text += "PASANGAN KAMU\n";
      text += separator("━", 30) + "\n\n";
      text += "◦ Pasangan: *" + (myCouple.jid1 === m.sender ? myCouple.name2 : myCouple.name1) + "*\n";
      text += "◦ Durasi: *" + formatDuration(myCouple.duration) + "*\n";
      text += "◦ Tanggal nikah: *" + myCouple.dateStr + "*\n";
      text += "◦ Ranking: *#" + myRank + " dari " + totalCouples + "*\n\n";
    } else {
      text += separator("━", 30) + "\n";
      text += "PASANGAN KAMU\n";
      text += separator("━", 30) + "\n\n";
      text += "◦ Kamu belum punya pasangan\n";
      text += "◦ Ketik *" + prefix + "marry @member* untuk nikah\n\n";
    }

    // Leaderboard
    text += separator("━", 30) + "\n";
    text += "LEADERBOARD PASANGAN TERLAMA\n";
    text += separator("━", 30) + "\n\n";

    if (couples.length === 0) {
      text += "Belum ada pasangan yang menikah.\n\n";
    } else {
      const top = couples.slice(0, 10);
      let num = 1;
      for (const c of top) {
        const medal = num === 1 ? "🥇" : num === 2 ? "🥈" : num === 3 ? "🥉" : "";
        text += (medal ? medal + " " : num + ". ") + c.name1 + " ❤️ " + c.name2 + "\n";
        text += "   " + formatDuration(c.duration) + " | " + c.dateStr + "\n";
        num++;
      }

      if (couples.length > 10) {
        text += "\n+" + (couples.length - 10) + " pasangan lainnya...\n";
      }
    }

    // Commands
    text += "\n" + separator("━", 30) + "\n";
    text += "COMMAND TERKAIT:\n";
    text += prefix + "marry @member — Lamar seseorang\n";
    text += prefix + "terima — Terima lamaran\n"
    text += prefix + "tolak — Tolak lamaran\n"
    text += prefix + "couple — Lihat status pasangan\n";
    text += prefix + "divorce — Cerai (25.000 koin)\n";
    text += prefix + "soulmatch @member — Cek compatibility\n";
    text += prefix + "dbcouple — Dashboard ini\n\n";
    text += tipText("Ketik " + prefix + "marry @member untuk mulai");

    await sendReplyWithNav(sock, m, text, "dashboardcouple");
  } catch (error) {
    await m.reply("Error: " + error.message);
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
