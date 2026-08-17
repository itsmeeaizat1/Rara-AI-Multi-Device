// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { getPlayer, ensurePlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kingdom",
  alias: ["kerajaan", "kingdom", "build", "bangun"],
  category: "game",
  description: "Bangun dan kelola kerajaan RPG (Premium only)",
  usage: ".kingdom (status) / .kingdom build <nama> / .kingdom upgrade <nama> / .kingdom collect",
  example: ".kingdom\n.kingdom build farm\n.kingdom upgrade mine\n.kingdom collect",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Bangunan tersedia
const BUILDINGS = {
  farm: {
    name: "Farm",
    emoji: "🌾",
    desc: "Produksi makanan",
    resource: "food",
    baseCost: 2000,
    baseProduction: 50, // per jam
    maxLevel: 10,
    resourceEmoji: "🍞",
  },
  mine: {
    name: "Mine",
    emoji: "⛏️",
    desc: "Produksi emas",
    resource: "gold",
    baseCost: 5000,
    baseProduction: 100,
    maxLevel: 10,
    resourceEmoji: "🪙",
  },
  lumbermill: {
    name: "Lumber Mill",
    emoji: "🪵",
    desc: "Produksi kayu",
    resource: "wood",
    baseCost: 1500,
    baseProduction: 40,
    maxLevel: 10,
    resourceEmoji: "🪵",
  },
  barrack: {
    name: "Barrack",
    emoji: "🏰",
    desc: "Latih pasukan",
    resource: "army",
    baseCost: 8000,
    baseProduction: 20,
    maxLevel: 10,
    resourceEmoji: "⚔️",
  },
  treasury: {
    name: "Treasury",
    emoji: "🏦",
    desc: "Simpanan emas + bonus",
    resource: "storage",
    baseCost: 10000,
    baseProduction: 0,
    maxLevel: 10,
    resourceEmoji: "💎",
  },
  market: {
    name: "Market",
    emoji: "🏪",
    desc: "Pendapatan pasif koin",
    resource: "coin",
    baseCost: 6000,
    baseProduction: 200,
    maxLevel: 10,
    resourceEmoji: "💰",
  },
};

// Upgrade cost: baseCost * (level + 1) * 1.5
function getUpgradeCost(building, currentLevel) {
  return Math.floor(building.baseCost * (currentLevel + 1) * 1.5);
}

// Production: baseProduction * level
function getProduction(building, level) {
  return building.baseProduction * level;
}

// Treasury bonus: +5% gold per level
function getTreasuryBonus(kingdom) {
  const treasury = kingdom?.buildings?.treasury;
  if (!treasury) return 0;
  return treasury.level * 0.05;
}

function getKingdomState(db, userId) {
  if (!db.db.data.kingdoms) db.db.data.kingdoms = {};
  if (!db.db.data.kingdoms[userId]) {
    db.db.data.kingdoms[userId] = {
      buildings: {},
      resources: { food: 0, wood: 0, army: 0, coin: 0 },
      lastCollect: Date.now(),
      createdAt: Date.now(),
    };
    db.save();
  }
  return db.db.data.kingdoms[userId];
}

