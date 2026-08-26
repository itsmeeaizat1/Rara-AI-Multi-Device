// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autofact",
  alias: ["autofact"],
  category: "group",
  description: "Kirim fakta unik random otomatis tiap interval (toggle on/off per grup)",
  usage: ".autofact on [menit] | .autofact off | .autofact status | .autofact now",
  example: ".autofact on 45",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const FACTS = [
  "Jantung gajah berdetak hanya 27 kali per menit, jauh lebih lambat dari manusia.",
  "Warna langit malam sebenarnya tidak hitam, tapi sangat gelap biru yang sulit dilihat mata.",
  "Lebah madu dapat mengenali wajah manusia. Mereka belajar mengenali orang tertentu.",
  "Ular bisa melihat dalam mode termal, seperti kamera infra merah.",
  "Cumi-cumi punya 3 jantung dan darah berwarna biru.",
  "Satu tahun di Planet Neptunus sama dengan 165 tahun di Bumi.",
  "Lapisan ozon mulai dipulihkan setelah dunia melarang CFC pada 1987.",
  "Amazon rainforest menghasilkan 20% oksigen bumi.",
  "Gempa terdalam pernah terjadi di kedalaman 700km di bawah tanah.",
  "Lampu pertama di dunia bisa bertahan 120 tahun tanpa mati.",
  "Kartu kredit lebih kotor dari kursi toilet, ada 3x lebih banyak bakteri.",
  "Manusia bisa bertahan hidup tanpa makan selama 30-40 hari, tapi tanpa air hanya 3-5 hari.",
  "Suara petir bisa mencapai 1.200 derajat celsius, 5x lebih panas dari permukaan matahari.",
  "Rambut manusia tumbuh 0.5 inci per bulan, atau sekitar 1.25 cm.",
  "Dinosaurus puncah 65 juta tahun lalu, tapi hiu sudah ada 400 juta tahun lalu.",
  "Gajah adalah satu-satunya hewan yang tidak bisa melompat.",
  "Rasa coklat sebenarnya berasal dari biji yang rasanya pahit banget.",
  "Indonesia punya 17.508 pulau, jadi negara kepulauan terbesar di dunia.",
  "Bumi tidak benar-benar bulat, lebih mirip elips dengan sedikit bengkok di kutub.",
  "Lautan bumi menyimpan 80% dari kehidupan bumi yang belum teridentifikasi.",
  "Satu detik terdiri dari 86.400 bagian yang disebut 'jiffy'.",
  "Paru-paru manusia punya luas 70m persegi, hampir seukuran lapangan badminton.",
  "Mata manusia bisa melihat cahaya dari lilin dari jarak 3km.",
  "Gajah bisa mendengar dengan kakinya, mereka merasakan getaran tanah.",
  "Kulit manusia berganti setiap 28 hari, kamu gak pernah benar-benar 'sama' dengan kemarin.",
  "Satu tetes air laut mengandung jutaan bakteri dan virus.",
  "Bumi lebih dekat ke matahari di musim dingin, bukan musim panas.",
  "Rambut gorilla bisa dihitung dengan alat yang sama untuk manusia.",
  "Di luar angkasa, ada planet yang terbuat dari berlian ukuran Bumi.",
  "Luas otak manusia kalau dijejerin bisa kelilingin bumi 4 kali.",
  "Gunung Everest masih bertambah tinggi 4mm setiap tahun karena pergerakan lempeng.",
  "Cuka yang dijual di toko sebenarnya asam cuka yang dilarutkan dengan air.",
  "Kupu-kupu bisa mengecap rasa dengan kakinya.",
  "Tidak ada dua manusia yang punya sidik jari yang sama, bahkan kembar identik.",
  "Kertas paling tipis yang pernah dibuat setebal 0.001 mm.",
  "Di matahari, 1 juta bumi bisa muat di dalamnya.",
  "Bumi berputar dengan kecepatan 1.600 km/jam, tapi kita gak merasakannya.",
  "Burung unta bisa berlari lebih cepat dari kuda.",
  "Satu ekor rayap bisa makan kertas seukuran buku dalam satu hari.",
  "Pohon tertua di dunia berusia 5.000 tahun, di California.",
  "Ikan paus biru bisa berkomunikasi sampai 1.600 km jauhnya.",
  "Cahaya butuh 8 menit 20 detik untuk sampai dari matahari ke bumi.",
  "Saliva manusia bisa memecah karbohidrat mulai dari mulut.",
  "Satu bintang bisa bersinar triliunan tahun sebelum mati.",
  "Indonesia punya 127 gunung berapi aktif, terbanyak di dunia.",
  "Rasa pahit di lidah bisa dideteksi 1 bagian per 2 juta.",
  "Sel darah merah manusia hidup hanya 120 hari sebelum diganti.",
  "Satu gram madu adalah hasil kerja dari ribuan lebah.",
  "Air bisa membeku sampai -48 derajat celsius tanpa membeku kalau murni.",
  "Otak manusia 60% terdiri dari lemak.",
];

