// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "dailyquest",
  alias: ["dailyquest"],
  category: "smart",
  description: "Daily quest - misi harian untuk coin & exp bonus",
  usage: ".dailyquest <command>",
  example: ".dailyquest",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const QUESTS = [
  { id: "talk", desc: "Kirim 10 pesan di grup hari ini", target: 10, reward: { coin: 30, exp: 20 }, type: "count" },
  { id: "command", desc: "Gunakan 5 command bot hari ini", target: 5, reward: { coin: 50, exp: 30 }, type: "count" },
  { id: "game", desc: "Main 1 game RPG hari ini", target: 1, reward: { coin: 40, exp: 25 }, type: "action" },
  { id: "sticker", desc: "Kirim 3 sticker di grup", target: 3, reward: { coin: 25, exp: 15 }, type: "action" },
  { id: "help", desc: "Bantu jawab 1 pertanyaan member", target: 1, reward: { coin: 35, exp: 30 }, type: "action" },
  { id: "social", desc: "React 5 pesan orang lain", target: 5, reward: { coin: 20, exp: 15 }, type: "action" },
];

const BONUS_QUESTS = [
  { desc: "Tag 3 teman dan bilang hal positif", reward: { coin: 100, exp: 50 } },
  { desc: "Share 1 fakta menarik di grup", reward: { coin: 80, exp: 40 } },
  { desc: "Jadi yang pertama online hari ini", reward: { coin: 60, exp: 35 } },
];

