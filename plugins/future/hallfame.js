// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hallfame",
  alias: ["hallfame", "hallofame", "penghargaan"],
  category: "future",
  description: "Hall of Fame grup - auto-track member terbaik setiap bulan",
  usage: ".hallfame <command>",
  example: ".hallfame",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const AWARD_CATEGORIES = [
  { id: "mostactive", title: "Most Active Member", desc: "Paling sering ngobrol di grup", emoji: "🔥" },
  { id: "mostsilent", title: "Silent Observer", desc: "Paling sering baca tapi jarang chat", emoji: "🤫" },
  { id: "comedian", title: "Group Comedian", desc: "Paling banyak bikin orang react", emoji: "😂" },
  { id: "helper", title: "Helpful Hero", desc: "Paling sering bantu jawab pertanyaan", emoji: "🦸" },
  { id: "nightowl", title: "Night Owl", desc: "Paling aktif tengah malam", emoji: "🦉" },
  { id: "earlybird", title: "Early Bird", desc: "Paling aktif pagi", emoji: "🐦" },
  { id: "gamer", title: "Group Gamer", desc: "Paling sering main game bot", emoji: "🎮" },
  { id: "sticker", title: "Sticker Lord", desc: "Paling banyak kirim sticker", emoji: "🎨" },
  { id: "commander", title: "Command King", desc: "Paling banyak pakai command bot", emoji: "👑" },
  { id: "rising", title: "Rising Star", desc: "Member baru paling aktif", emoji: "⭐" },
];

function getMonthKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function getMonthName() {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const d = new Date();
  return months[d.getMonth()] + " " + d.getFullYear();
}

