// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mysterybox",
  alias: ["mysterybox", "mbox", "kotakmisteri"],
  category: "future",
  description: "Mystery Box - buka loot box untuk dapat item random",
  usage: ".mysterybox <command>",
  example: ".mysterybox buka",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const TIERS = {
  common: { name: "Common", color: "Abu-abu", weight: 50, rewards: ["10 coins", "20 coins", "5 energy", "1 potion"] },
  rare: { name: "Rare", color: "Biru", weight: 25, rewards: ["50 coins", "100 coins", "30 energy", "5 potion", "1 diamond"] },
  epic: { name: "Epic", color: "Ungu", weight: 15, rewards: ["200 coins", "500 coins", "100 energy", "10 potion", "5 diamond"] },
  legendary: { name: "Legendary", color: "Emas", weight: 8, rewards: ["1000 coins", "2000 coins", "500 energy", "1 mythic key"] },
  mythic: { name: "Mythic", color: "Merah", weight: 2, rewards: ["5000 coins", "10000 coins", "1000 energy", "1 legend key"] },
};

const BOX_PRICE = 100;

function rollTier() {
  const total = Object.values(TIERS).reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const [key, tier] of Object.entries(TIERS)) {
    if (r < tier.weight) return key;
    r -= tier.weight;
  }
  return "common";
}

function rollReward(tierKey) {
  const rewards = TIERS[tierKey].rewards;
  return rewards[Math.floor(Math.random() * rewards.length)];
}

function getConfig(db, gid) {
  const all = db.setting("mysterybox") || {};
  return all[gid] || { totalOpened: 0, totalCoinsSpent: 0, bestPulls: {}, pullsBy: {} };
}

function saveConfig(db, gid, data) {
  const all = db.setting("mysterybox") || {};
  all[gid] = data;
  db.setting("mysterybox", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const user = db.getUser(m.sender);

  if (sub === "buka" || sub === "open" || sub === "pull") {
    if (user.coin < BOX_PRICE) {
      await m.reply(claraWrap("Mystery Box", "Coin tidak cukup!\nHarga: " + BOX_PRICE + " coins\nCoin kamu: " + (user.coin || 0)));
      return { handled: true };
    }
    user.coin -= BOX_PRICE;
    const tier = rollTier();
    const reward = rollReward(tier);
    const t = TIERS[tier];

    // Track stats
    cfg.totalOpened++;
    cfg.totalCoinsSpent += BOX_PRICE;
    if (!cfg.bestPulls[m.sender]) cfg.bestPulls[m.sender] = { tier: "common", count: 0 };
    const tierOrder = ["common", "rare", "epic", "legendary", "mythic"];
    if (tierOrder.indexOf(tier) > tierOrder.indexOf(cfg.bestPulls[m.sender].tier)) {
      cfg.bestPulls[m.sender] = { tier, count: (cfg.bestPulls[m.sender].count || 0) + 1 };
    }
    if (!cfg.pullsBy[m.sender]) cfg.pullsBy[m.sender] = 0;
    cfg.pullsBy[m.sender]++;
    saveConfig(db, gid, cfg);

    // Apply reward (simple coin/energy parse)
    const coinMatch = reward.match(/(\d+)\s*coins/);
    const energyMatch = reward.match(/(\d+)\s*energy/);
    if (coinMatch) user.coin += parseInt(coinMatch[1], 10);
    if (energyMatch) user.energi = (user.energi || 0) + parseInt(energyMatch[1], 10);
    db.setUser(m.sender, user);
    db.save();

    await m.reply(claraWrap("Mystery Box", [
      "Kotak dibuka! (-" + BOX_PRICE + " coins)",
      "",
      "Tier: " + t.name + " (" + t.color + ")",
      "Reward: " + reward,
      "",
      "Coin sekarang: " + user.coin,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "multi" || sub === "burst") {
    const count = Math.min(parseInt(args[2] || "3", 10), 10);
    if (user.coin < BOX_PRICE * count) {
      await m.reply(claraWrap("Mystery Box", "Coin tidak cukup untuk " + count + " box!\nButuh: " + (BOX_PRICE * count) + " coins\nCoin kamu: " + (user.coin || 0)));
      return { handled: true };
    }
    user.coin -= BOX_PRICE * count;
    const results = [];
    for (let i = 0; i < count; i++) {
      const tier = rollTier();
      const reward = rollReward(tier);
      results.push(TIERS[tier].name + ": " + reward);
      const coinMatch = reward.match(/(\d+)\s*coins/);
      const energyMatch = reward.match(/(\d+)\s*energy/);
      if (coinMatch) user.coin += parseInt(coinMatch[1], 10);
      if (energyMatch) user.energi = (user.energi || 0) + parseInt(energyMatch[1], 10);
      cfg.totalOpened++;
      cfg.totalCoinsSpent += BOX_PRICE;
      if (!cfg.pullsBy[m.sender]) cfg.pullsBy[m.sender] = 0;
      cfg.pullsBy[m.sender]++;
    }
    saveConfig(db, gid, cfg);
    db.setUser(m.sender, user);
    db.save();

    await m.reply(claraWrap("Mystery Box x" + count, [
      "(-" + (BOX_PRICE * count) + " coins)",
      "",
      ...results.map((r, i) => (i + 1) + ". " + r),
      "",
      "Coin sekarang: " + user.coin,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "rates" || sub === "rate") {
    const list = Object.entries(TIERS).map(([key, t]) => t.name + " (" + t.color + "): " + t.weight + "%").join("\n");
    await m.reply(claraWrap("Mystery Box Rates", [
      "Harga: " + BOX_PRICE + " coins/box",
      "",
      list,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || !sub) {
    const myPulls = cfg.pullsBy[m.sender] || 0;
    const myBest = cfg.bestPulls[m.sender] || { tier: "none", count: 0 };
    await m.reply(claraWrap("Mystery Box", [
      "Harga: " + BOX_PRICE + " coins/box",
      "Total dibuka (grup): " + cfg.totalOpened,
      "Total coins spent: " + cfg.totalCoinsSpent,
      "",
      "Stat kamu:",
      "Total pull: " + myPulls,
      "Best tier: " + (TIERS[myBest.tier]?.name || myBest.tier),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Mystery Box", [
    "MYSTERY BOX - LOOT BOX",
    "",
    prefix + "mysterybox buka - buka 1 box",
    prefix + "mysterybox multi <jumlah> - buka multiple",
    prefix + "mysterybox rates - lihat rate drop",
    prefix + "mysterybox stats - statistik",
    "",
    "Harga: " + BOX_PRICE + " coins/box",
    "Tiers: Common, Rare, Epic, Legendary, Mythic",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
