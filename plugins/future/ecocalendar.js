// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ecocalendar",
  alias: ["ecocalendar", "ecochallenge", "ecoharian"],
  category: "future",
  description: "Eco challenge harian - challenge ramah lingkungan",
  usage: ".ecocalendar <command>",
  example: ".ecocalendar",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CHALLENGES = [
  "Matikan lampu 1 jam hari ini",
  "Bawa tumbler/botol minum sendiri",
  "Gunakan tas belanja kain, bukan plastik",
  "Jangan beli air mineral, isi ulang",
  "Pisahkan sampah organik & anorganik",
  "Naik transportasi umum/berjalan kaki",
  "Matikan AC 1 jam untuk hemat listrik",
  "Tanam 1 pohon/ tanaman kecil",
  "Kurangi daging 1 hari (meatless day)",
  "Gunakan kertas 2 sisi (print bolak-balik)",
  "Kumpulkan 5 botol plastik untuk daur ulang",
  "Jangan makan sisa, habiskan porsi makan",
  "Bersihkan 1 area di sekitarmu (pungut sampah)",
  "Gunakan kipas angin, matikan AC",
  "Hemat air - mandi lebih cepat 5 menit",
  "Gunakan piring/gelas tangan, bukan sekali pakai",
  "Sumbangkan barang tidak terpakai",
  "Belanja lokal (kurangi emisi transportasi)",
  "Matikan charger yang tidak dipakai",
  "Share challenge ini ke teman untuk efek ganda",
];

function getConfig(db, gid) {
  const all = db.setting("ecocalendar") || {};
  if (!all[gid]) {
    all[gid] = { users: {}, dailyChallenge: "", dailyDate: "", streaks: {}, totalCompleted: 0, history: [] };
    db.setting("ecocalendar", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("ecocalendar") || {};
  all[gid] = data;
  db.setting("ecocalendar", all);
  db.save();
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function getDailyChallenge(cfg) {
  const today = todayDate();
  if (cfg.dailyDate !== today || !cfg.dailyChallenge) {
    const idx = new Date().getDate() % CHALLENGES.length;
    cfg.dailyChallenge = CHALLENGES[idx];
    cfg.dailyDate = today;
  }
  return cfg.dailyChallenge;
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const challenge = getDailyChallenge(cfg);

  if (!sub || sub === "today" || sub === "hariini" || sub === "challenge") {
    const today = todayDate();
    const doneToday = cfg.users[m.sender]?.lastDone === today;
    await m.reply(claraWrap("Eco Challenge", [
      "Challenge hari ini (" + today + "):",
      "",
      challenge,
      "",
      doneToday ? "Status: DONE ✅" : "Status: Belum selesai",
      "",
      doneToday ? "Kerja bagus! Besok ada challenge baru." : prefix + "ecocalendar done - tandai selesai",
    ].join("\n")));
    saveConfig(db, gid, cfg);
    return { handled: true };
  }

  if (sub === "done" || sub === "selesai") {
    const today = todayDate();
    if (!cfg.users[m.sender]) cfg.users[m.sender] = { totalDone: 0, lastDone: "", streak: 0 };
    if (cfg.users[m.sender].lastDone === today) {
      await m.reply(claraWrap("Eco Challenge", "Kamu sudah menyelesaikan challenge hari ini! Besok lagi."));
      return { handled: true };
    }
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
    if (cfg.users[m.sender].lastDone === yesterday) {
      cfg.users[m.sender].streak = (cfg.users[m.sender].streak || 0) + 1;
    } else {
      cfg.users[m.sender].streak = 1;
    }
    cfg.users[m.sender].lastDone = today;
    cfg.users[m.sender].totalDone = (cfg.users[m.sender].totalDone || 0) + 1;
    cfg.totalCompleted++;
    cfg.history.push({ user: m.sender, challenge, date: today, ts: Date.now() });
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Eco Challenge", [
      "Challenge selesai! +1 eco point",
      "Streak: " + cfg.users[m.sender].streak + " hari",
      "Total selesai: " + cfg.users[m.sender].totalDone,
      "",
      "Bumi berterima kasih! 🌱",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "leaderboard" || sub === "top") {
    const sorted = Object.entries(cfg.users).sort((a, b) => (b[1].totalDone || 0) - (a[1].totalDone || 0)).slice(0, 5);
    const list = sorted.map(([jid, data], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + (data.totalDone || 0) + " done, " + (data.streak || 0) + " streak").join("\n") || "(kosong)";
    await m.reply(claraWrap("Eco Leaderboard", [
      "Eco Warrior Top 5:",
      list,
    ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "stats" || sub === "statistik") {
    await m.reply(claraWrap("Eco Stats", [
      "Total completed (grup): " + cfg.totalCompleted,
      "Total eco warriors: " + Object.keys(cfg.users).length,
      "Challenge hari ini: " + challenge,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "history") {
    const recent = cfg.history.slice(-5).reverse();
    const list = recent.map(h => h.date + " - @" + h.user.split("@")[0] + ": " + h.challenge).join("\n") || "(kosong)";
    await m.reply(claraWrap("Eco History", "Aktivitas terakhir:\n" + list), { mentions: recent.map(h => h.user) });
    return { handled: true };
  }

  await m.reply(claraWrap("Eco Challenge", [
    "ECO CHALLENGE HARIAN",
    "",
    prefix + "ecocalendar - lihat challenge hari ini",
    prefix + "ecocalendar done - tandai selesai",
    prefix + "ecocalendar leaderboard - top eco warrior",
    prefix + "ecocalendar stats - statistik grup",
    prefix + "ecocalendar history - aktivitas terakhir",
    "",
    "Challenge baru tiap hari, jaga streak!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
