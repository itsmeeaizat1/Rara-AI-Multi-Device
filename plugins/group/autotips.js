// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autotips",
  alias: ["tipsotomatis", "tipsauto", "autotipsharian"],
  category: "group",
  description: "Kirim tips harian random otomatis tiap interval (toggle on/off per grup)",
  usage: ".autotips on [menit] | .autotips off | .autotips status | .autotips now",
  example: ".autotips on 60",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const TIPS = [
  "Tip Kesehatan: Minum air putih minimal 8 gelas sehari untuk menjaga tubuh tetap terhidrasi.",
  "Tip Produktivitas: Gunakan teknik Pomodoro — 25 menit kerja, 5 menit istirahat.",
  "Tip Keuangan: Simpan 20% penghasilan untuk tabungan sebelum mengeluarkan uang lain.",
  "Tip Tidur: Tidur 7-8 jam sehari membantu otak memproses informasi lebih baik.",
  "Tip Makan: Kunyah makanan 20-30 kali sebelum menelan untuk pencernaan optimal.",
  "Tip Olahraga: Jalan kaki 30 menit sehari sudah cukup menjaga kesehatan jantung.",
  "Tip Belajar: Ajarkan apa yang kamu pelajari ke orang lain untuk memperkuat ingatan.",
  "Tip Stres: Tarik napas dalam 4 detik, tahan 4 detik, buang 4 detik. Ulangi 5x.",
  "Tip Sosial: Jaga kontak mata saat berbicara, ini menunjukkan rasa percaya diri.",
  "Tip Teknologi: Matikan notifikasi saat kerja untuk fokus penuh.",
  "Tip Keamanan: Gunakan password berbeda untuk setiap akun penting.",
  "Tip Hemat: Bandingkan harga di 3 toko online sebelum membeli.",
  "Tip Memori: Tulis catatan dengan tangan untuk daya ingat lebih kuat dibanding mengetik.",
  "Tip Pagi: Sinar matahari pagi (15 menit) membantu produksi vitamin D.",
  "Tip Waktu: Prioritaskan tugas paling sulit di pagi hari saat energi paling tinggi.",
  "Tip Komunikasi: Dengarkan lebih banyak dari pada bicara untuk memahami orang lain.",
  "Tip Kafein: Batasi kopi maksimal 2 cangkir sehari untuk hindari gangguan tidur.",
  "Tip Positif: Tulis 3 hal yang kamu syukuri setiap hari untuk tingkatkan mood.",
  "Tip Bersih: Bersihkan HP dan keyboard minimal 1x seminggu, banyak bakteri di sana.",
  "Tip SEO: Gunakan kata kunci di 60 karakter pertama judul untuk SEO lebih baik.",
  "Tip Investasi: Jangan investasi uang yang kamu butuhkan dalam 1 tahun ke depan.",
  "Tip cooking: Tambahkan sedikit gula pada saus tomat untuk kurangi rasa asam.",
  "Tip coding: Komentari kodemu seolah-olah orang yang baca adalah psikopat yang tahu alamatmu.",
  "Tip Darurat: Simpan nomor penting (polisi, rumah sakit, keluarga) di HP dengan nama mudah diingat.",
  "Tip Bahasa: Belajar 5 kata baru bahasa asing setiap hari, dalam setahun kamu kuasai 1825 kata.",
  "Tip Postingan: Foto dengan cahaya natural dari jendela menghasilkan warna terbaik.",
  "Tip Membaca: Baca 10 halaman buku sehari = 1 buku sebulan, 12 buku setahun.",
  "Tip HP: Kurangi brightness layar di malam hari untuk melindungi mata.",
  "Tip Travel: Selalu simpan salinan passport di email dan cloud.",
  "Tip Jantung: Konsumsi kacang-kacangan 4x seminggu menurunkan risiko penyakit jantung.",
  "Tip Anti- Aging: Gunakan tabir surya setiap hari, bahkan saat mendung.",
  "Tip Rambut: Jangan keramas setiap hari, biarkan minyak alami rambut bekerja.",
  "Tip Fokus: Letakkan HP di ruangan lain saat belajar/kerja untuk hindari godaan.",
  "Tip Negosiasi: Diam adalah senjata. Setelah mengajukan harga, diam dan tunggu respons.",
  "Tip Presentasi: Mulai dengan cerita, bukan data. Audiens ingat cerita lebih baik.",
  "Tip Anak: Berikan pujian pada usaha anak, bukan pada hasil. 'Kamu kerja keras' > 'Kamu pintar'.",
  "Tip Dapur: Simpan bawang dan kentang terpisah, bawang membuat kentang cepat busuk.",
  "Tip Meditasi: 5 menit meditasi pagi sama efektifnya dengan 30 menit di sore hari.",
  "Tip Penyimpanan: Simpan pisah setelah dipotong di freezer untuk smoothie instan.",
  "Tip Etika Email: Balas email dalam 24 jam, meski hanya 'Saya akan cek dan balas segera'.",
  "Tip Lilin: Lilin akan bertahan lebih lama jika dimasukkan ke freezer 1 jam sebelum dinyalakan.",
  "Tip Anti-Bau: Letakkan kapur barus di lemari sepatu untuk hilangkan bau.",
  "Tip Tanaman: Air tanaman dengan sisa air cucian beras untuk pupuk alami.",
];

