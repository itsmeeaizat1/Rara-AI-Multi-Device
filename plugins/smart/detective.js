// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "detective",
  alias: ["detective"],
  category: "smart",
  description: "Detective mystery - pecahkan kasus pembunuhan teks",
  usage: ".detective <command>",
  example: ".detective start",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const CASES = [
  {
    title: "Pembunuhan di Perpustakaan",
    victim: "Pak Hartono, kepala sekolah",
    setting: "Perpustakaan sekolah, jam 21:00. Pak Hartono ditemukan tewas, kepalahan terbentur meja.",
    suspects: [
      { name: "Bu Sinta", role: "Librarian", alibi: "Saya di ruang guru, sedang mengoreksi soal. Tidak dengar apa-apa.", clue: "Ada noda tinta di tangan kanannya, tapi semua dokumen di ruang guru bersih.", isKiller: false },
      { name: "Pak Joko", role: "Satpam", alibi: "Saya sedang patroli di lapangan. Lihat ada seseorang lari dari arah perpustakaan.", clue: "Sepatu kotornya menunjukkan dia TIDAK di lapangan malam itu, tapi DI kebun dekat perpustakaan.", isKiller: true },
      { name: "Dewi", role: "Siswa", alibi: "Saya sudah pulang jam 15:00. Tidak tahu apa-apa.", clue: "Rak buku terakhir dipinjamnya adalah buku tentang racun, bukan kekerasan fisik.", isKiller: false },
    ],
    hints: [
      "Perhatikan alibi Pak Joko: patroli lapangan tapi sepatunya kotor dari kebun.",
      "Korban terbentur meja = kekerasan fisik, bukan racun.",
      "Bu Sinta di ruang guru dengan dokumen bersih - alibi masuk akal.",
    ],
    answer: "Pak Joko sang satpam. Alibi lapangan bohong, sepatunya kotor dari kebun dekat perpustakaan. Dia yang membunuh.",
  },
  {
    title: "Racun di Pesta Ulang Tahun",
    victim: "Roni, pengusaha muda",
    setting: "Pesta ulang tahun di rumah mewah. Roni meninggal setelah minum anggur merah. Racun ditemukan di gelas.",
    suspects: [
      { name: "Maya", role: "Istri", alibi: "Saya sibuk melayani tamu sepanjang malam.", clue: "Saat diinterogasi, tangan Maya gemetar dan dia tahu RONI alergi anggur merah.", isKiller: false },
      { name: "Budi", role: "Teman bisnis", alibi: "Saya baru datang saat Roni sudah minum anggurnya.", clue: "Kamera CCTV menunjukkan Budi masuk dapur 10 menit sebelum Roni minum, padahal dia bilang baru datang.", isKiller: true },
      { name: "Sari", role: "Asisten", alibi: "Saya yang tuang anggur ke gelas Roni, tapi dari botol yang sama untuk semua tamu.", clue: "Botol anggur diperiksa, bersih. Racun hanya di gelas Roni, bukan botol.", isKiller: false },
    ],
    hints: [
      "Budi masuk dapur sebelum Roni minum, tapi alibinya bilang baru datang.",
      "Sari menuang dari botol yang sama, dan botol bersih - racun hanya di gelas.",
      "Maya tahu Roni alergi anggur, tapi dia tidak mencegah - alasan: tidak ada di dekat Roni saat itu.",
    ],
    answer: "Budi. CCTV buktikan dia masuk dapur sebelum menebar racun di gelas Roni. Alibinya palsu.",
  },
  {
    title: "Hilang di Stasiun",
    victim: "Tas berisi uang 500 juta",
    setting: "Tas berisi uang hilang dari loker stasiun. Kunci loker hanya dipegang 3 orang.",
    suspects: [
      { name: "Andi", role: "Petugas stasiun", alibi: "Saya di pos satpam sepanjang waktu.", clue: "Catatan logbook pos menunjukkan Andi meninggalkan pos 15 menit saat kejadian.", isKiller: false },
      { name: "Lina", role: "Pemilik tas", alibi: "Saya ke toilet, tas saya kunci di loker.", clue: "Lina punya kunci cadangan yang tidak dia sebutkan saat ditanya.", isKiller: true },
      { name: "Rudi", role: "Petugas kebersihan", alibi: "Saya sedang mengepel lantai di lantai 2.", clue: "Rudi memang di lantai 2, CCTV konfirmasi. Tidak mungkin turun tanpa terlihat.", isKiller: false },
    ],
    hints: [
      "Lina punya kunci cadangan yang disembunyikan.",
      "Andi meninggalkan pos 15 menit, tapi untuk ke toilet, CCTV konfirmasi.",
      "Rudi terlihat di CCTV lantai 2 sepanjang waktu.",
    ],
    answer: "Lina. Dia pura-pura tasnya hilang, padahal dia ambil sendiri pakai kunci cadangan. Kasus asuransi palsu.",
  },
];

