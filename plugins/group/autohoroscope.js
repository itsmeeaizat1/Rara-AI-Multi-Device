// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autohoroscope",
  alias: ["autohoroscope", "horoscopeotomatis", "horoscopeauto", "zodiakauto", "autozodiak"],
  category: "group",
  description: "Kirim ramalan zodiak random otomatis tiap interval (toggle on/off per grup)",
  usage: ".autohoroscope on [menit] | .autohoroscope off | .autohoroscope status | .autohoroscope now",
  example: ".autohoroscope on 120",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const ZODIACS = [
  { name: "Aries", dates: "21 Mar - 19 Apr", element: "Api", traits: "Berani, energetik, impulsif" },
  { name: "Taurus", dates: "20 Apr - 20 Mei", element: "Bumi", traits: "Setia, sabar, keras kepala" },
  { name: "Gemini", dates: "21 Mei - 20 Jun", element: "Udara", traits: "Cerdas, komunikatif, dua sisi" },
  { name: "Cancer", dates: "21 Jun - 22 Jul", element: "Air", traits: "Perasa, loyal, sensitif" },
  { name: "Leo", dates: "23 Jul - 22 Agu", element: "Api", traits: "Percaya diri, pemimpin, dramatis" },
  { name: "Virgo", dates: "23 Agu - 22 Sep", element: "Bumi", traits: "Analitis, perfeksionis, kritis" },
  { name: "Libra", dates: "23 Sep - 22 Okt", element: "Udara", traits: "Seimbang, adil, ragu-ragu" },
  { name: "Scorpio", dates: "23 Okt - 21 Nov", element: "Air", traits: "Intens, misterius, pendendam" },
  { name: "Sagittarius", dates: "22 Nov - 21 Des", element: "Api", traits: "Petualang, bebas, blak-blakan" },
  { name: "Capricorn", dates: "22 Des - 19 Jan", element: "Bumi", traits: "Ambisius, disiplin, kaku" },
  { name: "Aquarius", dates: "20 Jan - 18 Feb", element: "Udara", traits: "Unik, visioner, dingin" },
  { name: "Pisces", dates: "19 Feb - 20 Mar", element: "Air", traits: "Kreatif, empatik, mimpi" },
];

const HOROSCOPES = [
  "Hari ini membawa energi positif untukmu. Kesempatan akan datang dari arah yang tak disangka. Tetap terbuka.",
  "Mungkin ada rintangan kecil hari ini, tapi kamu punya kekuatan untuk melewatinya. Jangan menyerah.",
  "Seseorang di sekitarmu mungkin butuh bantuanmu. Jangan ragu untuk ulurkan tangan.",
  "Waktu untuk introspeksi. Ambil jeda sejenak dan pikirkan langkah selanjutnya.",
  "Hari ini cocok untuk memulai hal baru. Jangan takut keluar dari zona nyaman.",
  "Pertemuan tak terduga akan membawa keberuntungan. Perhatikan orang di sekitarmu.",
  "Kesehatanmu perlu perhatian hari ini. Jangan abaikan tanda-tanda tubuhmu.",
  "Keuangan terlihat stabil, tapi hindari pengeluaran impulsif. Simpan untuk nanti.",
  "Komunikasi adalah kunci hari ini. Sampaikan perasaanmu dengan jelas dan tenang.",
  "Kreativitas sedang di puncak. Manfaatkan untuk menyelesaikan proyek atau mulai yang baru.",
  "Hari ini mungkin terasa berat, tapi ingat: setiap badai pasti berlalu. Tetap kuat.",
  "Kesempatan karir menanti. Jangan ragu untuk ambil risiko yang diperhitungkan.",
  "Hubungan seseorang yang dekat denganmu akan menjadi lebih hangat. Jaga baik-baik.",
  "Pesan dari seseorang yang belum lama menghubungimu akan membawa kabar baik.",
  "Hari ini cocok untuk belajar hal baru. Pengetahuan akan membuka pintu tak terduga.",
  "Ingatan masa lalu mungkin muncul hari ini. Hadapi dengan tenang dan belajar darinya.",
  "Keberuntungan ada di pihakmu hari ini. Manfaatkan untuk hal-hal yang penting.",
  "Kelelahan mungkin menghampiri. Luangkan waktu untuk istirahat dan recharge.",
  "Seseorang akan mengajakmu bekerja sama. Pertimbangkan dengan matang sebelum setuju.",
  "Intuisimu akan sangat kuat hari ini. Dengarkan suara hatimu untuk keputusan penting.",
  "Hari ini adalah hari yang tepat untuk memaafkan. Lepaskan beban yang kamu bawa.",
  "Kesempatan finansial datang dari teman dekat. Pertimbangkan tawaran yang masuk.",
  "Hari ini kamu akan menemukan solusi untuk masalah lama. Pikiran segar membantu.",
  "Sosial media bisa membawa inspirasi hari ini. Tapi batasi waktu layar untuk kesehatan.",
  "Hari ini mungkin membawa tantangan, tapi kamu akan keluar lebih kuat dari sebelumnya.",
  "Jangan terburu-buru mengambil keputusan hari ini. Ambil waktu untuk berpikir.",
  "Pekerjaan kerasmu akan diakui. Tetap konsisten dan hasil akan datang.",
  "Hari ini membawa momen kebahagiaan kecil. Nikmati setiap detiknya.",
  "Seseorang akan memberimu komplimen tulus. Terima dengan rendah hati.",
  "Energi hari ini mendukung aktivitas fisik. Olahraga atau jalan-jalan akan menyegarkan.",
];

