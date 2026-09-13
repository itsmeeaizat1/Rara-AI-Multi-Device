// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/nova-countdown.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pluginConfig = {
  name: "dailyuser",
  alias: ["dailyuser", "daily"],
  category: "user",
  description: "Claim hadiah harian (Exp, Koin, Gold, Gems)",
  usage: ".daily",
  example: ".daily",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

function formatNum(n) {
  return n.toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  const db = getDatabase();
  let user = db.getUser(m.sender);

  if (!user) {
    db.setUser(m.sender);
    user = db.getUser(m.sender);
  }

  if (!user.cooldowns) user.cooldowns = {};
  const lastDaily = user.cooldowns.daily || 0;
  const now = Date.now();

  if (now - lastDaily < DAILY_COOLDOWN) {
    // 🔹 LIVE COUNTDOWN (13 Sep, request owner "fitur polos di-variasi biar
    // menarik"): cooldown gak lagi angka beku — nge-tick ke reset klaim.
    const resetTs = lastDaily + DAILY_COOLDOWN;
    const cdCard = (remainingMs, live = true) => {
      const h = Math.floor(Math.max(0, remainingMs) / 3600000);
      const ms = formatRemaining(Math.max(0, remainingMs) % 3600000);
      return "Sabar ya, cooldown nih!\n" +
        "Udah klaim hari ini 👀\n" +
        (live
          ? "🕒 *" + h + " jam " + ms + "* lagi 🕒"
          : "Tunggu *" + h + " jam " + ms + "* lagi ya");
    };
    return runLiveTicker({
      sock, chat: m.chat, m,
      mode: "down", targetTs: resetTs, maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 16,
      initialCard: cdCard(resetTs - Date.now()),
      tickCard: (st) => cdCard(st.remainingMs, st.remainingMs > 0),
      finalCard: (st) => cdCard(st.remainingMs, false),
    });
  }

  // Calculate streak
  if (!user.rpg) user.rpg = {};
  const streak = (user.rpg.dailyStreak || 0) + 1;

  // Streak bonus — semakin lama consecutive, semakin besar
  const streakMultiplier = 1 + Math.min(streak * 0.1, 2); // Max 3x at streak 20+
  const expReward = Math.floor((Math.random() * 5000 + 1000) * streakMultiplier);
  const koinReward = Math.floor((Math.random() * 10000 + 5000) * streakMultiplier);
  const goldReward = Math.floor((Math.random() * 300 + 100) * streakMultiplier);

  // Small chance for gems (5%)
  let gemsReward = 0;
  let diamondsReward = 0;
  const luckyRoll = Math.random();
  if (luckyRoll < 0.03) {
    diamondsReward = Math.floor(Math.random() * 2) + 1;
    gemsReward = Math.floor(Math.random() * 5) + 3;
  } else if (luckyRoll < 0.15) {
    gemsReward = Math.floor(Math.random() * 3) + 1;
  }

  const potionReward = Math.floor(Math.random() * 3) + 1;

  // Apply rewards
  db.updateExp(m.sender, expReward);
  db.updateKoin(m.sender, koinReward);
  db.updateRpgCurrency(m.sender, "gold", goldReward);
  if (gemsReward > 0) db.updateRpgCurrency(m.sender, "gems", gemsReward);
  if (diamondsReward > 0) db.updateRpgCurrency(m.sender, "diamonds", diamondsReward);

  // Update streak
  user.rpg.dailyStreak = streak;
  db.updateRpgCurrency(m.sender, "dailyStreak", 0); // just trigger save
  user = db.getUser(m.sender);
  user.rpg.dailyStreak = streak;

  // Potion to inventory
  if (!user.inventory) user.inventory = {};
  user.inventory.potion = (user.inventory.potion || 0) + potionReward;

  user.cooldowns.daily = now;
  db.setUser(m.sender, user);
  db.save();

  const greeting = getTimeGreeting();

  let txt = "* " + greeting + ", @" + m.sender.split("@")[0] + "!* 👋\n";
  txt += "Streak: *" + streak + " hari*\n";
  if (streakMultiplier > 1) {
    txt += "Bonus Streak: *" + (Math.round(streakMultiplier * 100) / 100) + "x*\n";
  }
  txt += "\n";
  txt += "「 Hadiah 」\n";
  txt += "Exp: *+" + formatNum(expReward) + "*\n";
  txt += "Koin: *+" + formatNum(koinReward) + "*\n";
  txt += "Gold: *+" + formatNum(goldReward) + "*\n";
  if (gemsReward > 0) txt += "Gems: *+" + gemsReward + "*\n";
  if (diamondsReward > 0) txt += "Diamonds: *+" + diamondsReward + "*\n";
  txt += "Potion: *+" + potionReward + "*\n\n";
  txt += "Besok klaim lagi ya, jangan sampai putus streak-nya!";
    // 🔹 ANIMASI REVEAL ALA GACHA (13 Sep, request owner "fitur polos
  // di-variasi biar menarik"): hadiah gak dibuka dadakan — kartu morphing
  // membuka bagian per bagian lalu kartu lengkap. Edit gagal → kartu langsung.
  try {
    const parts = txt.split("\n");
    // grup baris biar reveal-nya bermakna: greeting → streak → hadiah → penutup
    const groups = [
      parts.slice(0, 3).join("\n"),           // sapaan + streak
      parts.slice(3, 5).join("\n"),            // header Hadiah + Exp
      parts.slice(5, 8).join("\n"),            // Koin + Gold
      parts.slice(8).join("\n"),               // sisa reward + penutup
    ];
    const opener = "🎁 membuka hadiah harian...";
    const sent = await sock.sendMessage(m.chat, { text: opener }, { quoted: m });
    const key = sent?.key || null;
    if (key) {
      let shown = "";
      for (let i = 0; i < groups.length; i++) {
        await sleep(800);
        shown = groups.slice(0, i + 1).join("\n");
        const isLast = i === groups.length - 1;
        try {
          await sock.sendMessage(m.chat,
            { text: isLast ? txt : shown + "\n…", mentions: [m.sender], edit: key });
        } catch { break; }
      }
    } else {
      await sock.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m });
    }
  } catch {
    try { await sock.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m }); } catch {}
  }
}

export { pluginConfig as config, handler };
