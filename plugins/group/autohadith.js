// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autohadith",
  alias: ["autohadith"],
  category: "group",
  description: "Kirim hadist random otomatis tiap interval (toggle on/off per grup)",
  usage: ".autohadith on [menit] | .autohadith off | .autohadith status | .autohadith now",
  example: ".autohadith on 60",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const HADITHS = [
  { text: "Sesungguhnya amal itu tergantung pada niatnya, dan setiap orang akan mendapatkan apa yang ia niatkan.", source: "HR. Bukhari & Muslim", narrator: "Umar bin Khattab RA" },
  { text: "Barangsiapa menempuh jalan untuk menuntut ilmu, Allah akan memudahkan baginya jalan menuju surga.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Tidaklah seorang hamba muslim memaafkan orang lain, kecuali Allah akan menambahkan kemuliaan baginya.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.", source: "HR. Ahmad", narrator: "Jabir bin Abdullah RA" },
  { text: "Barangsiapa menunjukkan kepada kebaikan, maka ia akan mendapat pahala seperti pahala orang yang mengerjakannya.", source: "HR. Muslim", narrator: "Abu Mas'ud Al-Anshari RA" },
  { text: "Sesungguhnya Allah mencatat kebaikan dan keburukan, lalu menjelaskannya. Barangsiapa berniat mengerjakan kebaikan tapi tidak melakukannya, Allah catat sebagai satu kebaikan sempurna.", source: "HR. Bukhari & Muslim", narrator: "Ibnu Abbas RA" },
  { text: "Tidak beriman seseorang di antara kalian hingga ia mencintai untuk saudaranya apa yang ia cintai untuk dirinya sendiri.", source: "HR. Bukhari & Muslim", narrator: "Anas bin Malik RA" },
  { text: "Sesungguhnya Allah tidak melihat kepada rupa dan harta kalian, tapi Allah melihat kepada hati dan amal kalian.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Orang mukmin yang paling sempurna imannya adalah yang paling baik akhlaknya, dan sebaik-baik kalian adalah yang paling baik kepada istrinya.", source: "HR. Ahmad & Tirmidzi", narrator: "Abu Hurairah RA" },
  { text: "Barangsiapa beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.", source: "HR. Bukhari & Muslim", narrator: "Abu Hurairah RA" },
  { text: "Sesungguhnya Allah Maha Penyantun dan mencintai kesantunan dalam segala urusan.", source: "HR. Bukhari & Muslim", narrator: "Aisyah RA" },
  { text: "Senyumanmu kepada saudaramu adalah sedekah.", source: "HR. Tirmidzi", narrator: "Abu Dharr RA" },
  { text: "Jagalah kewajiban-kewajiban Allah, niscaya Allah menjaga kalian.", source: "HR. Tirmidzi", narrator: "Ibnu Abbas RA" },
  { text: "Sesungguhnya di dalam tubuh ada segumpal daging. Jika ia baik, maka baiklah seluruh tubuh. Jika ia rusak, maka rusaklah seluruh tubuh. Itulah hati.", source: "HR. Bukhari & Muslim", narrator: "Nu'man bin Basyir RA" },
  { text: "Orang yang kuat bukanlah yang pandai bergulat, tapi orang yang kuat adalah yang mampu menahan diri saat marah.", source: "HR. Bukhari & Muslim", narrator: "Abu Hurairah RA" },
  { text: "Barangsiapa menempuh jalan untuk mencari ilmu, Allah akan memudahkan baginya jalan menuju surga.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Sesungguhnya Allah mencintai seseorang yang bila bekerja, ia mengerjakannya dengan ihsan (sebaik-baiknya).", source: "HR. Thabrani", narrator: "Aisyah RA" },
  { text: "Bersedekahlah sebelum datang ujian (kematian) yang menghalangi kalian dari bersedekah.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Doa seorang muslim untuk saudaranya yang tidak hadir adalah doa yang mustajab.", source: "HR. Muslim", narrator: "Abu Darda RA" },
  { text: "Barangsiapa membaca satu huruf dari Kitabullah (Al-Quran), maka baginya satu kebaikan, dan satu kebaikan dilipatgandakan menjadi sepuluh.", source: "HR. Tirmidzi", narrator: "Ibnu Mas'ud RA" },
  { text: "Cukuplah seseorang dikatakan berdusta jika ia menceritakan semua yang ia dengar.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Sesungguhnya halal Allah jelas dan haram Allah jelas. Di antara keduanya ada perkara syubhat. Barangsiapa menjaga diri dari syubhat, ia telah menjaga agama dan kehormatannya.", source: "HR. Bukhari & Muslim", narrator: "Nu'man bin Basyir RA" },
  { text: "Sesungguhnya Allah Maha Baik dan tidak menerima kecuali yang baik.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Bukan termasuk golongan kami siapa yang meratapi mayit, mencakar wajah, dan merobek baju saat kematian.", source: "HR. Bukhari & Muslim", narrator: "Ibnu Mas'ud RA" },
  { text: "Bershabatlah dengan orang yang bersih hatinya, karena mereka adalah orang yang memberi nasihat dengan tulus.", source: "HR. Thabrani", narrator: "Abu Umamah RA" },
  { text: "Barangsiapa mengucapkan astaghfirullah, Allah akan berikan ketenangan dan rezeki dari arah yang tidak disangka-sangka.", source: "HR. Ahmad", narrator: "Ibnu Abbas RA" },
  { text: "Sesungguhnya Allah tidak akan menyiksa orang yang menangis karena takut kepada Allah.", source: "HR. Bukhari", narrator: "Abdullah bin Umar RA" },
  { text: "Tidak ada satu kumpulan yang duduk berdzikir kepada Allah, kecuali malaikat mengelilingi mereka, rahmat turun, dan Allah menyebut mereka di hadapan para malaikat.", source: "HR. Muslim", narrator: "Abu Hurairah RA" },
  { text: "Sesungguhnya rezeki seseorang tidak akan berpindah dari arah yang Allah tetapkan.", source: "HR. Thabrani", narrator: "Abu Sa'id Al-Khudri RA" },
  { text: "Tiada seorang hamba yang memelihara shalat karena Allah, kecuali Allah berikan cahaya di wajahnya, kelapangan hatinya, dan ketenangan jiwa.", source: "HR. Thabrani", narrator: "Abu Hurairah RA" },
];

