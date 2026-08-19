// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autodoa",
  alias: ["doaotomatis", "doaauto", "autodailydoa"],
  category: "group",
  description: "Kirim doa harian random otomatis tiap interval (toggle on/off per grup)",
  usage: ".autodoa on [menit] | .autodoa off | .autodoa status | .autodoa now",
  example: ".autodoa on 120",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const DOAS = [
  { title: "Doa Bangun Tidur", arabic: "اَلْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", latin: "Alhamdulillahil-ladzi ahyana ba'da ma amatana wa ilaihin-nusyur", indo: "Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan." },
  { title: "Doa Keluar Rumah", arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", latin: "Bismillahi tawakkaltu 'alallah, la haula wa la quwwata illa billah", indo: "Dengan nama Allah, aku bertawakal kepada Allah. Tidak ada daya dan kekuatan kecuali dengan Allah." },
  { title: "Doa Sebelum Makan", arabic: "اَللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ", latin: "Allahumma barik lana fima razaqtana wa qina 'adzaban-nar", indo: "Ya Allah, berkahilah kami dalam rezeki yang Engkau berikan dan lindungilah kami dari siksa api neraka." },
  { title: "Doa Sesudah Makan", arabic: "اَلْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ", latin: "Alhamdulillahil-ladzi ath'amana wa saqana wa ja'alana muslimin", indo: "Segala puji bagi Allah yang memberi makan dan minum, serta menjadikan kami muslim." },
  { title: "Doa Masuk Masjid", arabic: "اَللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ", latin: "Allahummaftah li abwaba rahmatik", indo: "Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu." },
  { title: "Doa Keluar Masjid", arabic: "اَللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ", latin: "Allahumma inni as'aluka min fadhlik", indo: "Ya Allah, sesungguhnya aku memohon kepada-Mu dari karunia-Mu." },
  { title: "Doa Sebelum Tidur", arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", latin: "Bismika Allahumma amutu wa ahya", indo: "Dengan nama-Mu ya Allah, aku mati dan aku hidup." },
  { title: "Doa Naik Kendaraan", arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ", latin: "Subhanal-ladzi sakhkhara lana hadza wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun", indo: "Maha Suci Allah yang menundukkan kendaraan ini untuk kami, padahal kami tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami." },
  { title: "Doa Untuk Kedua Orang Tua", arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", latin: "Rabbighfir li wa liwalidayya warhamhuma kama rabbayani shaghira", indo: "Ya Tuhanku, ampunilah aku dan kedua orang tuaku, dan sayangilah mereka seperti mereka menyayangiku di waktu kecil." },
  { title: "Doa Kebijaksanaan", arabic: "رَبِّ زِدْنِي عِلْمًا", latin: "Rabbi zidni 'ilma", indo: "Ya Tuhanku, tambahkanlah ilmu kepadaku." },
  { title: "Doa Perlindungan dari Dosa", arabic: "اَللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ", latin: "Allahumma inni a'udzu bika minal-'ajzi wal-kasal", indo: "Ya Allah, aku berlindung kepada-Mu dari sifat lemah dan malas." },
  { title: "Doa Kesabaran", arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا", latin: "Rabbana afrigh 'alaina sabran wa tsabbit aqdamana", indo: "Ya Tuhan kami, curahkanlah kesabaran atas kami dan teguhkanlah pendirian kami." },
  { title: "Doa Perlindungan dari Harta yang Tidak Bermanfaat", arabic: "اَللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ", latin: "Allahumma inni a'udzu bika min 'ilmin la yanfa'", indo: "Ya Allah, aku berlindung kepada-Mu dari ilmu yang tidak bermanfaat." },
  { title: "Doa Sebelum Wudhu", arabic: "اَللَّهُمَّ اغْفِرْ لِي ذَنْبِي وَوَسِّعْ لِي فِي دَارِي", latin: "Allahummaghfir li dzanbi wa wassi' li fi dari", indo: "Ya Allah, ampunilah dosaku dan lapangkanlah tempat tinggalku." },
  { title: "Doa Pagi Hari", arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", latin: "Asbahna wa asbahal-mulku lillah", indo: "Kami memasuki waktu pagi dan kerajaan hanya milik Allah." },
  { title: "Doa Sore Hari", arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ", latin: "Amsayna wa amsal-mulku lillah", indo: "Kami memasuki waktu sore dan kerajaan hanya milik Allah." },
  { title: "Doa Untuk Anak", arabic: "رَبِّ هَبْ لِي مِنْ لَدُنْكَ ذُرِّيَّةً طَيِّبَةً", latin: "Rabbi hab li min ladunka dzurriyyatan thayyibah", indo: "Ya Tuhanku, berilah aku keturunan yang baik dari sisi-Mu." },
  { title: "Doa Pengampunan", arabic: "رَبِّ اغْفِرْ وَارْحَمْ وَأَنْتَ خَيْرُ الرَّاحِمِينَ", latin: "Rabbighfir warham wa anta khairur-rahimin", indo: "Ya Tuhanku, ampunilah dan sayangilah, Engkaulah Yang Maha Penyayang." },
  { title: "Doa Rezeki", arabic: "اَللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", latin: "Allahumma kfini bihalalika 'an haramik wa aghnini bifadhlika 'amman siwak", indo: "Ya Allah, cukupkanlah aku dengan yang halal dari yang haram, dan kayakan aku dengan karunia-Mu dari selain-Mu." },
  { title: "Doa Perlindungan dari Godaan Setan", arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", latin: "A'udzu billahi minasy-syaithanir-rajim", indo: "Aku berlindung kepada Allah dari godaan setan yang terkutuk." },
  { title: "Doa Ketika Susah", arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", latin: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin", indo: "Tidak ada Tuhan selain Engkau, Maha Suci Engkau, sesungguhnya aku termasuk orang yang zalim." },
  { title: "Doa Syukur", arabic: "اَلْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ", latin: "Alhamdulillahi 'ala kulli hal", indo: "Segala puji bagi Allah dalam setiap keadaan." },
  { title: "Doa Keselamatan Dunia dan Akhirat", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", latin: "Rabbana atina fid-dunya hasanah, wa fil-akhirati hasanah, wa qina 'adzaban-nar", indo: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari siksa api neraka." },
  { title: "Doa Kebaikan", arabic: "اَللَّهُمَّ اهْدِنِي لِأَحْسَنِ الْأَعْمَالِ وَأَحْسَنِ الْأَخْلَاقِ", latin: "Allahummahdini li-ahsanil-a'mal wa ahsanil-akhlaq", indo: "Ya Allah, berilah aku petunjuk untuk amal dan akhlak yang paling baik." },
  { title: "Doa Perlindungan Diri", arabic: "اَللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي", latin: "Allahummahfadhni min bayni yadayya wa min khalfi", indo: "Ya Allah, lindungilah aku dari depan dan dari belakangku." },
];

const DEFAULT_INTERVAL = 120;
const MIN_INTERVAL = 30;
const MAX_INTERVAL = 720;

let intervals = {};

export function startAutoDoa(groupId, sock, db) {
  stopAutoDoa(groupId);
  const cfg = db.data.autoDoa?.[groupId];
  if (!cfg || !cfg.enabled) return;
  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoDoa?.[groupId];
      if (!g || !g.enabled) { stopAutoDoa(groupId); return; }
      const doa = DOAS[Math.floor(Math.random() * DOAS.length)];
      g.lastDoa = doa.title; g.lastSent = Date.now(); g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();
      const msg = doa.title + "\n\n" + doa.arabic + "\n\n" + doa.latin + "\n\n" + doa.indo + "\n\nMode: Otomatis tiap " + g.interval + " menit";
      await sock.sendMessage(groupId, { text: claraWrap("Auto Doa", msg, "info") });
    } catch (e) { console.error("[AutoDoa interval]", e); }
  }, intervalMs);
}

export function stopAutoDoa(groupId) {
  if (intervals[groupId]) { clearInterval(intervals[groupId]); delete intervals[groupId]; }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoDoa) db.data.autoDoa = {};
    if (!db.data.autoDoa[groupId]) {
      db.data.autoDoa[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastDoa: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoDoa[groupId];

    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;
      cfg.enabled = true; cfg.interval = interval; cfg.activatedBy = sender; cfg.activatedAt = Date.now();
      await db.save(); startAutoDoa(groupId, conn, db);
      return m.reply(claraWrap("Auto Doa", ["Doa otomatis DIAKTIFKAN!", "", "Interval: " + interval + " menit", "Total doa: " + DOAS.length, "", "Ketik .autodoa off untuk matikan.", "Ketik .autodoa now untuk kirim sekarang."], "success"));
    }
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false; await db.save(); stopAutoDoa(groupId);
      return m.reply(claraWrap("Auto Doa", "Doa otomatis DIMATIKAN.\nKetik .autodoa on untuk aktifkan lagi."));
    }
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      return m.reply(claraWrap("Auto Doa", ["Status: " + (cfg.enabled ? "*AKTIF*" : "Nonaktif"), "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit", "Total terkirim: " + (cfg.totalSent || 0), "Terakhir kirim: " + lastSentStr, "Doa terakhir: " + (cfg.lastDoa || "Belum ada")]));
    }
    if (sub === "now" || sub === "sekarang") {
      const doa = DOAS[Math.floor(Math.random() * DOAS.length)];
      cfg.lastDoa = doa.title; cfg.lastSent = Date.now(); cfg.totalSent = (cfg.totalSent || 0) + 1; await db.save();
      return m.reply(claraWrap("Auto Doa", [doa.title, "", doa.arabic, "", doa.latin, "", doa.indo, "", "Total terkirim: " + cfg.totalSent]));
    }
    return m.reply(claraWrap("Auto Doa", ["Kirim doa harian random otomatis tiap interval", "", "CARA PAKAI:", usedPrefix + "autodoa on [menit] — Aktifkan (default 120, min 30, max 720)", usedPrefix + "autodoa off — Matikan", usedPrefix + "autodoa status — Lihat status", usedPrefix + "autodoa now — Kirim sekarang", "", "CONTOH:", usedPrefix + "autodoa on 60", usedPrefix + "autodoa off"]));
  } catch (e) { console.error("[Auto Doa]", e); m.reply(claraWrap("Auto Doa", "Error: " + e.message)); }
}

export { pluginConfig as config, handler };
