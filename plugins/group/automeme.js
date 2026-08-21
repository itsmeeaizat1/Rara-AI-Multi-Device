// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "automeme",
  alias: ["memeotomatis", "memeauto", "automemes"],
  category: "group",
  description: "Kirim meme text random otomatis tiap interval (toggle on/off per grup)",
  usage: ".automeme on [menit] | .automeme off | .automeme status | .automeme now",
  example: ".automeme on 30",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const MEMES = [
  "Ketika kamu bilang 'aku sudah makan' tapi ibu tetap masak untukmu: Itulah cinta sejati.",
  "Saya: Besok aku belajar.\nBesok: Saya: Besok aku belajar.\nBesoknya: Saya: Besok aku belajar.\nSkripsi: Kapan?",
  "Guru: 'Apa itu kesabaran?'\nSiswa: 'Nunggu kamu pulang, Pak!'\nGuru: '...'",
  " Ketika kamu upload foto bagus tapi 0 like: 'Mungkin foto aku terlalu bagus untuk mereka.'",
  "Pacar: 'Kamu berubah.'\nAku: 'Bukan aku yang berubah, tapi kamu yang bikin aku malas.'",
  "Saya bukan malas, saya sedang charging energi. Tunggu sampe 100%.",
  "Mantra jomblo: 'Sendiri itu bukan kalah, tapi sedang menunggu waktu yang tepat untuk menang.'",
  "Niatnya mau diet, tapi nasinya 3 porsi. 'Ini terakhir kalinya makan' katanya setiap hari.",
  "Ketika kamu ngerasa pinter, tiba-tiba anak SD nanya soal matematika dan kamu: 'Eh, bentar ya aku cek kalkulator.'",
  "Saya: 'Aku gak punya uang.'\nTeman: 'Yuk nongkrong.'\nSaya: 'Tapi aku bisa temenin kamu duduk.'",
  "Ketika kamu buka WhatsApp dan lihat chat kelompok: 'Apa yang terjadi? Kenapa 999+ pesan?'",
  "Mimpi: Jadi orang kaya.\nRealita: Bangun pagi, cek rekening, langsung tidur lagi.",
  "Saya: 'Aku mau produktif hari ini.'\nYouTube: 'Eh, ada video kucing lucu nih.'\nSaya: '...'",
  "Ketika kamu ngerasa sehat, tiba-tiba kamu ingat umurmu 25 tahun dan lutut sudah mulai berbunyi.",
  "Ketika sinyal hilang saat kamu lagi chat sama crush: 'Ini pasti ujian dari Tuhan.'",
  "Mantra produktif: 'Hari ini aku selesaiin semua tugas.'\nRealita: Tidur sampai sore.",
  "Ketika kamu ngerasa dewasa: 'Aku harus bijak.'\n5 menit kemudian: 'Beli mainan anak-anak di minimarket.'",
  "Saya: 'Aku hemat uang.'\nShopee: 'Flash sale!'\nSaya: 'Ini investasi masa depan.'",
  "Ketika kamu ngerasa jago masak: 'Bikin indomie pake telur.' Mantap, level chef.",
  "Ketika temanmu bilang 'aku hamper' padahal kamu tahu dia belum wudhu: 'Sabar... sabar...'",
  "Ketika kamu jadi admin grup tapi gak ngerti kenapa: 'Mungkin karena aku yang paling sering online.'",
  "Saya: 'Aku gak sombong.'\nOrang: 'Hai.'\nSaya: (Lihat, tapi gak balas.)",
  "Ketika kamu bilang 'aku gak bakal beli lagi' tapi 1 jam kemudian: 'Eh, ada diskon lagi.'",
  "Pertanyaan: Kenapa kamu gak punya pacar?\nJawaban: Karena aku gak punya nomor antrian.",
  "Ketika kamu ngerasa kuat: 'Aku bisa lewatin semua masalah.'\nMasalah: 'Kamu lupa bayar WiFi.'\nAku: '...'",
  "Saya: 'Aku besok olahraga.'\nBesok: Hujan.\nSaya: 'Alam sudah bilang jangan.'",
  "Ketika kamu mau serius tapi ingatanmu: 'Ada meme yang lucu tadi.'",
  "Ketika kamu ngerasa jago main game tapi dikalahkan anak 10 tahun: 'Aku mainnya sambil mungkin.'",
  "Ketika kamu ngerasa muda tapi ingat umurmu: 'Aku masih 20-an kok... 20-an tahun yang lalu.'",
  "Ketika kamu makan enak tapi ingat tagihan: 'Makan ini terakhir kalinya... sampai besok.'",
  "Mantra kerja: 'Aku kerja keras untuk masa depan.'\nGaji masuk: 'Masa depan bisa nunggu, beli jajan dulu.'",
  "Ketika kamu ngerasa pandai: 'Aku bisa jawab soal apapun.'\nSoal: 'Berapa 7 x 8?'\nKamu: 'Bentar, aku buka kalkulator.'",
  "Ketika sinyal 4G tapi loading kayak 2G: 'Ini namanya 4G-G-G-G-G...'",
  "Ketika kamu ngerasa cool tapi ketemu mantan: 'Aku baik-baik saja.' (sambil nangis dalam hati)",
  "Ketika kamu bilang 'aku diet' tapi makan malam: 'Ini cheating day, boleh kok.'",
  "Saya: 'Aku mandiri.'\nIbu: 'Beliin kamu gula ya?'\nSaya: 'Boleh, Mak.'",
  "Ketika kamu ngerasa dewasa tapi masih takut gelap: 'Ini namanya waspada.'",
  "Ketika kamu bilang 'aku gak nonton drama Korea' tapi 3 jam kemudian: 'Oppa...'",
  "Saya: 'Aku hemat baterai HP.'\nHP: '10% tersisa.'\nSaya: 'Tapi aku masih scroll TikTok.'",
  "Ketika kamu ngerasa pintar tapi lupa nama teman sendiri: 'Eh... kamu siapa ya?'",
  "Ketika kamu mau produktif tapi HP: 'Battery 5%.'\nSaya: 'Oke, besok saja.'",
];

