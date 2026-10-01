// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autojoke",
  alias: ["autojoke"],
  category: "group",
  description: "Kirim joke random otomatis tiap interval (toggle on/off per grup)",
  usage: ".autojoke on [menit] | .autojoke off | .autojoke status | .autojoke now",
  example: ".autojoke on 30",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const JOKES = [
  "Kenapa ayam nyebrang jalan? Karena ayamnya gak bisa terbang.",
  "Saya bukan capek, saya hanya sedang rehat yang sangat lama.",
  "Jangan nanya soal masa depan, soalnya aku juga gak tau masa depan siapa aku.",
  "Diet itu gampang, yang susah itu nahan makan enak.",
  "Saya punya cita-cita jadi pilot, tapi takut ketinggian.",
  "Kenapa saya gak punya pacar? Karena saya belum bayar cicilan hati.",
  "Bukan aku yang berubah, tapi kamu yang bikin aku malas.",
  "Jodoh itu takdir, tapi skripsi itu harus diusahakan.",
  "Hidup itu seperti LED, kalau over voltage, dia redup.",
  "Saya mau beli sepatu baru, tapi dompetku bilang: 'yang lama masih bagus, perbaiki saja'.",
  "Mending sakit kepala daripada sakit hati, karena sakit kepala tinggal minum paracetamol, kalau sakit hati? Nambah dosa terus.",
  "Kalau kamu ngerasa sendirian, ingatlah bahwa dalam tubuhmu ada jutaan bakteri yang nemenin kamu.",
  "Guru: 'Apa arti kesabaran?' Siswa: 'Nungguin kamu pulang, Pak!'",
  "Kenapa pencarian Google gak pernah salah? Karena dia gak ada 'tombol balik' seperti mantan kamu.",
  "Cinta itu buta, tapi yang nembak harus jago matematika. Hitung-hitung modal.",
  "Hidup itu seperti kopi, pahit di awal, tapi kalau gak ditambah gula, tetap aja pahit sampai akhir.",
  "Kalo kamu capek, ingat satu hal: kamu masih lebih hebat dari Wi-Fi yang sinyalnya satu bar.",
  "Kenapa cowok suka makan pisang? Karena pisang gak bisa makan dia.",
  "Jangan pernah merasa miskin, kamu masih punya mimpi yang belum dijual.",
  "Masa depan itu milik orang yang persiapannya matang, bukan yang tidurnya lelap.",
  "Bukan aku ngerasa malas, tapi tempat tidurku yang terlalu nyaman.",
  "Kenapa komputer itu dingin? Karena dia punya banyak windows.",
  "Saya cuma berani ngecengin kamu di Google, soalnya di real life saya cuma bisa 'Google' terus.",
  "Tiap hari aku bilang 'besok aku belajar', tapi sampai sekarang aku masih 'ber-YouTube ria'.",
  "Kenapa aku suka tidur? Karena di alam mimpi, aku bisa jadi apapun yang aku mau, kecuali kenyataan.",
  "Saya bukan malas, saya sedang charging energi.",
  "Kalo hujan turun, jangan nanya kenapa, emang udah rezeki dari langit.",
  "Jomblo itu bukan kalah, tapi sedang menunggu waktu yang tepat untuk menang.",
  "Coba deh kamu belajar dari kulkas, dia dingin tapi tetap berguna.",
  "Hidup itu seperti Math, kalau gak paham, ya tinggal skip aja.",
  "Orang sukses itu punya dua pilihan: bangun pagi, atau tetap bangun pagi.",
  "Aku bukan gak mau move on, tapi kenangannya terlalu enak buat dilupakan.",
  "Kenapa aku selalu telat? Karena waktu gak pernah nungguin aku.",
  "Jangan pernah menyerah, karena menyerah itu gak ada kampanye-nya.",
  "Tiap orang punya masalah, yang membedakan adalah ada yang cerita ke dokter, ada yang ke parpol.",
  "Saya cuma mau kamu tahu, kamu itu spesial. Spesial edi sial.",
  "Kenapa aku gak suka hujan? Karena aku gak punya payung, dan gak punya pacar buat nipin payung.",
  "Cinta itu seperti listrik, kalau kamu terkena, kamu akan kesetrum.",
  "Aku itu seperti kompor gas, butuh dipancing dulu baru bisa nyala.",
  "Saya itu seperti Wi-Fi, kadang kuat, kadang lemot, tapi tetap bisa diandalkan.",
  "Kenapa pacar aku gak pernah ada? Karena aku gak pernah 'mendaftar' di hatinya.",
  "Aku bukan gak peduli, tapi aku lagi sibuk peduli sama diriku sendiri.",
  "Saya punya 99 masalah, tapi uang bukan salah satunya. Soalnya memang gak ada.",
  "Kenapa aku gak suka berantem? Karena aku takut menang, nanti dianggap sombong.",
  "Cinta itu seperti ojek online, kadang overspeed, kadang ngebut, dan ujungnya kabur.",
  "Makan itu wajib, tapi makan temanmu jangan.",
  "Aku itu seperti batrei HP, cepat habis kalau dipakai terus.",
  "Kenapa aku suka sekolah? Karena di sekolah ada teman, walau kadang gak penting.",
  "Saya bukan sombong, saya cuma pelihara jarak supaya tidak jatuh cinta.",
  "Hidup itu seperti snackbar, kadang isinya kejutan, kadang isinya cuma udara.",
];