const DEFAULT_INTERVAL = 120;
const MIN_INTERVAL = 30;
const MAX_INTERVAL = 720;

let intervals = {};

export function startAutoHoroscope(groupId, sock, db) {
  stopAutoHoroscope(groupId);
  const cfg = db.data.autoHoroscope?.[groupId];
  if (!cfg || !cfg.enabled) return;
  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoHoroscope?.[groupId];
      if (!g || !g.enabled) { stopAutoHoroscope(groupId); return; }
      const zodiac = ZODIACS[Math.floor(Math.random() * ZODIACS.length)];
      const horoscope = HOROSCOPES[Math.floor(Math.random() * HOROSCOPES.length)];
      g.lastZodiac = zodiac.name; g.lastHoroscope = horoscope; g.lastSent = Date.now(); g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();
      const msg = "Zodiak Hari Ini: " + zodiac.name + "\nPeriode: " + zodiac.dates + "\nElemen: " + zodiac.element + "\nSifat: " + zodiac.traits + "\n\nRamalan: " + horoscope + "\n\nMode: Otomatis tiap " + g.interval + " menit";
      await sock.sendMessage(groupId, { text: claraWrap("Auto Horoscope", msg, "info") });
    } catch (e) { console.error("[AutoHoroscope interval]", e); }
  }, intervalMs);
}

export function stopAutoHoroscope(groupId) {
  if (intervals[groupId]) { clearInterval(intervals[groupId]); delete intervals[groupId]; }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoHoroscope) db.data.autoHoroscope = {};
    if (!db.data.autoHoroscope[groupId]) {
      db.data.autoHoroscope[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastZodiac: null, lastHoroscope: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoHoroscope[groupId];

    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;
      cfg.enabled = true; cfg.interval = interval; cfg.activatedBy = sender; cfg.activatedAt = Date.now();
      await db.save(); startAutoHoroscope(groupId, conn, db);
      return m.reply(claraWrap("Auto Horoscope", ["Ramalan zodiak otomatis DIAKTIFKAN!", "", "Interval: " + interval + " menit", "12 zodiak, " + HOROSCOPES.length + " ramalan", "", "Ketik .autohoroscope off untuk matikan.", "Ketik .autohoroscope now untuk kirim sekarang."], "success"));
    }
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false; await db.save(); stopAutoHoroscope(groupId);
      return m.reply(claraWrap("Auto Horoscope", "Ramalan zodiak otomatis DIMATIKAN.\nKetik .autohoroscope on untuk aktifkan lagi."));
    }
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      return m.reply(claraWrap("Auto Horoscope", ["Status: " + (cfg.enabled ? "*ᴀᴋᴛɪꜰ*" : "Nonaktif"), "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit", "Total terkirim: " + (cfg.totalSent || 0), "Terakhir kirim: " + lastSentStr, "Zodiak terakhir: " + (cfg.lastZodiac || "Belum ada")]));
    }
    if (sub === "now" || sub === "sekarang") {
      const zodiac = ZODIACS[Math.floor(Math.random() * ZODIACS.length)];
      const horoscope = HOROSCOPES[Math.floor(Math.random() * HOROSCOPES.length)];
      cfg.lastZodiac = zodiac.name; cfg.lastHoroscope = horoscope; cfg.lastSent = Date.now(); cfg.totalSent = (cfg.totalSent || 0) + 1;
      await db.save();
      return m.reply(claraWrap("Auto Horoscope", ["Zodiak: " + zodiac.name, "Periode: " + zodiac.dates, "Elemen: " + zodiac.element, "Sifat: " + zodiac.traits, "", "Ramalan: " + horoscope, "", "Total terkirim: " + cfg.totalSent]));
    }
    return m.reply(claraWrap("Auto Horoscope", ["Kirim ramalan zodiak random otomatis tiap interval", "", "CARA PAKAI:", usedPrefix + "autohoroscope on [menit] — Aktifkan (default 120, min 30, max 720)", usedPrefix + "autohoroscope off — Matikan", usedPrefix + "autohoroscope status — Lihat status", usedPrefix + "autohoroscope now — Kirim sekarang", "", "CONTOH:", usedPrefix + "autohoroscope on 60", usedPrefix + "autohoroscope off"]));
  } catch (e) { console.error("[Auto Horoscope]", e); m.reply(claraWrap("Auto Horoscope", "Error: " + e.message)); }
}

export { pluginConfig as config, handler };