const DEFAULT_INTERVAL = 60;
const MIN_INTERVAL = 20;
const MAX_INTERVAL = 360;

let intervals = {};

export function startAutoHadith(groupId, sock, db) {
  stopAutoHadith(groupId);
  const cfg = db.data.autoHadith?.[groupId];
  if (!cfg || !cfg.enabled) return;

  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoHadith?.[groupId];
      if (!g || !g.enabled) {
        stopAutoHadith(groupId);
        return;
      }
      const hadith = HADITHS[Math.floor(Math.random() * HADITHS.length)];
      g.lastHadith = hadith.text;
      g.lastSent = Date.now();
      g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();

      const msg = "Hadist Hari Ini:\n\n" + hadith.text + "\n\n" + hadith.source + "\nDari: " + hadith.narrator + "\n\nMode: Otomatis tiap " + g.interval + " menit";

      await sock.sendMessage(groupId, {
        text: novaWrap("Auto Hadith", msg, "info"),
      });
    } catch (e) {
      console.error("[AutoHadith interval]", e);
    }
  }, intervalMs);
}

export function stopAutoHadith(groupId) {
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

    if (!db.data.autoHadith) db.data.autoHadith = {};
    if (!db.data.autoHadith[groupId]) {
      db.data.autoHadith[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastHadith: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoHadith[groupId];

    // ON
    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;

      cfg.enabled = true;
      cfg.interval = interval;
      cfg.activatedBy = sender;
      cfg.activatedAt = Date.now();
      await db.save();

      startAutoHadith(groupId, conn, db);

      return m.reply(novaWrap("Auto Hadith", [
        "Hadist otomatis DIAKTIFKAN!",
        "",
        "Interval: " + interval + " menit",
        "Total hadist tersedia: " + HADITHS.length,
        "",
        "Bot bakal kirim hadist random tiap " + interval + " menit.",
        "Ketik .autohadith off untuk matikan.",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      stopAutoHadith(groupId);

      return m.reply(novaWrap("Auto Hadith", "Hadist otomatis DIMATIKAN.\nKetik .autohadith on untuk aktifkan lagi."));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";

      return m.reply(novaWrap("Auto Hadith", [
        "Status: " + (cfg.enabled ? "*aktif*" : "Nonaktif"),
        "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit",
        "Total terkirim: " + (cfg.totalSent || 0),
        "Terakhir kirim: " + lastSentStr,
        "Hadist tersedia: " + HADITHS.length,
      ]));
    }

    // NOW
    if (sub === "now" || sub === "sekarang") {
      const hadith = HADITHS[Math.floor(Math.random() * HADITHS.length)];
      cfg.lastHadith = hadith.text;
      cfg.lastSent = Date.now();
      cfg.totalSent = (cfg.totalSent || 0) + 1;
      await db.save();

      return m.reply(novaWrap("Auto Hadith", [
        "Hadist:",
        "",
        hadith.text,
        "",
        hadith.source,
        "Dari: " + hadith.narrator,
        "",
        "Total terkirim: " + cfg.totalSent,
      ]));
    }

    // HELP
    return m.reply(novaWrap("Auto Hadith", [
      "Kirim hadist random otomatis tiap interval",
      "",
      "CARA PAKAI:",
      usedPrefix + "autohadith on [menit] — Aktifkan (default 60 menit, min 20, max 360)",
      usedPrefix + "autohadith off — Matikan",
      usedPrefix + "autohadith status — Lihat status",
      usedPrefix + "autohadith now — Kirim hadist sekarang",
      "",
      "CONTOH:",
      usedPrefix + "autohadith on 30",
      usedPrefix + "autohadith off",
    ]));
  } catch (e) {
    console.error("[Auto Hadith]", e);
    m.reply(novaWrap("Auto Hadith", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
