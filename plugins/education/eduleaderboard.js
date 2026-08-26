// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "eduleaderboard",
  alias: ["edulb", "edurank", "topsiswa", "rankingbelajar", "eduboard"],
  category: "education",
  description: "Leaderboard game belajar - ranking PG dan essay dipisah",
  usage: ".edulb [command]",
  example: ".edulb",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

function getMedal(pos) {
  if (pos === 0) return "1.";
  if (pos === 1) return "2.";
  if (pos === 2) return "3.";
  return `${pos + 1}.`;
}

function getRankTitle(level) {
  if (level >= 30) return "Genius";
  if (level >= 20) return "Cumlaude";
  if (level >= 15) return "Sarjana";
  if (level >= 10) return "Mahir";
  if (level >= 5) return "Cerdas";
  if (level >= 3) return "Pintar";
  return "Pemula";
}

function getMCAccuracy(u) {
  return u.mcTotal > 0 ? Math.round((u.mcCorrect / u.mcTotal) * 100) : 0;
}

function getEssayAvg(u) {
  return u.essayTotal > 0 ? Math.round(u.essayScoreSum / u.essayTotal) : 0;
}

async function handler(m, { sock, args }) {
  const cmd = (args[0] || "").toLowerCase();
  const db = getDatabase();
  if (!db.db.data.eduScores) db.db.data.eduScores = {};

  const allScores = db.db.data.eduScores;
  if (!db.db.data.eduRegistered) db.db.data.eduRegistered = {};
  const registered = db.db.data.eduRegistered;
  const allUsers = Object.entries(allScores)
    .filter(([id]) => registered[id])
    .map(([id, u]) => ({ id, name: registered[id]?.name || u.name || id.split("@")[0], ...u }));

  // === GLOBAL LEADERBOARD (split PG & Essay) ===
  if (!cmd || cmd === "global" || cmd === "all" || cmd === "semua") {
    if (allUsers.length === 0) {
      return m.reply(claraWrap("eduleaderboard", "Belum ada data leaderboard.\n\nMain quiz dulu: .soal sd matematika 5"));
    }

    // PG ranking (by MC accuracy)
    const pgRanked = [...allUsers]
      .filter(u => (u.mcTotal || 0) > 0)
      .sort((a, b) => getMCAccuracy(b) - getMCAccuracy(a));

    // Essay ranking (by essay average)
    const essayRanked = [...allUsers]
      .filter(u => (u.essayTotal || 0) > 0)
      .sort((a, b) => getEssayAvg(b) - getEssayAvg(a));

    let txt = `Leaderboard Belajar\n\n`;

    // PG Section
    txt += `Pilihan Ganda:\n`;
    if (pgRanked.length === 0) {
      txt += `Belum ada data PG\n\n`;
    } else {
      for (let i = 0; i < Math.min(pgRanked.length, 10); i++) {
        const u = pgRanked[i];
        const acc = getMCAccuracy(u);
        const name = (u.name || u.id.split("@")[0]).slice(0, 15);
        txt += `${getMedal(i)} ${name} ${acc}.0\n`;
      }
      txt += `\n`;
    }

    // Essay Section
    txt += `Essay:\n`;
    if (essayRanked.length === 0) {
      txt += `Belum ada data essay\n\n`;
    } else {
      for (let i = 0; i < Math.min(essayRanked.length, 10); i++) {
        const u = essayRanked[i];
        const avg = getEssayAvg(u);
        const name = (u.name || u.id.split("@")[0]).slice(0, 15);
        txt += `${getMedal(i)} ${name} ${avg}.0\n`;
      }
      txt += `\n`;
    }

    txt += `Ketik .edulb pg untuk detail PG\n`;
    txt += `Ketik .edulb essay untuk detail essay\n`;
    txt += `Ketik .edulb profil untuk profil kamu`;

    return await m.reply( txt, { commandName: "eduleaderboard" });
  }

  // === PG LEADERBOARD (detailed) ===
  if (cmd === "pg" || cmd === "abcd" || cmd === "pilihanganda") {
    if (allUsers.length === 0) {
      return m.reply(claraWrap("eduleaderboard", "Belum ada data.\n\nMain quiz dulu: .soal sd matematika 5"));
    }

    const pgRanked = [...allUsers]
      .filter(u => (u.mcTotal || 0) > 0)
      .sort((a, b) => getMCAccuracy(b) - getMCAccuracy(a));

    if (pgRanked.length === 0) {
      return m.reply(claraWrap("eduleaderboard", "Belum ada data pilihan ganda.\n\nMain: .soal sd matematika 5 mc"));
    }

    let txt = `Leaderboard Pilihan Ganda\n\n`;

    for (let i = 0; i < Math.min(pgRanked.length, 20); i++) {
      const u = pgRanked[i];
      const acc = getMCAccuracy(u);
      const name = (u.name || u.id.split("@")[0]).slice(0, 15);
      const correct = u.mcCorrect || 0;
      const total = u.mcTotal || 0;

      txt += `${getMedal(i)} ${name} ${acc}.0\n`;
      txt += `   ${correct}/${total} benar\n\n`;
    }

    if (pgRanked.length > 20) txt += `Total: ${pgRanked.length} siswa\n`;
    txt += `Berdasarkan akurasi jawaban PG`;
    return await m.reply(txt);
  }

  // === ESSAY LEADERBOARD (detailed) ===
  if (cmd === "essay" || cmd === "uraian") {
    if (allUsers.length === 0) {
      return m.reply(claraWrap("eduleaderboard", "Belum ada data.\n\nMain quiz dulu: .soal sd matematika 5 essay"));
    }

    const essayRanked = [...allUsers]
      .filter(u => (u.essayTotal || 0) > 0)
      .sort((a, b) => getEssayAvg(b) - getEssayAvg(a));

    if (essayRanked.length === 0) {
      return m.reply(claraWrap("eduleaderboard", "Belum ada data essay.\n\nMain: .soal sd matematika 5 essay"));
    }

    let txt = `Leaderboard Essay\n\n`;

    for (let i = 0; i < Math.min(essayRanked.length, 20); i++) {
      const u = essayRanked[i];
      const avg = getEssayAvg(u);
      const name = (u.name || u.id.split("@")[0]).slice(0, 15);
      const total = u.essayTotal || 0;

      txt += `${getMedal(i)} ${name} ${avg}.0\n`;
      txt += `   ${total} soal essay\n\n`;
    }

    if (essayRanked.length > 20) txt += `Total: ${essayRanked.length} siswa\n`;
    txt += `Berdasarkan rata-rata kata kunci essay`;
    return await m.reply(txt);
  }

  // === BY SUBJECT ===
  if (cmd === "mapel" || cmd === "subject") {
    const mapel = (args[1] || "").toLowerCase();
    if (!mapel) {
      const subjectMap = {};
      for (const u of allUsers) {
        if (!u.subjects) continue;
        for (const [subj, data] of Object.entries(u.subjects)) {
          if (!subjectMap[subj]) subjectMap[subj] = 0;
          subjectMap[subj]++;
        }
      }

      if (Object.keys(subjectMap).length === 0) {
        return m.reply(claraWrap("eduleaderboard", "Belum ada data per mapel.\n\nMain quiz dulu: .soal sd matematika 5"));
      }

      let txt = `Ranking Per Mapel\n\n`;
      txt += `Mapel tersedia:\n`;
      for (const [subj, count] of Object.entries(subjectMap)) {
        txt += `  ${subj} (${count} siswa)\n`;
      }
      txt += `\nKetik .edulb mapel <nama mapel> untuk lihat ranking`;
      return await m.reply(txt);
    }

    // Filter by subject - split PG & essay
    const subjectUsers = allUsers
      .filter(u => u.subjects && u.subjects[mapel])
      .map(u => {
        const s = u.subjects[mapel];
        return { ...u, subjAvg: s.totalScore / s.count, subjBest: s.best, subjCount: s.count };
      });

    if (subjectUsers.length === 0) {
      return m.reply(claraWrap("eduleaderboard", `Belum ada data untuk mapel "${mapel}".\n\nMain: .soal sd ${mapel} 5`));
    }

    // PG per subject
    const pgSubj = subjectUsers
      .filter(u => (u.mcTotal || 0) > 0)
      .sort((a, b) => getMCAccuracy(b) - getMCAccuracy(a));

    // Essay per subject
    const essaySubj = subjectUsers
      .filter(u => (u.essayTotal || 0) > 0)
      .sort((a, b) => getEssayAvg(b) - getEssayAvg(a));

    let txt = `Leaderboard: ${mapel.toUpperCase()}\n\n`;

    txt += `Pilihan Ganda:\n`;
    if (pgSubj.length === 0) {
      txt += `Belum ada data PG\n\n`;
    } else {
      for (let i = 0; i < Math.min(pgSubj.length, 10); i++) {
        const u = pgSubj[i];
        const name = (u.name || u.id.split("@")[0]).slice(0, 15);
        txt += `${getMedal(i)} ${name} ${getMCAccuracy(u)}.0\n`;
      }
      txt += `\n`;
    }

    txt += `Essay:\n`;
    if (essaySubj.length === 0) {
      txt += `Belum ada data essay\n\n`;
    } else {
      for (let i = 0; i < Math.min(essaySubj.length, 10); i++) {
        const u = essaySubj[i];
        const name = (u.name || u.id.split("@")[0]).slice(0, 15);
        txt += `${getMedal(i)} ${name} ${getEssayAvg(u)}.0\n`;
      }
      txt += `\n`;
    }

    txt += `Mapel ${mapel} - PG dan essay dipisah`;
    return await m.reply(txt);
  }

  // === BY JENJANG ===
  if (cmd === "jenjang" || cmd === "level") {
    const jenjang = (args[1] || "").toLowerCase();
    if (!jenjang) {
      let txt = `Ranking Per Jenjang\n\n`;
      txt += `Ketik: .edulb jenjang <sd/smp/sma/sk>\n`;
      txt += `Contoh: .edulb jenjang sd`;
      return await m.reply(txt);
    }

    const jenjangKey = jenjang.toUpperCase();
    const jenjangUsers = allUsers
      .filter(u => u.jenjang && u.jenjang[jenjangKey])
      .map(u => ({ ...u, jCount: u.jenjang[jenjangKey].count }));

    if (jenjangUsers.length === 0) {
      return m.reply(claraWrap("eduleaderboard", `Belum ada data untuk jenjang ${jenjangKey}.\n\nMain: .soal ${jenjang} matematika 5`));
    }

    const pgRanked = [...jenjangUsers]
      .filter(u => (u.mcTotal || 0) > 0)
      .sort((a, b) => getMCAccuracy(b) - getMCAccuracy(a));

    const essayRanked = [...jenjangUsers]
      .filter(u => (u.essayTotal || 0) > 0)
      .sort((a, b) => getEssayAvg(b) - getEssayAvg(a));

    let txt = `Leaderboard Jenjang ${jenjangKey}\n\n`;

    txt += `Pilihan Ganda:\n`;
    if (pgRanked.length === 0) {
      txt += `Belum ada data PG\n\n`;
    } else {
      for (let i = 0; i < Math.min(pgRanked.length, 10); i++) {
        const u = pgRanked[i];
        const name = (u.name || u.id.split("@")[0]).slice(0, 15);
        txt += `${getMedal(i)} ${name} ${getMCAccuracy(u)}.0\n`;
      }
      txt += `\n`;
    }

    txt += `Essay:\n`;
    if (essayRanked.length === 0) {
      txt += `Belum ada data essay\n\n`;
    } else {
      for (let i = 0; i < Math.min(essayRanked.length, 10); i++) {
        const u = essayRanked[i];
        const name = (u.name || u.id.split("@")[0]).slice(0, 15);
        txt += `${getMedal(i)} ${name} ${getEssayAvg(u)}.0\n`;
      }
      txt += `\n`;
    }

    txt += `Jenjang ${jenjangKey} - PG dan essay dipisah`;
    return await m.reply(txt);
  }

  // === MY PROFILE ===
  if (cmd === "profil" || cmd === "profile" || cmd === "me" || cmd === "aku") {
    const sender = m.sender;
    const u = allScores[sender];

    if (!u) {
      return m.reply(claraWrap("eduleaderboard", "Kamu belum main quiz sama sekali!\n\nMulai: .soal sd matematika 5"));
    }

    const mcAcc = getMCAccuracy(u);
    const essayAvg = getEssayAvg(u);
    const rankTitle = getRankTitle(u.level || 1);

    // Calculate PG rank
    const pgRanked = [...allUsers]
      .filter(x => (x.mcTotal || 0) > 0)
      .sort((a, b) => getMCAccuracy(b) - getMCAccuracy(a));
    const pgRank = pgRanked.findIndex(x => x.id === sender) + 1;

    // Calculate essay rank
    const essayRanked = [...allUsers]
      .filter(x => (x.essayTotal || 0) > 0)
      .sort((a, b) => getEssayAvg(b) - getEssayAvg(a));
    const essayRank = essayRanked.findIndex(x => x.id === sender) + 1;

    let txt = `Profil Belajar\n\n`;
    txt += `Nama: ${u.name || sender.split("@")[0]}\n`;
    txt += `Level: ${u.level || 1} (${rankTitle})\n`;
    txt += `XP: ${u.xp || 0} / ${(u.level || 1) * 100}\n`;
    txt += `Streak: ${u.streak || 0}x hari\n\n`;

    txt += `Pilihan Ganda:\n`;
    txt += `  Rank: #${pgRank > 0 ? pgRank : "-"}\n`;
    txt += `  Akurasi: ${mcAcc}.0%\n`;
    txt += `  Benar: ${u.mcCorrect || 0}/${u.mcTotal || 0}\n\n`;

    txt += `Essay:\n`;
    txt += `  Rank: #${essayRank > 0 ? essayRank : "-"}\n`;
    txt += `  Rata-rata: ${essayAvg}.0%\n`;
    txt += `  Total: ${u.essayTotal || 0} soal\n\n`;

    txt += `Total quiz: ${u.totalQuizzes || 0}\n`;
    txt += `Skor terbaik: ${(u.bestScore || 0).toFixed(1)}\n`;

    if (u.subjects && Object.keys(u.subjects).length > 0) {
      txt += `\nPer Mapel:\n`;
      for (const [subj, data] of Object.entries(u.subjects)) {
        const subjAvg = (data.totalScore / data.count).toFixed(1);
        txt += `  ${subj}: ${data.count}x | best: ${data.best.toFixed(1)}\n`;
      }
    }

    txt += `\nKetik .soal untuk lanjut belajar!`;
    return await m.reply(txt);
  }

  // === STATS ===
  if (cmd === "stats" || cmd === "statistik") {
    if (allUsers.length === 0) {
      return m.reply(claraWrap("eduleaderboard", "Belum ada data."));
    }

    const totalMC = allUsers.reduce((s, u) => s + (u.mcTotal || 0), 0);
    const totalMCCorrect = allUsers.reduce((s, u) => s + (u.mcCorrect || 0), 0);
    const totalEssay = allUsers.reduce((s, u) => s + (u.essayTotal || 0), 0);
    const allSubjects = new Set();
    allUsers.forEach(u => Object.keys(u.subjects || {}).forEach(s => allSubjects.add(s)));

    let txt = `Statistik Belajar\n\n`;
    txt += `Total siswa: ${allUsers.length}\n`;
    txt += `Total quiz: ${allUsers.reduce((s, u) => s + (u.totalQuizzes || 0), 0)}\n\n`;

    txt += `Pilihan Ganda:\n`;
    txt += `  Total soal: ${totalMC}\n`;
    txt += `  Benar: ${totalMCCorrect} (${totalMC > 0 ? Math.round(totalMCCorrect / totalMC * 100) : 0}%)\n\n`;

    txt += `Essay:\n`;
    txt += `  Total soal: ${totalEssay}\n\n`;

    txt += `Mapel: ${allSubjects.size} (${[...allSubjects].join(", ")})\n\n`;

    // Top 3 PG
    const topPG = [...allUsers]
      .filter(u => (u.mcTotal || 0) > 0)
      .sort((a, b) => getMCAccuracy(b) - getMCAccuracy(a))
      .slice(0, 3);
    txt += `Top 3 PG:\n`;
    for (let i = 0; i < topPG.length; i++) {
      const u = topPG[i];
      txt += `  ${getMedal(i)} ${u.name || u.id.split("@")[0]} ${getMCAccuracy(u)}.0\n`;
    }

    txt += `\n`;
    // Top 3 Essay
    const topEssay = [...allUsers]
      .filter(u => (u.essayTotal || 0) > 0)
      .sort((a, b) => getEssayAvg(b) - getEssayAvg(a))
      .slice(0, 3);
    txt += `Top 3 Essay:\n`;
    for (let i = 0; i < topEssay.length; i++) {
      const u = topEssay[i];
      txt += `  ${getMedal(i)} ${u.name || u.id.split("@")[0]} ${getEssayAvg(u)}.0\n`;
    }

    return await m.reply(txt);
  }

  // === RESET (owner only) ===
  if (cmd === "reset" || cmd === "clear") {
    if (!m.isOwner) {
      return m.reply(claraWrap("eduleaderboard", "Khusus owner!"));
    }
    db.db.data.eduScores = {};
    db.write();
    await m.reply(claraWrap("Eduleaderboard", "Leaderboard belajar direset!"));
    await m.react("🐣");
    return;
  }

  // === HELP ===
  let txt = `Leaderboard Belajar\n\n`;
  txt += `Skor PG dan essay dipisah!\n\n`;
  txt += `Perintah:\n`;
  txt += `1. .edulb - Ranking global (PG + Essay)\n`;
  txt += `2. .edulb pg - Ranking pilihan ganda saja\n`;
  txt += `3. .edulb essay - Ranking essay saja\n`;
  txt += `4. .edulb mapel <mapel> - Ranking per mapel\n`;
  txt += `5. .edulb jenjang <sd/smp/sma/sk> - Ranking per jenjang\n`;
  txt += `6. .edulb profil - Profil belajar kamu\n`;
  txt += `7. .edulb stats - Statistik global\n\n`;
  txt += `Skor otomatis tersimpan tiap main .soal

Daftar dulu: .daftarsiswa <nama>`;
  return await m.reply( txt, { commandName: "eduleaderboard" });
}

export { pluginConfig as config, handler };
