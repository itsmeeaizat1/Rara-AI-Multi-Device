// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import {
  getPlayer,
  ensurePlayer,
  addGold,
  addExp,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "property",
  alias: ["rumah", "tanah", "properti"],
  category: "economy",
  description: "Beli rumah/tanah, sewakan, hasilkan passive income harian",
  usage: ".property <list/buy/collect/upgrade/info>",
  example: ".property list",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const PROPERTIES = [
  { id: "kos", name: "Kost Sederhana", price: 5000, income: 50, maxLevel: 5 },
  { id: "rumah", name: "Rumah Kecil", price: 15000, income: 150, maxLevel: 5 },
  { id: "ruko", name: "Rumah Toko (Ruko)", price: 35000, income: 400, maxLevel: 5 },
  { id: "apartemen", name: "Apartemen Mewah", price: 75000, income: 900, maxLevel: 5 },
  { id: "vila", name: "Vila Pantai", price: 150000, income: 2000, maxLevel: 5 },
  { id: "hotel", name: "Hotel Bintang 5", price: 500000, income: 7000, maxLevel: 5 },
];

const UPGRADE_COST_MULT = 1.5;
const INCOME_PER_LEVEL = 1.5;

function getPropData(m) {
  const player = getPlayer(m);
  if (!player) return null;
  if (!player.properties) player.properties = [];
  return player;
}

