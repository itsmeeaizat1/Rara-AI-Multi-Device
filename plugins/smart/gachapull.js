// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gachapull",
  alias: ["gachapull"],
  category: "smart",
  description: "Gacha collection - pull karakter random dengan rarity",
  usage: ".gachapull <command>",
  example: ".gachapull",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const PULL_COST = 50;

const RARITIES = [
  { name: "N", color: "Putih", weight: 40, statMult: 1, stars: 1 },
  { name: "R", color: "Biru", weight: 30, statMult: 1.5, stars: 2 },
  { name: "SR", color: "Ungu", weight: 18, statMult: 2, stars: 3 },
  { name: "SSR", color: "Emas", weight: 9, statMult: 3, stars: 4 },
  { name: "UR", color: "Merah", weight: 3, statMult: 5, stars: 5 },
];

const CHARACTERS = [
  { name: "Aizat Knight", element: "Fire", baseAtk: 50, baseDef: 30, baseHp: 200, emoji: "Knight" },
  { name: "Nova Mage", element: "Ice", baseAtk: 70, baseDef: 15, baseHp: 150, emoji: "Mage" },
  { name: "Clara Archer", element: "Wind", baseAtk: 60, baseDef: 25, baseHp: 180, emoji: "Archer" },
  { name: "Bayu Assassin", element: "Shadow", baseAtk: 80, baseDef: 10, baseHp: 140, emoji: "Assassin" },
  { name: "Rina Healer", element: "Light", baseAtk: 30, baseDef: 40, baseHp: 250, emoji: "Healer" },
  { name: "Giga Samurai", element: "Thunder", baseAtk: 65, baseDef: 35, baseHp: 220, emoji: "Samurai" },
  { name: "Luna Witch", element: "Dark", baseAtk: 75, baseDef: 20, baseHp: 160, emoji: "Witch" },
  { name: "Drago Berserker", element: "Earth", baseAtk: 90, baseDef: 20, baseHp: 300, emoji: "Berserker" },
  { name: "Sora Paladin", element: "Holy", baseAtk: 55, baseDef: 50, baseHp: 280, emoji: "Paladin" },
  { name: "Void Ninja", element: "Void", baseAtk: 85, baseDef: 15, baseHp: 130, emoji: "Ninja" },
];

function rollRarity() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const rarity of RARITIES) {
    if (r < rarity.weight) return rarity;
    r -= rarity.weight;
  }
  return RARITIES[0];
}

function rollCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function makeCard(char, rarity) {
  return {
    name: char.name,
    element: char.element,
    rarity: rarity.name,
    stars: rarity.stars,
    color: rarity.color,
    atk: Math.floor(char.baseAtk * rarity.statMult),
    def: Math.floor(char.baseDef * rarity.statMult),
    hp: Math.floor(char.baseHp * rarity.statMult),
    level: 1,
    count: 1,
  };
}

function getConfig(db, gid) {
  const all = db.setting("gachapull") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("gachapull") || {};
  all[gid] = data;
  db.setting("gachapull", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const user = db.getUser(m.sender);

  if (!cfg[m.sender]) {
    cfg[m.sender] = { collection: {}, totalPulls: 0, duplicates: 0, coinsSpent: 0 };
  }
  const gdata = cfg[m.sender];

  if (sub === "pull" || sub === "x10" || sub === "multi" || !sub) {
    const isMulti = sub === "x10" || sub === "multi";
    const count = isMulti ? 10 : 1;
    const totalCost = PULL_COST * count;

    if (user.coin < totalCost) {
      await m.reply(claraWrap("Gacha", "Coin tidak cukup!\nButuh: " + totalCost + " coins\nCoin kamu: " + (user.coin || 0)));
      return { handled: true };
    }
    user.coin -= totalCost;
    gdata.totalPulls += count;
    gdata.coinsSpent += totalCost;

    const pulls = [];
    let bestRarity = "N";
    let bestStars = 0;
    for (let i = 0; i < count; i++) {
      const rarity = rollRarity();
      const char = rollCharacter();
      const card = makeCard(char, rarity);
      const key = char.name + "_" + rarity.name;

      if (gdata.collection[key]) {
        gdata.collection[key].count++;
        gdata.duplicates++;
      } else {
        gdata.collection[key] = card;
      }
      pulls.push(card);
      if (rarity.stars > bestStars) {
        bestStars = rarity.stars;
        bestRarity = rarity.name;
      }
    }

    saveConfig(db, gid, cfg);
    db.setUser(m.sender, user);
    db.save();

    const pullList = pulls.map((p, i) => {
      const stars = "★".repeat(p.stars);
      return (i + 1) + ". [" + p.rarity + "] " + stars + " " + p.name + " (" + p.element + ") ATK:" + p.atk;
    }).join("\n");

    await m.reply(claraWrap("Gacha Pull " + (isMulti ? "x10" : "x1"), [
      "(-" + totalCost + " coins)",
      "Best pull: [" + bestRarity + "] " + "★".repeat(bestStars),
      "",
      pullList,
      "",
      "Total pulls: " + gdata.totalPulls,
      "Coin: " + user.coin,
      "",
      prefix + "gachapull collection - lihat koleksi",
      prefix + "gachapull rates - lihat rate",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "collection" || sub === "koleksi" || sub === "inv") {
    const owned = Object.values(gdata.collection);
    if (owned.length === 0) {
      await m.reply(novaError("GachaPull", "Koleksi kosong nih! Ketik " + prefix + "gachapull buat mulai"));
      return { handled: true };
    }
    const sorted = owned.sort((a, b) => b.stars - a.stars);
    const list = sorted.map(c => "[" + c.rarity + "] " + "★".repeat(c.stars) + " " + c.name + " (" + c.element + ") x" + c.count + " | ATK:" + c.atk + " DEF:" + c.def + " HP:" + c.hp).join("\n");
    await m.reply(claraWrap("Gacha Collection", [
      "Total pulls: " + gdata.totalPulls,
      "Unique: " + owned.length + "/" + (CHARACTERS.length * RARITIES.length),
      "Duplicates: " + gdata.duplicates,
      "",
      list,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "rates" || sub === "rate") {
    const list = RARITIES.map(r => r.name + " (" + r.color + "): " + r.weight + "% - " + "★".repeat(r.stars)).join("\n");
    await m.reply(claraWrap("Gacha Rates", [
      "Cost: " + PULL_COST + " coins/pull",
      "",
      list,
      "",
      "Total chars: " + CHARACTERS.length,
      "Elements: " + [...new Set(CHARACTERS.map(c => c.element))].join(", "),
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek") {
    await m.reply(claraWrap("Gacha Stats", [
      "Total pulls: " + gdata.totalPulls,
      "Coins spent: " + gdata.coinsSpent,
      "Unique cards: " + Object.keys(gdata.collection).length,
      "Duplicates: " + gdata.duplicates,
      "Coin sekarang: " + (user.coin || 0),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Gacha", [
    "GACHA COLLECTION SYSTEM",
    "",
    prefix + "gachapull - pull 1x (" + PULL_COST + " coins)",
    prefix + "gachapull x10 - pull 10x (" + (PULL_COST * 10) + " coins)",
    prefix + "gachapull collection - lihat koleksi",
    prefix + "gachapull rates - lihat drop rate",
    prefix + "gachapull stats - statistik",
    "",
    "Rarity: N, R, SR, SSR, UR",
    "Stars: 1-5",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