function getConfig(db, gid) {
  const all = db.setting("dailyquest") || {};
  if (!all[gid]) {
    all[gid] = { users: {}, dailyDate: "", questPool: [], bonusQuest: null };
    db.setting("dailyquest", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("dailyquest") || {};
  all[gid] = data;
  db.setting("dailyquest", all);
  db.save();
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function generateDailyQuests(cfg) {
  const today = todayDate();
  if (cfg.dailyDate !== today) {
    cfg.dailyDate = today;
    cfg.questPool = [...QUESTS].sort(() => Math.random() - 0.5).slice(0, 3);
    cfg.bonusQuest = BONUS_QUESTS[Math.floor(Math.random() * BONUS_QUESTS.length)];
    cfg.users = {}; // Reset progress
  }
  return cfg;
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  let cfg = getConfig(db, gid);
  cfg = generateDailyQuests(cfg);
  const user = db.getUser(m.sender);

  if (!cfg.users[m.sender]) {
    cfg.users[m.sender] = { progress: {}, bonusDone: false, claimed: false, claimedBonus: false, totalCompleted: 0 };
  }
  const udata = cfg.users[m.sender];

  if (sub === "list" || sub === "daftar" || !sub) {
    const questList = cfg.questPool.map((q, i) => {
      const prog = udata.progress[q.id] || 0;
      const status = prog >= q.target ? "[DONE]" : "[" + prog + "/" + q.target + "]";
      return (i + 1) + ". " + q.desc + " " + status + "\n   Reward: " + q.reward.coin + " coins, " + q.reward.exp + " exp";
    }).join("\n");

    const bonusStatus = udata.claimedBonus ? "[CLAIMED]" : "[AVAILABLE]";
    const allDone = cfg.questPool.every(q => (udata.progress[q.id] || 0) >= q.target);

    await m.reply(claraWrap("Daily Quest", [
      "Tanggal: " + cfg.dailyDate,
      "@" + m.sender.split("@")[0],
      "",
      "Misi Harian:",
      questList,
      "",
      "BONUS: " + cfg.bonusQuest.desc,
      "   Reward: " + cfg.bonusQuest.reward.coin + " coins, " + cfg.bonusQuest.reward.exp + " exp " + bonusStatus,
      "",
      allDone ? "Semua misi selesai! Claim: " + prefix + "dailyquest claim" : "Klaim: " + prefix + "dailyquest claim",
      prefix + "dailyquest claimbonus - klaim bonus",
      prefix + "dailyquest progress <id> <jumlah> - update progress",
    ].join("\n")), { mentions: [m.sender] });
    saveConfig(db, gid, cfg);
    return { handled: true };
  }

  if (sub === "progress" || sub === "update") {
    const qid = (args[2] || "").toLowerCase();
    const amount = parseInt(args[3] || "0", 10);
    const quest = cfg.questPool.find(q => q.id === qid);
    if (!quest) {
      await m.reply(novaError("DailyQuest", "Quest ID gak valid nih! Ketik " + prefix + "dailyquest list"));
      return { handled: true };
    }
    if ((udata.progress[qid] || 0) >= quest.target) {
      await m.reply(claraWrap("Daily Quest", "Quest " + qid + " sudah selesai!"));
      return { handled: true };
    }
    udata.progress[qid] = Math.min(quest.target, (udata.progress[qid] || 0) + amount);
    saveConfig(db, gid, cfg);
    if (udata.progress[qid] >= quest.target) {
      await m.reply(claraWrap("Daily Quest", "Quest selesai: " + quest.desc + "!\nKlaim reward: " + prefix + "dailyquest claim"));
    } else {
      await m.reply(claraWrap("Daily Quest", "Progress updated: " + qid + " (" + udata.progress[qid] + "/" + quest.target + ")"));
    }
    return { handled: true };
  }

  if (sub === "claim" || sub === "klaim") {
    let claimedAny = false;
    let totalCoin = 0;
    let totalExp = 0;
    let claimedList = [];
    for (const quest of cfg.questPool) {
      const prog = udata.progress[quest.id] || 0;
      const claimedKey = "claimed_" + quest.id;
      if (prog >= quest.target && !udata[claimedKey]) {
        udata[claimedKey] = true;
        totalCoin += quest.reward.coin;
        totalExp += quest.reward.exp;
        udata.totalCompleted++;
        claimedList.push(quest.desc);
        claimedAny = true;
      }
    }
    if (!claimedAny) {
      const incomplete = cfg.questPool.filter(q => (udata.progress[q.id] || 0) < q.target).map(q => q.desc).join(", ");
      await m.reply(claraWrap("Daily Quest", "Tidak ada quest yang bisa diklaim.\nBelum selesai: " + incomplete));
      return { handled: true };
    }
    user.coin = (user.coin || 0) + totalCoin;
    user.exp = (user.exp || 0) + totalExp;
    db.setUser(m.sender, user);
    db.save();
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Daily Quest - Claimed", [
      "Reward diterima:",
      ...claimedList.map(c => "+ " + c),
      "",
      "Total: +" + totalCoin + " coins, +" + totalExp + " exp",
      "Coin: " + user.coin + " | Exp: " + user.exp,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "claimbonus" || sub === "klaimbonus") {
    if (udata.claimedBonus) {
      await m.reply(claraWrap("Daily Quest", "Bonus sudah diklaim hari ini!"));
      return { handled: true };
    }
    // Check if all main quests done
    const allDone = cfg.questPool.every(q => (udata.progress[q.id] || 0) >= q.target);
    if (!allDone) {
      await m.reply(claraWrap("Daily Quest", "Selesaikan semua misi harian dulu!"));
      return { handled: true };
    }
    udata.claimedBonus = true;
    user.coin = (user.coin || 0) + cfg.bonusQuest.reward.coin;
    user.exp = (user.exp || 0) + cfg.bonusQuest.reward.exp;
    db.setUser(m.sender, user);
    db.save();
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Daily Quest - BONUS!", [
      "Bonus quest di-claim!",
      cfg.bonusQuest.desc,
      "",
      "+" + cfg.bonusQuest.reward.coin + " coins, +" + cfg.bonusQuest.reward.exp + " exp",
      "Coin: " + user.coin + " | Exp: " + user.exp,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "done" || sub === "selesai") {
    const qid = (args[2] || "").toLowerCase();
    const quest = cfg.questPool.find(q => q.id === qid);
    if (!quest) {
      await m.reply(novaError("DailyQuest", "Quest ID gak valid nih"));
      return { handled: true };
    }
    udata.progress[qid] = quest.target;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Daily Quest", "Quest " + qid + " ditandai selesai! Claim: " + prefix + "dailyquest claim"));
    return { handled: true };
  }

  if (sub === "reset" || sub === "resetdaily") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Daily Quest", "Khusus owner."));
      return { handled: true };
    }
    cfg.dailyDate = "";
    cfg = generateDailyQuests(cfg);
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Daily Quest", "Quest harian direset. Quest baru di-generate."));
    return { handled: true };
  }

  await m.reply(claraWrap("Daily Quest", [
    "DAILY QUEST HARIAN",
    "",
    prefix + "dailyquest list - lihat misi hari ini",
    prefix + "dailyquest progress <id> <jumlah> - update progress",
    prefix + "dailyquest done <id> - tandai selesai",
    prefix + "dailyquest claim - klaim reward",
    prefix + "dailyquest claimbonus - klaim bonus (semua selesai)",
    prefix + "dailyquest reset (owner) - reset quest",
    "",
    "Misi baru tiap hari, klaim semua buat bonus!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