function getConfig(db, gid) {
  const all = db.setting("hallfame") || {};
  if (!all[gid]) {
    all[gid] = { current: {}, history: {} };
    db.setting("hallfame", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("hallfame") || {};
  all[gid] = data;
  db.setting("hallfame", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const monthKey = getMonthKey();

  if (sub === "track" || sub === "update") {
    // This is called to track/update member stats
    // Track from group metadata
    let groupMeta;
    try {
      groupMeta = await sock.groupMetadata(gid);
    } catch {
      await m.reply(claraWrap("Hall of Fame", "Gagal mengambil data grup."));
      return { handled: true };
    }

    const participants = groupMeta.participants || [];
    const user = db.getUser(m.sender);

    // Initialize current month tracking
    if (!cfg.current[monthKey]) {
      cfg.current[monthKey] = { members: {}, lastUpdate: Date.now() };
    }
    const monthData = cfg.current[monthKey];

    for (const p of participants) {
      const jid = p.id;
      if (!monthData.members[jid]) {
        monthData.members[jid] = {
          messages: 0, commands: 0, reactions: 0, stickers: 0,
          games: 0, helps: 0, nightMsgs: 0, morningMsgs: 0,
          joinDate: Date.now(), lastActive: 0,
        };
      }
    }

    // Update self stats from user data
    const myStats = monthData.members[m.sender];
    if (myStats) {
      myStats.commands = user?.totalCommands || myStats.commands;
      myStats.lastActive = Date.now();
    }

    saveConfig(db, gid, cfg);

    const trackedCount = Object.keys(monthData.members).length;
    await m.reply(claraWrap("Hall of Fame", [
      "Tracking diupdate!",
      "Bulan: " + getMonthName(),
      "Members tracked: " + trackedCount,
      "",
      "Data auto-update saat member pakai bot.",
      prefix + "hallfame awards - lihat penghargaan",
      prefix + "hallfame leaderboard - ranking member",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "awards" || sub === "penghargaan" || !sub) {
    if (!cfg.current[monthKey] || !cfg.current[monthKey].members) {
      await m.reply(claraWrap("Hall of Fame", "Belum ada data bulan ini. Ketik " + prefix + "hallfame track untuk mulai tracking."));
      return { handled: true };
    }
    const members = cfg.current[monthKey].members;
    const memberList = Object.entries(members).filter(([_, s]) => s.messages > 0 || s.commands > 0);

    if (memberList.length === 0) {
      await m.reply(claraWrap("Hall of Fame", "Belum ada aktivitas tercatat bulan ini. Gunakan bot lebih aktif!"));
      return { handled: true };
    }

    // Calculate awards
    const awards = [];
    for (const cat of AWARD_CATEGORIES) {
      let winner = null;
      let maxVal = -1;
      for (const [jid, stats] of memberList) {
        let val = 0;
        switch (cat.id) {
          case "mostactive": val = stats.messages + stats.commands; break;
          case "mostsilent": val = 1 / (stats.messages + 1); break;
          case "comedian": val = stats.reactions; break;
          case "helper": val = stats.helps; break;
          case "nightowl": val = stats.nightMsgs; break;
          case "earlybird": val = stats.morningMsgs; break;
          case "gamer": val = stats.games; break;
          case "sticker": val = stats.stickers; break;
          case "commander": val = stats.commands; break;
          case "rising": val = stats.messages * (Date.now() - stats.joinDate < 7 * 86400000 ? 2 : 1); break;
        }
        if (val > maxVal) { maxVal = val; winner = jid; }
      }
      if (winner && maxVal > 0) {
        awards.push({ cat, winner, value: maxVal });
      }
    }

    if (awards.length === 0) {
      await m.reply(claraWrap("Hall of Fame", "Belum cukup data untuk penghargaan. Gunakan bot lebih aktif!"));
      return { handled: true };
    }

    const list = awards.map(a => a.cat.emoji + " " + a.cat.title + "\n   @" + a.winner.split("@")[0]).join("\n\n");
    await m.reply(claraWrap("Hall of Fame - " + getMonthName(), [
      "PENGHARGAAN BULAN INI",
      "",
      list,
      "",
      "Auto-update setiap aktivitas. Ranking berubah tiap hari!",
    ].join("\n")), { mentions: awards.map(a => a.winner) });
    return { handled: true };
  }

  if (sub === "leaderboard" || sub === "ranking" || sub === "top") {
    if (!cfg.current[monthKey] || !cfg.current[monthKey].members) {
      await m.reply(claraWrap("Hall of Fame", "Belum ada data. Ketik " + prefix + "hallfame track."));
      return { handled: true };
    }
    const members = Object.entries(cfg.current[monthKey].members)
      .filter(([_, s]) => s.messages > 0 || s.commands > 0)
      .map(([jid, s]) => ({ jid, score: s.messages + s.commands * 2 + s.reactions + s.stickers + s.games * 3 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (members.length === 0) {
      await m.reply(claraWrap("Hall of Fame", "Belum ada aktivitas tercatat."));
      return { handled: true };
    }

    const medals = ["🥇", "🥈", "🥉"];
    const list = members.map((mem, i) => {
      const medal = i < 3 ? medals[i] + " " : (i + 1) + ". ";
      return medal + "@" + mem.jid.split("@")[0] + " - " + mem.score + " pts";
    }).join("\n");
    await m.reply(claraWrap("Leaderboard " + getMonthName(), list), { mentions: members.map(m => m.jid) });
    return { handled: true };
  }

  if (sub === "history" || sub === "arsip") {
    const months = Object.keys(cfg.history || {});
    if (months.length === 0) {
      await m.reply(claraWrap("Hall of Fame", "Belum ada history. Penghargaan bulan lalu akan muncul setelah bulan berganti."));
      return { handled: true };
    }
    const sorted = months.sort().reverse().slice(0, 3);
    const list = sorted.map(mk => {
      const awards = cfg.history[mk]?.awards || [];
      const monthName = new Date(mk + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      const awardList = awards.map(a => a.cat.emoji + " " + a.cat.title + ": @" + a.winner.split("@")[0]).join("\n   ");
      return monthName + ":\n   " + (awardList || "(tidak ada)");
    }).join("\n\n");
    const allWinners = sorted.flatMap(mk => (cfg.history[mk]?.awards || []).map(a => a.winner));
    await m.reply(claraWrap("Hall of Fame History", list), { mentions: allWinners });
    return { handled: true };
  }

  if (sub === "categories" || sub === "kategori") {
    const list = AWARD_CATEGORIES.map(c => c.emoji + " " + c.title + " - " + c.desc).join("\n");
    await m.reply(claraWrap("Hall of Fame Categories", "Kategori penghargaan:\n\n" + list));
    return { handled: true };
  }

  if (sub === "archive" || sub === "arsipkan") {
    if (!m.isOwner && !m.isAdmin) {
      await m.reply(claraWrap("Hall of Fame", "Khusus admin/owner."));
      return { handled: true };
    }
    // Move current month to history
    if (!cfg.current[monthKey]) {
      await m.reply(claraWrap("Hall of Fame", "Tidak ada data bulan ini untuk di-arsip."));
      return { handled: true };
    }
    const members = Object.entries(cfg.current[monthKey].members);
    const awards = [];
    for (const cat of AWARD_CATEGORIES) {
      let winner = null, maxVal = -1;
      for (const [jid, stats] of members) {
        let val = 0;
        switch (cat.id) {
          case "mostactive": val = stats.messages + stats.commands; break;
          case "comedian": val = stats.reactions; break;
          case "helper": val = stats.helps; break;
          case "nightowl": val = stats.nightMsgs; break;
          case "commander": val = stats.commands; break;
          case "gamer": val = stats.games; break;
          case "sticker": val = stats.stickers; break;
        }
        if (val > maxVal) { maxVal = val; winner = jid; }
      }
      if (winner && maxVal > 0) awards.push({ cat, winner });
    }
    if (!cfg.history) cfg.history = {};
    cfg.history[monthKey] = { awards, archivedAt: Date.now() };
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Hall of Fame", "Data " + getMonthName() + " di-arsip!\n" + awards.length + " penghargaan tersimpan."));
    return { handled: true };
  }

  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Hall of Fame", "Khusus owner."));
      return { handled: true };
    }
    cfg.current = {};
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Hall of Fame", "Tracking bulan ini direset."));
    return { handled: true };
  }

  await m.react("🐣");
  await m.reply(claraWrap("Hall of Fame", [
    "HALL OF FAME GRUP",
    "",
    prefix + "hallfame track - update tracking member",
    prefix + "hallfame awards - lihat penghargaan bulan ini",
    prefix + "hallfame leaderboard - top 10 member",
    prefix + "hallfame categories - lihat kategori",
    prefix + "hallfame history - penghargaan bulan lalu",
    prefix + "hallfame archive (admin) - arsip bulan ini",
    prefix + "hallfame reset (owner) - reset tracking",
    "",
    "Auto-track aktivitas member, beri penghargaan tiap bulan!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