function getConfig(db, gid) {
  const all = db.setting("detective") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("detective") || {};
  all[gid] = data;
  db.setting("detective", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("detective") || {};
  delete all[gid];
  db.setting("detective", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "start" || sub === "mulai") {
    if (game && game.status === "active") {
      await m.reply(claraWrap("Detective", "Kasus masih aktif. Ketik " + prefix + "detective stop."));
      return { handled: true };
    }
    const caseData = CASES[Math.floor(Math.random() * CASES.length)];
    const data = {
      status: "active",
      caseData,
      hintsUsed: 0,
      maxHints: 2,
      askedSuspects: [],
      solved: false,
      startedAt: Date.now(),
      attempts: 0,
    };
    saveConfig(db, gid, data);
    await m.reply(claraWrap("Detective: " + caseData.title, [
      "KORBAN: " + caseData.victim,
      "",
      "TKP:",
      caseData.setting,
      "",
      "Tersangka:",
      ...caseData.suspects.map((s, i) => (i + 1) + ". " + s.name + " (" + s.role + ")"),
      "",
      "Perintah:",
      prefix + "detective interrogate <nomor> - periksa tersangka",
      prefix + "detective hint - minta petunjuk (" + data.maxHints + " max)",
      prefix + "detective accuse <nomor> - tuduh pembunuh",
      prefix + "detective stop (admin) - batalkan",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "interrogate" || sub === "periksa" || sub === "tanya") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Detective", "Belum ada kasus. Ketik " + prefix + "detective start."));
      return { handled: true };
    }
    const num = parseInt(args[2] || "0", 10) - 1;
    if (isNaN(num) || num < 0 || num >= game.caseData.suspects.length) {
      await m.reply(novaError("Detective", "Nomor tersangka gak valid nih"));
      return { handled: true };
    }
    const suspect = game.caseData.suspects[num];
    if (!game.askedSuspects.includes(num)) game.askedSuspects.push(num);
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Interrogasi: " + suspect.name, [
      "Role: " + suspect.role,
      "",
      "Alibi: " + suspect.alibi,
      "",
      "Petunjuk: " + suspect.clue,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "hint" || sub === "petunjuk") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Detective", "Belum ada kasus."));
      return { handled: true };
    }
    if (game.hintsUsed >= game.maxHints) {
      await m.reply(claraWrap("Detective", "Petunjuk habis! (max " + game.maxHints + ")"));
      return { handled: true };
    }
    const hint = game.caseData.hints[game.hintsUsed];
    game.hintsUsed++;
    saveConfig(db, gid, game);
    await m.reply(claraWrap("Detective Hint", "Petunjuk " + game.hintsUsed + "/" + game.maxHints + ":\n" + hint));
    return { handled: true };
  }

  if (sub === "accuse" || sub === "tuduh") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Detective", "Belum ada kasus."));
      return { handled: true };
    }
    const num = parseInt(args[2] || "0", 10) - 1;
    if (isNaN(num) || num < 0 || num >= game.caseData.suspects.length) {
      await m.reply(novaError("Detective", "Nomor tersangka gak valid nih"));
      return { handled: true };
    }
    game.attempts++;
    const suspect = game.caseData.suspects[num];
    if (suspect.isKiller) {
      game.solved = true;
      game.status = "solved";
      const time = Math.floor((Date.now() - game.startedAt) / 1000);
      saveConfig(db, gid, game);
      await m.reply(claraWrap("Detective - CASE SOLVED!", [
        "BENAR! Pembunuhnya adalah " + suspect.name + " (" + suspect.role + ")",
        "",
        "Penjelasan: " + game.caseData.answer,
        "",
        "Waktu: " + Math.floor(time / 60) + "m " + (time % 60) + "s",
        "Hints used: " + game.hintsUsed + "/" + game.maxHints,
        "Attempts: " + game.attempts,
      ].join("\n")));
      delConfig(db, gid);
    } else {
      if (game.attempts >= 3) {
        game.status = "failed";
        saveConfig(db, gid, game);
        await m.reply(claraWrap("Detective - CASE FAILED", [
          "Salah! Kesempatan habis (3 attempts).",
          "",
          "Jawaban: " + game.caseData.answer,
        ].join("\n")));
        delConfig(db, gid);
      } else {
        saveConfig(db, gid, game);
        await m.reply(claraWrap("Detective", "Salah! " + suspect.name + " bukan pembunuh.\nSisa kesempatan: " + (3 - game.attempts) + "x"));
      }
    }
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Detective", "Khusus admin/owner."));
      return { handled: true };
    }
    delConfig(db, gid);
    await m.reply(claraWrap("Detective", "Kasus dibatalkan."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(claraWrap("Detective", "Belum ada kasus.\n" + prefix + "detective start untuk mulai."));
      return { handled: true };
    }
    await m.reply(claraWrap("Detective", [
      "Kasus: " + game.caseData.title,
      "Status: " + game.status,
      "Tersangka diperiksa: " + game.askedSuspects.length + "/" + game.caseData.suspects.length,
      "Hints: " + game.hintsUsed + "/" + game.maxHints,
      "Attempts: " + game.attempts + "/3",
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Detective", [
    "DETECTIVE MYSTERY GAME",
    "",
    prefix + "detective start - mulai kasus baru",
    prefix + "detective interrogate <nomor> - periksa tersangka",
    prefix + "detective hint - minta petunjuk (max 2)",
    prefix + "detective accuse <nomor> - tuduh pembunuh (3 attempts)",
    prefix + "detective status - cek progress",
    prefix + "detective stop (admin) - batalkan",
    "",
    "Pecahkan kasus dengan investigasi & logika!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