const DEFAULT_INTERVAL = 30;
const MIN_INTERVAL = 10;
const MAX_INTERVAL = 180;

let intervals = {};

export function startAutoMeme(groupId, sock, db) {
  stopAutoMeme(groupId);
  const cfg = db.data.autoMeme?.[groupId];
  if (!cfg || !cfg.enabled) return;

  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoMeme?.[groupId];
      if (!g || !g.enabled) { stopAutoMeme(groupId); return; }
      const meme = MEMES[Math.floor(Math.random() * MEMES.length)];
      g.lastMeme = meme;
      g.lastSent = Date.now();
      g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();

      await sock.sendMessage(groupId, {
        text: claraWrap("Auto Meme", meme + "\n\nMode: Otomatis tiap " + g.interval + " menit", "info"),
      });
    } catch (e) { console.error("[AutoMeme interval]", e); }
  }, intervalMs);
}

export function stopAutoMeme(groupId) {
  if (intervals[groupId]) { clearInterval(intervals[groupId]); delete intervals[groupId]; }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoMeme) db.data.autoMeme = {};
    if (!db.data.autoMeme[groupId]) {
      db.data.autoMeme[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastMeme: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoMeme[groupId];

    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;
      cfg.enabled = true; cfg.interval = interval; cfg.activatedBy = sender; cfg.activatedAt = Date.now();
      await db.save();
      startAutoMeme(groupId, conn, db);
      return m.reply(claraWrap("Auto Meme", ["Meme otomatis DIAKTIFKAN!", "", "Interval: " + interval + " menit", "Total meme: " + MEMES.length, "", "Ketik .automeme off untuk matikan.", "Ketik .automeme now untuk kirim sekarang."], "success"));
    }
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false; await db.save(); stopAutoMeme(groupId);
      return m.reply(claraWrap("Auto Meme", "Meme otomatis DIMATIKAN.\nKetik .automeme on untuk aktifkan lagi."));
    }
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      return m.reply(claraWrap("Auto Meme", ["Status: " + (cfg.enabled ? "*AKTIF*" : "Nonaktif"), "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit", "Total terkirim: " + (cfg.totalSent || 0), "Terakhir kirim: " + lastSentStr, "Meme tersedia: " + MEMES.length]));
    }
    if (sub === "now" || sub === "sekarang") {
      const meme = MEMES[Math.floor(Math.random() * MEMES.length)];
      cfg.lastMeme = meme; cfg.lastSent = Date.now(); cfg.totalSent = (cfg.totalSent || 0) + 1; await db.save();
      return m.reply(claraWrap("Auto Meme", [meme, "", "Total terkirim: " + cfg.totalSent]));
    }
    return m.reply(claraWrap("Auto Meme", ["Kirim meme text random otomatis tiap interval", "", "CARA PAKAI:", usedPrefix + "automeme on [menit] — Aktifkan (default 30, min 10, max 180)", usedPrefix + "automeme off — Matikan", usedPrefix + "automeme status — Lihat status", usedPrefix + "automeme now — Kirim sekarang", "", "CONTOH:", usedPrefix + "automeme on 15", usedPrefix + "automeme off"]));
  } catch (e) { console.error("[Auto Meme]", e); m.reply(claraWrap("Auto Meme", "Error: " + e.message)); }
}

export { pluginConfig as config, handler };