const DEFAULT_INTERVAL = 45;
const MIN_INTERVAL = 15;
const MAX_INTERVAL = 360;

let intervals = {};

export function startAutoFact(groupId, sock, db) {
  stopAutoFact(groupId);
  const cfg = db.data.autoFact?.[groupId];
  if (!cfg || !cfg.enabled) return;

  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoFact?.[groupId];
      if (!g || !g.enabled) {
        stopAutoFact(groupId);
        return;
      }
      const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
      g.lastFact = fact;
      g.lastSent = Date.now();
      g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();

      await sock.sendMessage(groupId, {
        text: claraWrap("Auto Fact", "Fakta Unik:\n\n" + fact + "\n\nMode: Otomatis tiap " + g.interval + " menit", "info"),
      });
    } catch (e) {
      console.error("[AutoFact interval]", e);
    }
  }, intervalMs);
}

export function stopAutoFact(groupId) {
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

    if (!db.data.autoFact) db.data.autoFact = {};
    if (!db.data.autoFact[groupId]) {
      db.data.autoFact[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastFact: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoFact[groupId];

    // ON
    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;

      cfg.enabled = true;
      cfg.interval = interval;
      cfg.activatedBy = sender;
      cfg.activatedAt = Date.now();
      await db.save();

      startAutoFact(groupId, conn, db);

      return m.reply(claraWrap("Auto Fact", [
        "Fakta otomatis DIAKTIFKAN!",
        "",
        "Interval: " + interval + " menit",
        "Total fakta tersedia: " + FACTS.length,
        "",
        "Bot bakal kirim fakta unik tiap " + interval + " menit.",
        "Ketik .autofact off untuk matikan.",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      stopAutoFact(groupId);

      return m.reply(claraWrap("Auto Fact", "Fakta otomatis DIMATIKAN.\nKetik .autofact on untuk aktifkan lagi."));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";

      return m.reply(claraWrap("Auto Fact", [
        "Status: " + (cfg.enabled ? "*ᴀᴋᴛɪꜰ*" : "Nonaktif"),
        "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit",
        "Total terkirim: " + (cfg.totalSent || 0),
        "Terakhir kirim: " + lastSentStr,
        "Fakta tersedia: " + FACTS.length,
      ]));
    }

    // NOW
    if (sub === "now" || sub === "sekarang") {
      const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
      cfg.lastFact = fact;
      cfg.lastSent = Date.now();
      cfg.totalSent = (cfg.totalSent || 0) + 1;
      await db.save();

      return m.reply(claraWrap("Auto Fact", [
        "Fakta Unik:",
        "",
        fact,
        "",
        "Total terkirim: " + cfg.totalSent,
      ]));
    }

    // HELP
    return m.reply(claraWrap("Auto Fact", [
      "Kirim fakta unik random otomatis tiap interval",
      "",
      "CARA PAKAI:",
      usedPrefix + "autofact on [menit] — Aktifkan (default 45 menit, min 15, max 360)",
      usedPrefix + "autofact off — Matikan",
      usedPrefix + "autofact status — Lihat status",
      usedPrefix + "autofact now — Kirim fakta sekarang",
      "",
      "CONTOH:",
      usedPrefix + "autofact on",
      usedPrefix + "autofact on 60",
      usedPrefix + "autofact off",
    ]));
  } catch (e) {
    console.error("[Auto Fact]", e);
    m.reply(claraWrap("Auto Fact", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
