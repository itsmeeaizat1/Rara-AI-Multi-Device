// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "auracheck",
  alias: ["auracheck"],
  category: "smart",
  description: "Aura reading - analisis aura kamu berdasarkan aktivitas",
  usage: ".auracheck",
  example: ".auracheck",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

const AURA_COLORS = [
  { color: "Merah", meaning: "Passion, keberanian, energi tingkat tinggi", vibe: "Kamu lagi dalam fase fight mode" },
  { color: "Oranye", meaning: "Kreativitas, kegembiraan, sosial", vibe: "Lagi pengen nongkrong bareng temen" },
  { color: "Kuning", meaning: "Optimis, cerdas, percaya diri", vibe: "Lagi mood produktif nih" },
  { color: "Hijau", meaning: "Seimbang, tumbuh, penyembuhan", vibe: "Lagi fase healing diri" },
  { color: "Biru", meaning: "Tenang, komunikatif, jujur", vibe: "Lagi pengen diem-diem dulu" },
  { color: "Indigo", meaning: "Intuisi tinggi, spiritual, dalam", vibe: "Lagi manyun banget kayaknya" },
  { color: "Ungu", meaning: "Bijak, misterius, ambisius", vibe: "Lagi mikirin masa depan nih" },
  { color: "Pink", meaning: "Cinta, kasih sayang, lembut", vibe: "Lagi baperan kayaknya" },
  { color: "Emas", meaning: "Sukses, kelimpahan, pencapaian", vibe: "Lagi ada rezeki nomplok nih" },
  { color: "Perak", meaning: "Refleksi, introspeksi, transisi", vibe: "Lagi fase cari jati diri" },
  { color: "Hitam", meaning: "Proteksi, misterius, dalam", vibe: "Lagi butuh waktu sendiri" },
  { color: "Putih", meaning: "Murni, bersih, spiritual", vibe: "Lagi fase restart hidup" },
];

const AURA_LEVELS = [
  { min: 0, max: 20, title: "Aura Lemah", desc: "Energimu lagi turun. Butuh recharge." },
  { min: 21, max: 40, title: "Aura Standar", desc: "Aura lumayan, tapi bisa di-upgrade." },
  { min: 41, max: 60, title: "Aura Kuat", desc: "Aura kamu solid, orang bisa ngerasain." },
  { min: 61, max: 80, title: "Aura Dominan", desc: "Aura kamu keliatan dari jauh!" },
  { min: 81, max: 95, title: "Aura Legend", desc: "Aura level sultan, semua orang ngerasa." },
  { min: 96, max: 100, title: "AURA MAXXX", desc: "Aura kamu udah mythic, tak terkalahkan!" },
];

const FORTUNE = [
  "Hari ini ada seseorang yang memperhatikan kamu diam-diam.",
  "Rejeki lagi deket-deket, jangan nyerah.",
  "Ada kabar baik minggu ini, bersiap",
  "Seseorang kangen kamu tapi galgak bilang.",
  "Lagi diuji sabar, tapi hasilnya sepadan.",
  "Ada peluang baru datang dari arah tak terduga.",
  "Jaga kata-kata hari ini, ada yang salah paham.",
  "Energi positif lagi ngalir, manfaatin sekarang.",
  "Lagi fase glow up, orang mulai sadar.",
  "Ada seseorang yang inget kamu hari ini.",
  "Hati-hati sama orang yang pura-pura baik.",
  "Rejeki nomplok dari arah yang nggak disangka.",
  "Lagi cocok buat ambil keputusan besar.",
  "Jaga kesehatan, energi lagi turun dikit.",
  "Seseorang di grup ini suka sama kamu.",
];

function getConfig(db, gid) {
  const all = db.setting("auracheck") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("auracheck") || {};
  all[gid] = data;
  db.setting("auracheck", all);
  db.save();
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const today = todayDate();

  // Reset daily
  if (cfg[m.sender]?.lastCheck !== today) {
    if (!cfg[m.sender]) cfg[m.sender] = {};
    cfg[m.sender].lastCheck = today;
    cfg[m.sender].score = null;
    cfg[m.sender].checkedToday = false;
  }

  if (cfg[m.sender].checkedToday) {
    await m.reply(claraWrap("Aura Check", [
      "Kamu udah cek aura hari ini!",
      "Score: " + cfg[m.sender].score + "/100",
      "Warna: " + cfg[m.sender].color,
      "Title: " + cfg[m.sender].title,
      "",
      "Cek lagi besok ya, aura berubah tiap hari.",
    ].join("\n")));
    return { handled: true };
  }

  // Calculate aura score based on hash + RNG
  const user = db.getUser(m.sender);
  const hour = new Date().getHours();
  const activityScore = Math.min(50, (user?.totalCommands || 0) % 50);
  const timeBonus = (hour >= 6 && hour <= 10) ? 15 : (hour >= 17 && hour <= 21) ? 10 : 5;
  const rngScore = Math.floor(Math.random() * 35);
  const score = Math.min(100, activityScore + timeBonus + rngScore);

  const auraColor = AURA_COLORS[Math.floor((score / 100) * AURA_COLORS.length) % AURA_COLORS.length];
  const auraLevel = AURA_LEVELS.find(l => score >= l.min && score <= l.max) || AURA_LEVELS[0];
  const fortune = FORTUNE[Math.floor(Math.random() * FORTUNE.length)];

  cfg[m.sender].score = score;
  cfg[m.sender].color = auraColor.color;
  cfg[m.sender].title = auraLevel.title;
  cfg[m.sender].checkedToday = true;
  saveConfig(db, gid, cfg);

  const bar = "▰".repeat(Math.floor(score / 10)) + "▱".repeat(10 - Math.floor(score / 10));

  await m.reply(claraWrap("Aura Reading", [
    "@" + m.sender.split("@")[0],
    "",
    "Score: " + score + "/100",
    "[" + bar + "]",
    "",
    "Warna Aura: " + auraColor.color,
    "Meaning: " + auraColor.meaning,
    "Vibe: " + auraColor.vibe,
    "",
    "Title: " + auraLevel.title,
    auraLevel.desc,
    "",
    "Fortune hari ini:",
    fortune,
    "",
    "Cek lagi besok buat aura baru!",
  ].join("\n")), { mentions: [m.sender] });
  return { handled: true };
}

export { pluginConfig as config, handler };
