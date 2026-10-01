// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "autoquestion",
  alias: ["autoquestion"],
  category: "group",
  description: "Kirim pertanyaan seru random otomatis untuk bikin grup aktif (toggle on/off)",
  usage: ".autoquestion on [menit] | .autoquestion off | .autoquestion status | .autoquestion now",
  example: ".autoquestion on 30",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const QUESTIONS = [
  "Kalau kamu bisa waktu travel ke masa lalu, ke zaman apa kamu mau dan kenapa?",
  "Apa hal paling gak masuk akal yang pernah kamu lakuin?",
  "Kalau kamu bisa punya 1 superpower, apa itu dan buat apa?",
  "Siapa orang yang paling berpengaruh dalam hidupmu? Ceritain dong.",
  "Kalau kamu bisa makan 1 makanan selamanya, apa itu?",
  "Apa ketakutan terbesar yang kamu gak pernah ceritain ke siapapun?",
  "Kalau kamu bisa hapus 1 memori dari otakmu, itu memori apa?",
  "Kalau besok kiamat, 3 hal apa yang mau kamu lakuin hari ini?",
  "Apa impian yang paling gila yang masih kamu simpen sampai sekarang?",
  "Kalau kamu bisa ganti 1 hal di dirimu, itu apa?",
  "Apa kebiasaan orang yang paling bikin kamu kesel?",
  "Kalau kamu bisa hidup di negara mana aja, kamu pilih mana?",
  "Apa lagu yang kalau kamu denger, langsung ingat momen tertentu?",
  "Kalau kamu jadi president 1 hari, aturan pertama yang kamu buat apa?",
  "Apa hal paling berani yang pernah kamu lakuin?",
  "Kalau kamu bisa ketemu dirimu 10 tahun lalu, nasihat apa yang mau kamu kasih?",
  "Aap cinta pertamamu? Masih ingat namanya?",
  "Kalau kamu gak perlu kerja untuk uang, kamu mau jadi apa?",
  "Apa skill yang kamu bangga punya tapi gak pernah dipakai di kerjaan?",
  "Kalau kamu bisa masuk ke dunia film mana, kamu pilih yang mana?",
  "Aap pendapatmu soal 'akhir bahagia'? Itu mitos atau nyata?",
  "Kalau kamu bisa hapus 1 app dari HP semua orang, itu apa?",
  "Apa hal kecil yang bikin kamu happy tapi gak pernah kamu ceritain?",
  "Kalau kamu gak bisa lagi pakai social media 1 tahun, apa yang bakal kamu lakuin?",
  "Apa momen paling cringe yang pernah kamu alami tapi sekarang jadi lucu?",
  "Kalau kamu bisa ulang 1 hari di hidupmu, hari apa itu?",
  "Aap pendapatmu soal 'minta maaf lebih dulu'? Weak atau strong?",
  "Kalau kamu bisa kirim 1 pesan ke semua orang di dunia, itu apa?",
  "Aap talenta tersembunyi yang kamu belum eksplor?",
  "Kalau kamu bisa tahu kapan kamu meninggal, kamu mau tahu atau gak?",
  "Apa hal paling nepal yang pernah kamu beli tapi gak pernah dipakai?",
  "Kalau kamu bisa jadi ahli di 1 bidang dalam semalam, itu bidang apa?",
  "Apa yang bikin kamu tetap semangat waktu lagi down?",
  "Kalau kamu bisa panggil 1 orang yang udah meninggal untuk ngobrol 1 jam, siapa?",
  "Aap hal yang menurutmu 'biasa aja' tapi orang lain anggap luar biasa?",
  "Kalau kamu diberi 1 milyar tapi gak boleh nabung, kamu beli apa?",
  "Apa kebiasaan kecil yang kamu lakuin tiap hari tapi gak sadar?",
  "Kalau kamu bisa jadi karakter di novel/film mana, kamu pilih siapa?",
  "Apa momen di hidup yang bikin kamu merasa 'aku gak akan pernah lupakan ini'?",
  "Kalau kamu bisa atur ulang sistem pendidikan, apa yang kamu ubah pertama?",
  "Apa pendapatmu soal 'lebih baik sendiri daripada temen toxic'?",
  "Kalau kamu bisa stop 1 trend di dunia, itu apa?",
  "Apa hal yang kamu pelajari dari kegagalan terbesarmu?",
  "Kalau kamu bisa tanya 1 hal ke Tuhan, itu apa?",
  "Apa definisi 'sukses' menurutmu sekarang vs 5 tahun lalu?",
];