function calcAccumulated(kingdom) {
  const now = Date.now();
  const elapsed = (now - (kingdom.lastCollect || now)) / 3600000; // jam
  const acc = { food: 0, wood: 0, army: 0, coin: 0 };

  for (const [key, b] of Object.entries(kingdom.buildings || {})) {
    const building = BUILDINGS[key];
    if (!building || building.resource === "storage") continue;
    const prod = getProduction(building, b.level);
    acc[building.resource] = (acc[building.resource] || 0) + Math.floor(prod * elapsed);
  }

  return acc;
}

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const subCmd = args[0]?.toLowerCase();

  ensurePlayer(m, m.pushName || "Player");
  const player = getPlayer(m);
  const kingdom = getKingdomState(db, m.sender);

  // Status / no args
  if (!subCmd || subCmd === "status" || subCmd === "cek") {
    const accumulated = calcAccumulated(kingdom);
    const treasuryBonus = getTreasuryBonus(kingdom);
    const buildingCount = Object.keys(kingdom.buildings || {}).length;

    let text =
      claraWrap("Kingdom", [`◦ Pemilik: *${m.pushName || "Player"}*`,
        `◦ Level: *${player?.level || 1}*`,
        `◦ Bangunan: *${buildingCount}/${Object.keys(BUILDINGS).length}*`,
        `◦ Treasury Bonus: *+${Math.round(treasuryBonus * 100)}% gold*`].join("\n"));

    // Resource ready to collect
    if (accumulated.food > 0 || accumulated.wood > 0 || accumulated.army > 0 || accumulated.coin > 0) {
      text += "\n\n" + claraWrap("RESOURCE SIAP DIKLAIM", [`◦ 🍞 Food: *+${accumulated.food.toLocaleString("id-ID")}*`, `◦ 🪵 Wood: *+${accumulated.wood.toLocaleString("id-ID")}*`, `◦ ⚔️ Army: *+${accumulated.army.toLocaleString("id-ID")}*`, `◦ 💰 Coin: *+${accumulated.coin.toLocaleString("id-ID")}*`].join("\n")) + "\n\n" + tipText(`Ketik \`${prefix}kingdom collect\` untuk klaim!`);
    }

    // List buildings
    text += "\n\n" + separator("━", 22) + "\nDAFTAR BANGUNAN:\n\n";

    for (const [key, b] of Object.entries(BUILDINGS)) {
      const level = kingdom.buildings?.[key]?.level || 0;
      const prod = level > 0 ? getProduction(b, level) : 0;
      const status = level > 0
        ? `Lv ${level} | ${b.resourceEmoji} +${prod}/jam`
        : "Belum dibangun";
      text += `${b.emoji} *${b.name}* — ${status}\n`;
      if (level === 0) {
        text += `Bangun: \`${prefix}kingdom build ${key}\`\n`;
      } else if (level < b.maxLevel) {
        const cost = getUpgradeCost(b, level);
        text += `Upgrade: \`${prefix}kingdom upgrade ${key}\` (${cost.toLocaleString("id-ID")}G)\n`;
      } else {
        text += `MAX LEVEL!\n`;
      }
      text += "\n";
    }

    text += separator("━", 22) + "\n" +
    tipText(`Bangun: \`${prefix}kingdom build <nama>\``) + "\n" +
    tipText(`Upgrade: \`${prefix}kingdom upgrade <nama>\``) + "\n" +
    tipText(`Klaim: \`${prefix}kingdom collect\``);

    return sendReplyWithNav(sock, m, text, "kingdom");
  }

  // Build new building
  if (subCmd === "build" || subCmd === "bangun") {
    const buildKey = args[1]?.toLowerCase();

    if (!buildKey || !BUILDINGS[buildKey]) {
      let list = "";
      for (const [key, b] of Object.entries(BUILDINGS)) {
        list += `${b.emoji} *${b.name}* — ${b.baseCost.toLocaleString("id-ID")}G\n`;
        list += `${b.desc}\n`;
        list += `\`${prefix}kingdom build ${key}\`\n\n`;
      }
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Build", [`◦ Gold kamu: *${(user.koin || 0).toLocaleString("id-ID")}*`].join("\n")) + "\n\n" + list +
        separator("━", 22) + "\n" +
        tipText(`Bangun: \`${prefix}kingdom build <nama>\``),
        "kingdom"
      );
    }

    if (kingdom.buildings?.[buildKey]) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom", [`${BUILDINGS[buildKey].emoji} *${BUILDINGS[buildKey].name}* sudah dibangun!`,
          `Gunakan \`${prefix}kingdom upgrade ${buildKey}\` untuk upgrade`].join("\n")),
        "kingdom"
      );
    }

    const building = BUILDINGS[buildKey];
    const cost = building.baseCost;

    if ((user.koin || 0) < cost) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Build", [`◦ Bangunan: *${building.emoji} ${building.name}*`,
          `◦ Biaya: *${cost.toLocaleString("id-ID")}*`,
          `◦ Gold kamu: *${(user.koin || 0).toLocaleString("id-ID")}*`,
          `◦ Kurang: *${(cost - (user.koin || 0)).toLocaleString("id-ID")}*`].join("\n")) + "\n\n" +
        tipText(`Kumpulin gold lewat \`${prefix}hunt\` atau \`${prefix}daily\``),
        "kingdom"
      );
    }

    // Build it
    user.koin = (user.koin || 0) - cost;
    if (!kingdom.buildings) kingdom.buildings = {};
    kingdom.buildings[buildKey] = { level: 1, builtAt: Date.now() };
    db.save();

    await m.react("✅");

    return sendReplyWithNav(
      sock,
      m,
      claraWrap("Kingdom Build", [`◦ Bangunan: *${building.emoji} ${building.name}*`,
        `◦ Level: *1*`,
        `◦ Produksi: *${building.resourceEmoji} +${getProduction(building, 1)}/jam*`,
        `◦ Biaya: *-${cost.toLocaleString("id-ID")}G*`,
        `◦ Gold tersisa: *${user.koin.toLocaleString("id-ID")}*`].join("\n")) + "\n\n" +
      tipText(`Upgrade: \`${prefix}kingdom upgrade ${buildKey}\``) + "\n" +
      tipText(`Klaim resource: \`${prefix}kingdom collect\``),
      "kingdom"
    );
  }

  // Upgrade building
  if (subCmd === "upgrade" || subCmd === "naik") {
    const buildKey = args[1]?.toLowerCase();

    if (!buildKey || !BUILDINGS[buildKey]) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Upgrade", [`Sebut nama bangunan!`,
          `Contoh: \`${prefix}kingdom upgrade farm\``].join("\n")) + "\n\n" + tipText(`Cek bangunan: \`${prefix}kingdom\``),
        "kingdom"
      );
    }

    const building = BUILDINGS[buildKey];
    const current = kingdom.buildings?.[buildKey];

    if (!current) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Upgrade", [`${building.emoji} *${building.name}* belum dibangun!`,
          `Bangun dulu: \`${prefix}kingdom build ${buildKey}\``].join("\n")),
        "kingdom"
      );
    }

    if (current.level >= building.maxLevel) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Upgrade", [`${building.emoji} *${building.name}* udah level MAX (${building.maxLevel})!`].join("\n")),
        "kingdom"
      );
    }

    const cost = getUpgradeCost(building, current.level);

    if ((user.koin || 0) < cost) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Upgrade", [`◦ Bangunan: *${building.emoji} ${building.name}*`,
          `◦ Upgrade Lv ${current.level} → ${current.level + 1}`,
          `◦ Biaya: *${cost.toLocaleString("id-ID")}*`,
          `◦ Gold kamu: *${(user.koin || 0).toLocaleString("id-ID")}*`].join("\n")) + "\n\n" +
        tipText(`Kumpulin gold dulu!`),
        "kingdom"
      );
    }

    // Upgrade
    user.koin = (user.koin || 0) - cost;
    kingdom.buildings[buildKey].level = current.level + 1;
    db.save();

    await m.react("✅");

    const newProd = getProduction(building, current.level + 1);
    const oldProd = getProduction(building, current.level);

    return sendReplyWithNav(
      sock,
      m,
      claraWrap("Kingdom Upgrade", [`◦ Bangunan: *${building.emoji} ${building.name}*`,
        `◦ Level: *${current.level} → ${current.level + 1}*`,
        `◦ Produksi: *${oldProd} → ${newProd} ${building.resourceEmoji}/jam*`,
        `◦ Biaya: *-${cost.toLocaleString("id-ID")}G*`,
        `◦ Gold tersisa: *${user.koin.toLocaleString("id-ID")}*`].join("\n")) + "\n\n" +
      (current.level + 1 < building.maxLevel
        ? tipText(`Upgrade lagi: \`${prefix}kingdom upgrade ${buildKey}\``)
        : tipText("MAX LEVEL! 🔥")) + "\n" +
      tipText(`Klaim: \`${prefix}kingdom collect\``),
      "kingdom"
    );
  }

  // Collect resources
  if (subCmd === "collect" || subCmd === "klaim" || subCmd === "ambil") {
    const accumulated = calcAccumulated(kingdom);

    const totalFood = accumulated.food || 0;
    const totalWood = accumulated.wood || 0;
    const totalArmy = accumulated.army || 0;
    const totalCoin = accumulated.coin || 0;

    if (totalFood === 0 && totalWood === 0 && totalArmy === 0 && totalCoin === 0) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap("Kingdom Collect", ["Resource masih kosong",
          "Tunggu beberapa jam untuk produksi"].join("\n")) + "\n\n" +
        tipText("Bangun lebih banyak bangunan untuk produksi lebih cepat!"),
        "kingdom"
      );
    }

    await m.react("🕐");

    // Add coin to user gold (with treasury bonus)
    const treasuryBonus = getTreasuryBonus(kingdom);
    const coinWithBonus = Math.floor(totalCoin * (1 + treasuryBonus));

    // Add gold/coin to user
    if (coinWithBonus > 0) {
      addGold(m, coinWithBonus);
    }

    // Store other resources in kingdom inventory
    if (!kingdom.resources) kingdom.resources = {};
    kingdom.resources.food = (kingdom.resources.food || 0) + totalFood;
    kingdom.resources.wood = (kingdom.resources.wood || 0) + totalWood;
    kingdom.resources.army = (kingdom.resources.army || 0) + totalArmy;
    kingdom.lastCollect = Date.now();
    db.save();

    await m.react("✅");

    let text =
      claraWrap("Kingdom Collect", [`◦ 🍞 Food: *+${totalFood.toLocaleString("id-ID")}*`,
        `◦ 🪵 Wood: *+${totalWood.toLocaleString("id-ID")}*`,
        `◦ ⚔️ Army: *+${totalArmy.toLocaleString("id-ID")}*`,
        `◦ 💰 Coin: *+${coinWithBonus.toLocaleString("id-ID")}*` +
          (treasuryBonus > 0 ? ` (+${Math.round(treasuryBonus * 100)}% treasury)` : "")].join("\n")) + "\n\n" +
      claraWrap("SIMPANAN KERAJAAN", [`◦ 🍞 Food: *${(kingdom.resources.food || 0).toLocaleString("id-ID")}*`, `◦ 🪵 Wood: *${(kingdom.resources.wood || 0).toLocaleString("id-ID")}*`, `◦ ⚔️ Army: *${(kingdom.resources.army || 0).toLocaleString("id-ID")}*`].join("\n")) + "\n\n" +
      separator("━", 22) + "\n" +
      tipText(`Coin langsung masuk gold!`) + "\n" +
      tipText(`Klaim lagi nanti untuk resource baru`);

    return sendReplyWithNav(sock, m, text, "kingdom");
  }

  // Help
  return sendReplyWithNav(
    sock,
    m,
    claraWrap("Kingdom", [`◦ \`${prefix}kingdom\` — Status kerajaan`,
      `◦ \`${prefix}kingdom build <nama>\` — Bangun`,
      `◦ \`${prefix}kingdom upgrade <nama>\` — Upgrade`,
      `◦ \`${prefix}kingdom collect\` — Klaim resource`].join("\n")) + "\n" +
    tipText("Fitur Premium: idle kingdom builder"),
    "kingdom"
  );
}

export { pluginConfig as config, handler };