async function handler(m, { sock, config: botConfig, args }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const player = ensurePlayer(m, m.pushName || "Player");
    if (!player) {
      return m.reply(claraWrap("Property", "Belum terdaftar di RPG. Ketik .daftarrpg dulu."));
    }

    const subCmd = (args[0] || "info").toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    if (!player.properties) player.properties = [];

    if (subCmd === "list") {
      let lines = "╎❏ Daftar Properti Tersedia:\n\n";
      for (const p of PROPERTIES) {
        lines += `╎❏ *${p.name}*\n`;
        lines += `╎  Harga  : ${p.price.toLocaleString()} gold\n`;
        lines += `╎  Income : ${p.income}/hari\n`;
        lines += `╎  Max Lv : ${p.maxLevel}\n\n`;
      }
      lines += tipText(`Ketik ${prefix}property buy <nama> untuk beli`);
      return m.reply(claraWrap("Property List", lines));
    }

    if (subCmd === "buy") {
      const target = (args[1] || "").toLowerCase();
      const prop = PROPERTIES.find((p) => p.id === target || p.name.toLowerCase().includes(target));
      if (!prop) {
        return m.reply(claraWrap("Property", `Properti tidak ditemukan. Ketik ${prefix}property list untuk lihat daftar.`));
      }

      const owned = player.properties.find((p) => p.id === prop.id);
      if (owned) {
        return m.reply(claraWrap("Property", `Kamu sudah punya *${prop.name}*! Upgrade dengan ${prefix}property upgrade ${prop.id}`));
      }

      if (player.gold < prop.price) {
        return m.reply(claraWrap("Property", `Gold kurang! Butuh ${prop.price.toLocaleString()} gold, kamu punya ${player.gold.toLocaleString()} gold.`));
      }

      player.gold -= prop.price;
      player.properties.push({
        id: prop.id,
        name: prop.name,
        level: 1,
        income: prop.income,
        lastCollect: today,
        buyDate: today,
      });
      savePlayer(m, { gold: player.gold, properties: player.properties });

      return m.reply(claraWrap("Property Bought", [
        `╎❏ *${prop.name}* berhasil dibeli!`,
        `╎❏ Harga: ${prop.price.toLocaleString()} gold`,
        `╎❏ Income: ${prop.income}/hari`,
        `╎❏ Level: 1/${prop.maxLevel}`,
        "",
        tipText(`Ketik ${prefix}property collect buat klaim income harian`),
      ].join("\n")));
    }

    if (subCmd === "collect") {
      let totalIncome = 0;
      let collected = 0;
      for (const prop of player.properties) {
        if (prop.lastCollect !== today) {
          const income = Math.floor(prop.income * Math.pow(INCOME_PER_LEVEL, prop.level - 1));
          totalIncome += income;
          prop.lastCollect = today;
          collected++;
        }
      }

      if (totalIncome === 0) {
        return m.reply(claraWrap("Property", "Semua properti sudah diklaim hari ini. Kembali besok!"));
      }

      addGold(m, totalIncome);
      savePlayer(m, { properties: player.properties });

      return m.reply(claraWrap("Property Income", [
        `╎❏ ${collected} properti diklaim`,
        `╎❏ Total income: ${totalIncome.toLocaleString()} gold`,
        `╎❏ Saldo sekarang: ${(player.gold + totalIncome).toLocaleString()} gold`,
        "",
        tipText("Klaim lagi besok ya!"),
      ].join("\n")));
    }

    if (subCmd === "upgrade") {
      const target = (args[1] || "").toLowerCase();
      const owned = player.properties.find((p) => p.id === target || p.name.toLowerCase().includes(target));
      if (!owned) {
        return m.reply(claraWrap("Property", `Properti tidak ditemukan. Ketik ${prefix}property info untuk lihat punyamu.`));
      }

      const propDef = PROPERTIES.find((p) => p.id === owned.id);
      if (owned.level >= propDef.maxLevel) {
        return m.reply(claraWrap("Property", `*${owned.name}* sudah max level (${propDef.maxLevel})!`));
      }

      const upgradeCost = Math.floor(propDef.price * Math.pow(UPGRADE_COST_MULT, owned.level));
      if (player.gold < upgradeCost) {
        return m.reply(claraWrap("Property", `Gold kurang! Upgrade butuh ${upgradeCost.toLocaleString()} gold, kamu punya ${player.gold.toLocaleString()} gold.`));
      }

      player.gold -= upgradeCost;
      owned.level += 1;
      owned.income = Math.floor(propDef.income * Math.pow(INCOME_PER_LEVEL, owned.level - 1));
      savePlayer(m, { gold: player.gold, properties: player.properties });

      return m.reply(claraWrap("Property Upgraded", [
        `╎❏ *${owned.name}* di-upgrade ke Lv.${owned.level}!`,
        `╎❏ Biaya: ${upgradeCost.toLocaleString()} gold`,
        `╎❏ Income baru: ${owned.income.toLocaleString()}/hari`,
        "",
        tipText(`Max level: ${propDef.maxLevel}`),
      ].join("\n")));
    }

    // info (default)
    if (player.properties.length === 0) {
      return m.reply(claraWrap("Property", [
        "╎❏ Kamu belum punya properti",
        `╎❏ Ketik ${prefix}property list buat lihat daftar`,
        `╎❏ Ketik ${prefix}property buy <nama> buat beli`,
      ].join("\n")));
    }

    let lines = "╎❏ Properti Kamu:\n\n";
    let totalDaily = 0;
    for (const prop of player.properties) {
      const propDef = PROPERTIES.find((p) => p.id === prop.id);
      const income = Math.floor(prop.income * Math.pow(INCOME_PER_LEVEL, prop.level - 1));
      const canCollect = prop.lastCollect !== today;
      totalDaily += income;
      lines += `╎❏ *${prop.name}* (Lv.${prop.level}/${propDef.maxLevel})\n`;
      lines += `╎  Income: ${income.toLocaleString()}/hari\n`;
      lines += `╎  Status: ${canCollect ? "Bisa klaim!" : "Sudah klaim"}\n\n`;
    }
    lines += `╎❏ Total income/hari: ${totalDaily.toLocaleString()} gold\n`;
    lines += tipText(`Ketik ${prefix}property collect buat klaim semua`);

    return m.reply(claraWrap("Property Info", lines));
  } catch (error) {
    return m.reply(claraWrap("Property", `Error: ${error.message}`));
  }
}

export { pluginConfig as config, handler };