const DEFAULT_INTERVAL = 60;
const MIN_INTERVAL = 20;
const MAX_INTERVAL = 360;

let intervals = {};

export function startAutoTips(groupId, sock, db) {
  stopAutoTips(groupId);
  const cfg = db.data.autoTips?.[groupId];
  if (!cfg || !cfg.enabled) return;
  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoTips?.[groupId];
      if (!g || !g.enabled) { stopAutoTips(groupId); return; }
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      g.lastTip = tip; g.lastSent = Date.now(); g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();
      await sock.sendMessage(groupId, { text: claraWrap("Auto Tips", "Tip Harian:\n\n" + tip + "\n\nMode: Otomatis tiap " + g.interval + " menit", "info") });
    } catch (e) { console.error("[AutoTips interval]", e); }
  }, intervalMs);
}

export function stopAutoTips(groupId) {
  if (intervals[groupId]) { clearInterval(intervals[groupId]); delete intervals[groupId]; }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoTips) db.data.autoTips = {};
    if (!db.data.autoTips[groupId]) {
      db.data.autoTips[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastTip: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoTips[groupId];

    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;
      cfg.enabled = true; cfg.interval = interval; cfg.activatedBy = sender; cfg.activatedAt = Date.now();
      await db.save(); startAutoTips(groupId, conn, db);
      return m.reply(claraWrap("Auto Tips", ["Tips otomatis DIAKTIFKAN!", "", "Interval: " + interval + " menit", "Total tips: " + TIPS.length, "", "Ketik .autotips off untuk matikan.", "Ketik .autotips now untuk kirim sekarang."], "success"));
    }
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false; await db.save(); stopAutoTips(groupId);
      return m.reply(claraWrap("Auto Tips", "Tips otomatis DIMATIKAN.\nKetik .autotips on untuk aktifkan lagi."));
    }
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      return m.reply(claraWrap("Auto Tips", ["Status: " + (cfg.enabled ? "*ᴀᴋᴛɪꜰ*" : "Nonaktif"), "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit", "Total terkirim: " + (cfg.totalSent || 0), "Terakhir kirim: " + lastSentStr, "Tips tersedia: " + TIPS.length]));
    }
    if (sub === "now" || sub === "sekarang") {
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      cfg.lastTip = tip; cfg.lastSent = Date.now(); cfg.totalSent = (cfg.totalSent || 0) + 1; await db.save();
      return m.reply(claraWrap("Auto Tips", ["Tip Harian:", "", tip, "", "Total terkirim: " + cfg.totalSent]));
    }
    return m.reply(claraWrap("Auto Tips", ["Kirim tips harian random otomatis tiap interval", "", "CARA PAKAI:", usedPrefix + "autotips on [menit] — Aktifkan (default 60, min 20, max 360)", usedPrefix + "autotips off — Matikan", usedPrefix + "autotips status — Lihat status", usedPrefix + "autotips now — Kirim sekarang", "", "CONTOH:", usedPrefix + "autotips on 30", usedPrefix + "autotips off"]));
  } catch (e) { console.error("[Auto Tips]", e); m.reply(claraWrap("Auto Tips", "Error: " + e.message)); }
}

export { pluginConfig as config, handler };