const DEFAULT_INTERVAL = 30;
const MIN_INTERVAL = 10;
const MAX_INTERVAL = 180;

let intervals = {};

export function startAutoQuestion(groupId, sock, db) {
  stopAutoQuestion(groupId);
  const cfg = db.data.autoQuestion?.[groupId];
  if (!cfg || !cfg.enabled) return;
  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoQuestion?.[groupId];
      if (!g || !g.enabled) { stopAutoQuestion(groupId); return; }
      const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      g.lastQuestion = question; g.lastSent = Date.now(); g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();
      await sock.sendMessage(groupId, { text: raraWrap("Auto Question", "Pertanyaan Grup:\n\n" + question + "\n\nJawab di grup, siapa tahu ada yang sepemikiran!\n\nMode: Otomatis tiap " + g.interval + " menit", "info") });
    } catch (e) { console.error("[AutoQuestion interval]", e); }
  }, intervalMs);
}

export function stopAutoQuestion(groupId) {
  if (intervals[groupId]) { clearInterval(intervals[groupId]); delete intervals[groupId]; }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoQuestion) db.data.autoQuestion = {};
    if (!db.data.autoQuestion[groupId]) {
      db.data.autoQuestion[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastQuestion: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoQuestion[groupId];

    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;
      cfg.enabled = true; cfg.interval = interval; cfg.activatedBy = sender; cfg.activatedAt = Date.now();
      await db.save(); startAutoQuestion(groupId, conn, db);
      return m.reply(raraWrap("Auto Question", ["Pertanyaan otomatis DIAKTIFKAN!", "", "Interval: " + interval + " menit", "Total pertanyaan: " + QUESTIONS.length, "", "Ketik .autoquestion off untuk matikan.", "Ketik .autoquestion now untuk kirim sekarang."], "success"));
    }
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false; await db.save(); stopAutoQuestion(groupId);
      return m.reply(raraWrap("Auto Question", "Pertanyaan otomatis DIMATIKAN.\nKetik .autoquestion on untuk aktifkan lagi."));
    }
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      return m.reply(raraWrap("Auto Question", ["Status: " + (cfg.enabled ? "*aktif*" : "Nonaktif"), "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit", "Total terkirim: " + (cfg.totalSent || 0), "Terakhir kirim: " + lastSentStr, "Pertanyaan tersedia: " + QUESTIONS.length]));
    }
    if (sub === "now" || sub === "sekarang") {
      const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      cfg.lastQuestion = question; cfg.lastSent = Date.now(); cfg.totalSent = (cfg.totalSent || 0) + 1; await db.save();
      return m.reply(raraWrap("Auto Question", ["Pertanyaan Grup:", "", question, "", "Jawab di grup, siapa tahu ada yang sepemikiran!", "", "Total terkirim: " + cfg.totalSent]));
    }
    return m.reply(raraWrap("Auto Question", ["Kirim pertanyaan seru random otomatis tiap interval", "", "CARA PAKAI:", usedPrefix + "autoquestion on [menit] — Aktifkan (default 30, min 10, max 180)", usedPrefix + "autoquestion off — Matikan", usedPrefix + "autoquestion status — Lihat status", usedPrefix + "autoquestion now — Kirim sekarang", "", "CONTOH:", usedPrefix + "autoquestion on 15", usedPrefix + "autoquestion off"]));
  } catch (e) { console.error("[Auto Question]", e); m.reply(raraWrap("Auto Question", "Error: " + e.message)); }
}

export { pluginConfig as config, handler };
