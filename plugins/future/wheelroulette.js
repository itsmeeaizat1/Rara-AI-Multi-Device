// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wheelroulette",
  alias: ["wheelroulette", "wheel"],
  category: "future",
  description: "Wheel roulette - spin wheel untuk dapat hadiah acak",
  usage: ".wheelroulette <command>",
  example: ".wheelroulette spin",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const SPIN_COST = 30;

function getConfig(db, gid) {
  const all = db.setting("wheelroulette") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("wheelroulette") || {};
  all[gid] = data;
  db.setting("wheelroulette", all);
  db.save();
}

function defaultSegments(gid) {
  return [
    { name: "50 Coins", weight: 20, type: "coin", amount: 50 },
    { name: "100 Coins", weight: 15, type: "coin", amount: 100 },
    { name: "20 Energy", weight: 15, type: "energy", amount: 20 },
    { name: "Zonk", weight: 20, type: "none", amount: 0 },
    { name: "200 Coins", weight: 8, type: "coin", amount: 200 },
    { name: "50 Energy", weight: 7, type: "energy", amount: 50 },
    { name: "500 Coins", weight: 5, type: "coin", amount: 500 },
    { name: "JACKPOT 1000 Coins", weight: 3, type: "coin", amount: 1000 },
    { name: "Coba Lagi (Free Spin)", weight: 5, type: "freespin", amount: 0 },
    { name: "Zonk Lagi", weight: 2, type: "none", amount: 0 },
  ];
}

function spinWheel(segments) {
  const total = segments.reduce((s, seg) => s + seg.weight, 0);
  let r = Math.random() * total;
  for (const seg of segments) {
    if (r < seg.weight) return seg;
    r -= seg.weight;
  }
  return segments[0];
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const user = db.getUser(m.sender);

  if (sub === "spin" || sub === "putar" || !sub) {
    if (user.coin < SPIN_COST) {
      await m.reply(claraWrap("Wheel Roulette", "Coin tidak cukup!\nButuh: " + SPIN_COST + " coins\nCoin kamu: " + (user.coin || 0)));
      return { handled: true };
    }
    let cfg = getConfig(db, gid);
    if (!cfg) {
      cfg = { segments: defaultSegments(gid), spins: 0, totalCoinsSpent: 0, jackpotWinners: [] };
    }

    user.coin -= SPIN_COST;
    cfg.spins++;
    cfg.totalCoinsSpent += SPIN_COST;

    const result = spinWheel(cfg.segments);

    // Apply reward
    if (result.type === "coin") {
      user.coin += result.amount;
    } else if (result.type === "energy") {
      user.energi = (user.energi || 0) + result.amount;
    } else if (result.type === "freespin") {
      user.coin += SPIN_COST; // Refund = free spin
    }

    if (result.name.includes("JACKPOT")) {
      cfg.jackpotWinners.push({ user: m.sender, amount: result.amount, ts: Date.now() });
    }

    saveConfig(db, gid, cfg);
    db.setUser(m.sender, user);
    db.save();

    const wheel = cfg.segments.map(s => "  [" + s.name + "] " + s.weight + "%").join("\n");

    let resultMsg = "";
    if (result.type === "none") {
      resultMsg = "ZONK! Nyangkut di " + result.name + ". Coba lagi!";
    } else if (result.type === "freespin") {
      resultMsg = "FREE SPIN! Coin dikembalikan, spin lagi gratis!";
    } else if (result.name.includes("JACKPOT")) {
      resultMsg = "JACKPOT! +" + result.amount + " coins! Selamat!";
    } else {
      resultMsg = "Dapat: " + result.name + "!";
    }

    await m.reply(claraWrap("Wheel Roulette", [
      "Wheel berputar... (-" + SPIN_COST + " coins)",
      "",
      resultMsg,
      "",
      "Coin: " + user.coin,
      prefix + "wheelroulette spin - spin lagi",
      prefix + "wheelroulette rates - lihat rate",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "rates" || sub === "rate" || sub === "peluang") {
    let cfg = getConfig(db, gid);
    if (!cfg) {
      cfg = { segments: defaultSegments(gid), spins: 0, totalCoinsSpent: 0, jackpotWinners: [] };
      saveConfig(db, gid, cfg);
    }
    const list = cfg.segments.map(s => s.name + ": " + s.weight + "%").join("\n");
    await m.reply(claraWrap("Wheel Roulette Rates", [
      "Cost: " + SPIN_COST + " coins/spin",
      "",
      list,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stats" || sub === "statistik" || sub === "cek") {
    let cfg = getConfig(db, gid);
    if (!cfg) {
      cfg = { segments: defaultSegments(gid), spins: 0, totalCoinsSpent: 0, jackpotWinners: [] };
      saveConfig(db, gid, cfg);
    }
    const lastJackpot = cfg.jackpotWinners.length > 0 ? "@" + cfg.jackpotWinners[cfg.jackpotWinners.length - 1].user.split("@")[0] : "(belum ada)";
    await m.reply(claraWrap("Wheel Roulette Stats", [
      "Total spins (grup): " + cfg.spins,
      "Total coins spent: " + cfg.totalCoinsSpent,
      "Jackpot winners: " + cfg.jackpotWinners.length,
      "Last jackpot: " + (lastJackpot || "(belum ada)"),
    ].join("\n")), { mentions: lastJackpot && lastJackpot !== "(belum ada)" ? [cfg.jackpotWinners[cfg.jackpotWinners.length - 1].user] : [] });
    return { handled: true };
  }

  if (sub === "jackpot" || sub === "winner") {
    let cfg = getConfig(db, gid);
    if (!cfg || cfg.jackpotWinners.length === 0) {
      await m.reply(claraWrap("Wheel Roulette", "Belum ada jackpot winner."));
      return { handled: true };
    }
    const list = cfg.jackpotWinners.slice(-5).reverse().map((w, i) => (i + 1) + ". @" + w.user.split("@")[0] + " - " + w.amount + " coins (" + new Date(w.ts).toLocaleDateString("id-ID") + ")").join("\n");
    await m.reply(claraWrap("Wheel Roulette - Jackpot Winners", list), { mentions: cfg.jackpotWinners.slice(-5).map(w => w.user) });
    return { handled: true };
  }

  await m.reply(claraWrap("Wheel Roulette", [
    "WHEEL ROULETTE",
    "",
    prefix + "wheelroulette spin - spin wheel (" + SPIN_COST + " coins)",
    prefix + "wheelroulette rates - lihat peluang",
    prefix + "wheelroulette stats - statistik grup",
    prefix + "wheelroulette jackpot - hall of fame",
    "",
    "Hadiah: coins, energy, free spin, JACKPOT 1000 coins!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
