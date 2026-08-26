// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autochallenge",
  alias: ["autochallenge", "challengeotomatis", "challengeauto", "autochallange"],
  category: "group",
  description: "Bot kasih challenge random ke grup otomatis (tebak, truth/dare, mini game)",
  usage: ".autochallenge on [menit] | .autochallenge off | .autochallenge status | .autochallenge now",
  example: ".autochallenge on 45",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const CHALLENGES = [
  { type: "tebak", text: "Tebak: Aku punya kaki tapi gak bisa jalan, punya punggung tapi gak bisa bungkuk. Apa aku?", answer: "kursi" },
  { type: "tebak", text: "Tebak: Semakin kau ambil, semakin besar lubangnya. Apa aku?", answer: "lubang" },
  { type: "tebak", text: "Tebak: Aku selalu di depanmu tapi gak bisa kau lihat. Apa aku?", answer: "masa depan" },
  { type: "tebak", text: "Tebak: Semakin lama berdiri, semakin pendek. Apa aku?", answer: "lilin" },
  { type: "tebak", text: "Tebak: Punya tangan tapi gak bisa tepuk, punya muka tapi gak bisa senyum. Apa aku?", answer: "jam" },
  { type: "tebak", text: "Tebak: Apa yang naik tapi gak pernah turun?", answer: "umur" },
  { type: "tebak", text: "Tebak: Apa yang punya leher tapi gak punya kepala?", answer: "botol" },
  { type: "tebak", text: "Tebak: Jatuh dari tinggi 10 lantai gak apa-apa, tapi jatuh di tempat sampah bikin kesel. Apa aku?", answer: "kertas" },
  { type: "truth", text: "Truth: Ceritakan momen paling memalukan yang pernah kamu alami di grup ini!" },
  { type: "truth", text: "Truth: Siapa member grup yang paling sering kamu stalk di WhatsApp?" },
  { type: "truth", text: "Truth: Apa rahasia yang belum pernah kamu ceritakan ke siapapun di grup ini?" },
  { type: "truth", text: "Truth: Kapan terakhir kamu nangis dan kenapa?" },
  { type: "truth", text: "Truth: Siapa di grup ini yang menurutmu paling annoying? Jujur!" },
  { type: "truth", text: "Truth: Apa hal paling bodoh yang pernah kamu lakukan demi cinta?" },
  { type: "dare", text: "Dare: Kirim voice note nyanyi lagu nasional di grup ini sekarang!" },
  { type: "dare", text: "Dare: Ketik 'AKU GANTENG/CANTIK BANGET' 10x dengan penuh keyakinan!" },
  { type: "dare", text: "Dare: Ganti profile picture jadi meme lucu selama 1 jam!" },
  { type: "dare", text: "Dare: Kirim foto selfie dengan ekspresi paling aneh ke grup!" },
  { type: "dare", text: "Dare: Praise member acak di grup dengan puitis selama 3 baris!" },
  { type: "dare", text: "Dare: Cerita pengalaman horormu dalam 2 kalimat dengan voice note!" },
  { type: "would", text: "Would you rather: Kaya raya tapi gak punya teman ATAU miskin tapi punya banyak teman?" },
  { type: "would", text: "Would you rather: Bisa terbang tapi takut ketinggian ATAU bisa bernapas di bawah air tapi takut laut?" },
  { type: "would", text: "Would you rather: Hidup 1000 tahun dalam kesepian ATAU hidup 30 tahun penuh kebahagiaan?" },
  { type: "would", text: "Would you rather: Gak pernah bisa pakai HP lagi ATAU gak pernah bisa makan enak lagi?" },
  { type: "would", text: "Would you rather: Baca pikiran orang lain ATAU tidak ada yang bisa baca pikiranmu?" },
  { type: "quiz", text: "Quiz: Berapa hasil dari 7 x 8 - 15 + 3? Jawab cepat 10 detik!", answer: "44" },
  { type: "quiz", text: "Quiz: Ibu kota negara yang benderanya merah-putih sama persis adalah?", answer: "indonesia" },
  { type: "quiz", text: "Quiz: Planet terdekat dengan matahari adalah?", answer: "merkurius" },
  { type: "quiz", text: "Quiz: Siapa presiden pertama Indonesia?", answer: "soekarno" },
  { type: "quiz", text: "Quiz: Berapa jumlah pemain sepak bola dalam satu tim?", answer: "11" },
];

const DEFAULT_INTERVAL = 45;
const MIN_INTERVAL = 15;
const MAX_INTERVAL = 360;

let intervals = {};

export function startAutoChallenge(groupId, sock, db) {
  stopAutoChallenge(groupId);
  const cfg = db.data.autoChallenge?.[groupId];
  if (!cfg || !cfg.enabled) return;

  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoChallenge?.[groupId];
      if (!g || !g.enabled) {
        stopAutoChallenge(groupId);
        return;
      }
      const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      g.lastChallenge = challenge.text;
      g.lastType = challenge.type;
      g.lastSent = Date.now();
      g.totalSent = (g.totalSent || 0) + 1;
      await db2.save();

      let msg = "Challenge " + g.totalSent + ":\n\n";
      msg += challenge.text;
      if (challenge.type === "tebak" || challenge.type === "quiz") {
        msg += "\n\nJawab di grup: .autochallenge answer <jawaban>";
      }
      msg += "\n\nMode: Otomatis tiap " + g.interval + " menit";

      await sock.sendMessage(groupId, {
        text: claraWrap("Auto Challenge", msg, "info"),
      });
    } catch (e) {
      console.error("[AutoChallenge interval]", e);
    }
  }, intervalMs);
}

