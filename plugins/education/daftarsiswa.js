// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "daftarsiswa",
  alias: ["daftarbelajar", "regsiswa", "daftaredu", "registereedu"],
  category: "education",
  description: "Daftar sebagai siswa untuk main game belajar (soal, essay, leaderboard)",
  usage: ".daftarsiswa <nama>",
  example: ".daftarsiswa Andi Pratama",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const db = getDatabase();
  if (!db.db.data.eduScores) db.db.data.eduScores = {};
  if (!db.db.data.eduRegistered) db.db.data.eduRegistered = {};

  const sender = m.sender;
  const name = args.join(" ").trim();

  // === HELP ===
  if (!name || name === "help" || name === "menu") {
    let txt = `Daftar Siswa Belajar\n\n`;
    txt += `Untuk main game belajar (.soal, .essay), kamu harus daftar dulu.\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}daftarsiswa <nama>\` - Daftar siswa baru\n`;
    txt += `2. \`${m.prefix}daftarsiswa profil\` - Lihat profil pendaftaran\n`;
    txt += `3. \`${m.prefix}daftarsiswa ubah <nama baru>\` - Ganti nama\n`;
    txt += `4. \`${m.prefix}daftarsiswa hapus\` - Hapus pendaftaran\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}daftarsiswa Andi Pratama\`\n\n`;
    txt += `Nama akan tampil di leaderboard`;
    return await m.reply( txt, { commandName: "daftarsiswa" });
  }

  const cmd = name.toLowerCase();

  // === PROFILE ===
  if (cmd === "profil" || cmd === "profile" || cmd === "cek") {
    const reg = db.db.data.eduRegistered[sender];
    if (!reg) {
      return m.reply(claraWrap("daftarsiswa", "Kamu belum terdaftar!\n\nDaftar: `.daftarsiswa <nama>`"));
    }
    let txt = `Profil Siswa\n\n`;
    txt += `Nama: *${reg.name}*\n`;
    txt += `Terdaftar: ${new Date(reg.registeredAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}\n`;
    txt += `Jenjang: ${reg.jenjang || "belum dipilih"}\n`;
    txt += `Asal: ${reg.asal || "-"}\n\n`;

    // Check if they have scores
    const scores = db.db.data.eduScores[sender];
    if (scores) {
      txt += `Statistik:\n`;
      txt += `  Total quiz: ${scores.totalQuizzes || 0}\n`;
      txt += `  Level: ${scores.level || 1}\n`;
      txt += `  XP: ${scores.xp || 0}\n`;
    } else {
      txt += `Belum main quiz. Ketik \`.soal sd matematika 5\` untuk mulai!`;
    }
    return await m.reply(txt);
  }

  // === UPDATE NAME ===
  if (cmd.startsWith("ubah ")) {
    const newName = name.slice(5).trim();
    if (!newName || newName.length < 2) {
      return m.reply(claraWrap("Daftarsiswa", "Nama terlalu pendek! Min 2 karakter.\n\nContoh: `.daftarsiswa ubah Budi Santoso`"));
    }
    const reg = db.db.data.eduRegistered[sender];
    if (!reg) {
      return m.reply(claraWrap("daftarsiswa", "Kamu belum terdaftar!\n\nDaftar: `.daftarsiswa <nama>`"));
    }
    const oldName = reg.name;
    reg.name = newName;
    // Also update in scores if exists
    if (db.db.data.eduScores[sender]) {
      db.db.data.eduScores[sender].name = newName;
    }
    db.write();
    await m.reply(claraWrap("daftarsiswa", `Nama diubah!\n\nSebelumnya: ${oldName}\nSekarang: *${newName}*\n\nLeaderboard akan tampil nama barumu.`));
    await m.react("🐣");
    return;
  }

  // === DELETE ===
  if (cmd === "hapus" || cmd === "delete" || cmd === "unregister") {
    if (!db.db.data.eduRegistered[sender]) {
      return m.reply(claraWrap("daftarsiswa", "Kamu belum terdaftar!"));
    }
    delete db.db.data.eduRegistered[sender];
    db.write();
    await m.reply(claraWrap("daftarsiswa", "Pendaftaran dihapus. Kamu tidak bisa main game belajar sampai daftar lagi.\n\nDaftar: `.daftarsiswa <nama>`"));
    await m.react("🐣");
    return;
  }

  // === REGISTER ===
  // Validate name
  if (name.length < 2) {
    return m.reply(claraWrap("Daftarsiswa", "Nama terlalu pendek! Min 2 karakter.\n\nContoh: `.daftarsiswa Andi Pratama`"));
  }
  if (name.length > 30) {
    return m.reply(claraWrap("Daftarsiswa", "Nama terlalu panjang! Maks 30 karakter."));
  }

  // Check if already registered
  if (db.db.data.eduRegistered[sender]) {
    const existing = db.db.data.eduRegistered[sender];
    return m.reply(`Kamu sudah terdaftar!\n\nNama: *${existing.name}*\n\nUbah nama: \`.daftarsiswa ubah <nama baru>\`\nHapus: \`.daftarsiswa hapus\``);
  }

  // Register
  db.db.data.eduRegistered[sender] = {
    name,
    registeredAt: Date.now(),
    jenjang: null,
    asal: null,
  };

  // Also create empty score entry
  if (!db.db.data.eduScores[sender]) {
    db.db.data.eduScores[sender] = {
      name,
      totalQuizzes: 0,
      totalScore: 0,
      bestScore: 0,
      mcCorrect: 0,
      mcTotal: 0,
      essayTotal: 0,
      essayScoreSum: 0,
      subjects: {},
      jenjang: {},
      history: [],
      level: 1,
      xp: 0,
      streak: 0,
      lastQuiz: null,
    };
  } else {
    db.db.data.eduScores[sender].name = name;
  }

  db.write();

  let txt = `Pendaftaran Berhasil!\n\n`;
  txt += `Nama: *${name}*\n`;
  txt += `ID: ${sender.split("@")[0]}\n\n`;
  txt += `Kamu sekarang bisa main:\n`;
  txt += `  .soal sd matematika 5\n`;
  txt += `  .soal sma fisika 10 mc\n`;
  txt += `  .essay smp ipa 3\n\n`;
  txt += `Skor tersimpan otomatis & muncul di leaderboard.\n`;
  txt += `Ketik \`${m.prefix}edulb\` untuk lihat ranking!`;
  await m.reply(txt);
  await m.react("🐣");
}

export { pluginConfig as config, handler };