const DEFAULT_INTERVAL = 30; // menit
const MIN_INTERVAL = 10;
const MAX_INTERVAL = 180;

let intervals = {}; // groupId -> setInterval

export function startAutoJoke(groupId, sock, db) {
  stopAutoJoke(groupId);
  const game = db.data.autoJoke?.[groupId];
  if (!game || !game.enabled) return;

  const intervalMs = (game.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoJoke?.[groupId];
      if (!g || !g.enabled) {
        stopAutoJoke(groupId);
        return;
      }
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      g.lastJoke = joke;
      g.lastSent = Date.now();
      g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();

      await sock.sendMessage(groupId, {
        text: novaWrap("Auto Joke", joke + "\n\nMode: Otomatis tiap " + g.interval + " menit", "info"),
      });
    } catch (e) {
      console.error("[AutoJoke interval]", e);
    }
  }, intervalMs);
}

export function stopAutoJoke(groupId) {
  if (intervals[groupId]) {
    clearInterval(intervals[groupId]);
    delete intervals[groupId];
  }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoJoke) db.data.autoJoke = {};
    if (!db.data.autoJoke[groupId]) {
      db.data.autoJoke[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastJoke: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoJoke[groupId];

    // ON
    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;

      cfg.enabled = true;
      cfg.interval = interval;
      cfg.activatedBy = sender;
      cfg.activatedAt = Date.now();
      await db.save();

      startAutoJoke(groupId, conn, db);

      return m.reply(novaWrap("Auto Joke", [
        "Joke otomatis DIAKTIFKAN!",
        "",
        "Interval: " + interval + " menit",
        "Total jokes tersedia: " + JOKES.length,
        "",
        "Bot bakal kirim joke random tiap " + interval + " menit.",
        "Ketik .autojoke off untuk matikan.",
        "Ketik .autojoke now untuk kirim sekarang.",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      stopAutoJoke(groupId);

      return m.reply(novaWrap("Auto Joke", "Joke otomatis DIMATIKAN.\nKetik .autojoke on untuk aktifkan lagi."));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";

      return m.reply(novaWrap("Auto Joke", [
        "Status: " + (cfg.enabled ? "*aktif*" : "Nonaktif"),
        "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit",
        "Total terkirim: " + (cfg.totalSent || 0),
        "Terakhir kirim: " + lastSentStr,
        "Jokes tersedia: " + JOKES.length,
      ]));
    }

    // NOW
    if (sub === "now" || sub === "sekarang") {
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      cfg.lastJoke = joke;
      cfg.lastSent = Date.now();
      cfg.totalSent = (cfg.totalSent || 0) + 1;
      await db.save();

      return m.reply(novaWrap("Auto Joke", [
        joke,
        "",
        "Mode: Manual trigger",
        "Total terkirim: " + cfg.totalSent,
      ]));
    }

    // HELP
    return m.reply(novaWrap("Auto Joke", [
      "Kirim joke random otomatis tiap interval",
      "",
      "CARA PAKAI:",
      usedPrefix + "autojoke on [menit] — Aktifkan (default 30 menit, min 10, max 180)",
      usedPrefix + "autojoke off — Matikan",
      usedPrefix + "autojoke status — Lihat status",
      usedPrefix + "autojoke now — Kirim joke sekarang",
      "",
      "CONTOH:",
      usedPrefix + "autojoke on",
      usedPrefix + "autojoke on 15",
      usedPrefix + "autojoke off",
    ]));
  } catch (e) {
    console.error("[Auto Joke]", e);
    m.reply(novaWrap("Auto Joke", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