export function stopAutoChallenge(groupId) {
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

    if (!db.data.autoChallenge) db.data.autoChallenge = {};
    if (!db.data.autoChallenge[groupId]) {
      db.data.autoChallenge[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastChallenge: null, lastType: null, lastAnswer: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoChallenge[groupId];

    // ON
    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;

      cfg.enabled = true;
      cfg.interval = interval;
      cfg.activatedBy = sender;
      cfg.activatedAt = Date.now();
      await db.save();

      startAutoChallenge(groupId, conn, db);

      return m.reply(claraWrap("Auto Challenge", [
        "Challenge otomatis DIAKTIFKAN!",
        "",
        "Interval: " + interval + " menit",
        "Total challenge: " + CHALLENGES.length + " (tebak, truth, dare, would you rather, quiz)",
        "",
        "Bot bakal kasih challenge random tiap " + interval + " menit.",
        "Ketik .autochallenge off untuk matikan.",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      stopAutoChallenge(groupId);

      return m.reply(claraWrap("Auto Challenge", "Challenge otomatis DIMATIKAN.\nKetik .autochallenge on untuk aktifkan lagi."));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";

      return m.reply(claraWrap("Auto Challenge", [
        "Status: " + (cfg.enabled ? "*ᴀᴋᴛɪꜰ*" : "Nonaktif"),
        "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit",
        "Total challenge: " + (cfg.totalSent || 0),
        "Terakhir kirim: " + lastSentStr,
        "Tipe terakhir: " + (cfg.lastType || "Belum ada"),
        "Challenge tersedia: " + CHALLENGES.length,
      ]));
    }

    // NOW
    if (sub === "now" || sub === "sekarang") {
      const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      cfg.lastChallenge = challenge.text;
      cfg.lastType = challenge.type;
      cfg.lastAnswer = challenge.answer || null;
      cfg.lastSent = Date.now();
      cfg.totalSent = (cfg.totalSent || 0) + 1;
      await db.save();

      let msg = "Challenge " + cfg.totalSent + ":\n\n" + challenge.text;
      if (challenge.type === "tebak" || challenge.type === "quiz") {
        msg += "\n\nJawab: .autochallenge answer <jawaban>";
      }

      return m.reply(claraWrap("Auto Challenge", msg, "info"));
    }

    // ANSWER
    if (sub === "answer" || sub === "jawab") {
      const answer = args.slice(1).join(" ").trim().toLowerCase();
      if (!cfg.lastChallenge) {
        return m.reply(claraWrap("Auto Challenge", "Belum ada challenge. Ketik .autochallenge now."));
      }
      if (cfg.lastType !== "tebak" && cfg.lastType !== "quiz") {
        return m.reply(claraWrap("Auto Challenge", "Challenge terakhir bukan tipe tebak/quiz. Gak ada jawaban."));
      }

      // Cari jawaban dari CHALLENGES berdasarkan lastChallenge
      const challenge = CHALLENGES.find((c) => c.text === cfg.lastChallenge);
      if (!challenge || !challenge.answer) {
        return m.reply(claraWrap("Auto Challenge", "Jawaban tidak tersedia untuk challenge ini."));
      }

      if (answer === challenge.answer.toLowerCase() || answer.replace(/\s/g, "") === challenge.answer.toLowerCase().replace(/\s/g, "")) {
        return m.reply(claraWrap("Auto Challenge", "BENAR! @" + sender.split("@")[0] + " jawabannya: " + challenge.answer, "success"));
      } else {
        return m.reply(claraWrap("Auto Challenge", "Salah! Coba lagi atau ketik .autochallenge now untuk challenge baru.", "warn"));
      }
    }

    // HELP
    return m.reply(claraWrap("Auto Challenge", [
      "Bot kasih challenge random ke grup otomatis",
      "",
      "CARA PAKAI:",
      usedPrefix + "autochallenge on [menit] — Aktifkan (default 45 menit, min 15, max 360)",
      usedPrefix + "autochallenge off — Matikan",
      usedPrefix + "autochallenge status — Lihat status",
      usedPrefix + "autochallenge now — Kirim challenge sekarang",
      usedPrefix + "autochallenge answer <jawaban> — Jawab challenge tebak/quiz",
      "",
      "TIPE CHALLENGE:",
      "Tebak — Tebak-tebakan",
      "Truth — Jujur atau diam",
      "Dare — Tantangan",
      "Would — Would you rather",
      "Quiz — Soal cepat",
    ]));
  } catch (e) {
    console.error("[Auto Challenge]", e);
    m.reply(claraWrap("Auto Challenge", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
