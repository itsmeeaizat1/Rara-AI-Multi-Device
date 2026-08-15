import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "couplelb",
  alias: ["coupleleaderboard", "pasanganterkuat", "coupleranking"],
  category: "rpg",
  description: "Leaderboard pasangan terkuat berdasarkan affection & bond level",
  usage: ".couplelb",
  example: ".couplelb",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 hari";
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return days + " hari";
  const hours = Math.floor((ms % 86400000) / 3600000);
  return hours + " jam";
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const now = Date.now();

    // Ambil semua user yang punya pasangan
    const users = Object.values(db.db?.data?.users || {});
    const couples = [];
    const seen = new Set();

    for (const u of users) {
      const rpg = u.rpg || {};
      const partner = rpg.spouse || rpg.dating;
      if (!partner || seen.has(u.jid)) continue;

      const partnerUser = db.getUser(partner);
      if (!partnerUser) continue;

      const partnerRpg = partnerUser.rpg || {};
      const affection = Math.min(
        rpg.affection || 0,
        partnerRpg.affection || 0
      );
      const bondLevel = Math.floor(affection / 100) + 1;

      const startDate = rpg.marriedAt || rpg.datingAt || 0;
      const duration = startDate ? now - startDate : 0;
      const isMarried = !!rpg.spouse;
      const statusEmoji = isMarried ? "💍" : "💕";

      couples.push({
        user1: u.name || u.jid,
        user2: partnerUser.name || partner,
        jid1: u.jid,
        jid2: partner,
        affection,
        bondLevel,
        duration,
        isMarried,
        statusEmoji,
      });

      seen.add(u.jid);
      seen.add(partner);
    }

    if (couples.length === 0) {
      const text =
        claraWrap("Couple Leaderboard", [`◦ Status: *Belum ada pasangan terdaftar*`,
          `◦ Jadilah yang pertama!`].join("\n")) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk mulai`);

      await sendReplyWithNav(sock, m, text, "couplelb");
      return { handled: true };
    }

    // Sort by affection desc, then by duration
    couples.sort((a, b) => b.affection - a.affection || b.duration - a.duration);

    const top = couples.slice(0, 10);
    const medals = ["🥇", "🥈", "🥉"];

    const lines = top.map((c, i) => {
      const rank = i < 3 ? medals[i] : `${i + 1}.`;
      const days = Math.floor(c.duration / 86400000);
      return `◦ ${rank} ${c.user1} & ${c.user2} ${c.statusEmoji}\n   Affection: *${c.affection}* | Bond: *${c.bondLevel}* | ${days}h`;
    });

    const text =
      claraWrap("Couple Leaderboard", "🏆") + "\n\n" +
      claraWrap("pasangan terkuat", lines) + "\n\n" +
      separator("━", 22) + "\n" +
      tipText(`Tingkatkan: ${prefix}cuddling, ${prefix}kiss, ${prefix}kado, ${prefix}sayang`);

    await sendReplyWithNav(sock, m, text, "couplelb");
    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("couplelb", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
