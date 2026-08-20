// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Aquarium — Koleksi & pamer ikan, feed untuk bonus
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgaquarium",
  alias: ["aquariumrpg", "akuarium", "pamerikan", "koleksiikan", "fishdisplay"],
  category: "rpg",
  description: "RPG Aquarium — Koleksi ikan, feed untuk bonus exp harian",
  usage: ".rpgaquarium — Lihat koleksi\n.rpgaquarium add — Tambah ikan terakhir ditangkap\n.rpgaquarium feed — Beri makan (bonus exp)\n.rpgaquarium release <nomor> — Lepas ikan\n.rpgaquarium sell <nomor> — Jual ikan langka",
  example: ".rpgaquarium\n.rpgaquarium feed",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MAX_FISH = 20;
const FEED_COST = 200;
const FEED_EXP = 30;
const FEED_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours

const RARITY_BONUS = {
  common: { sellPrice: 100, exp: 10, emoji: "⚪" },
  uncommon: { sellPrice: 300, exp: 30, emoji: "🟢" },
  rare: { sellPrice: 1000, exp: 80, emoji: "🔵" },
  epic: { sellPrice: 3000, exp: 200, emoji: "🟣" },
  legendary: { sellPrice: 10000, exp: 500, emoji: "🟡" },
};

const FISH_EMOJI = ["🐟", "🐠", "🐡", "🦈", "🐙", "🦑", "🦐", "🦞", "🦀", "🐬"];

function generateFish(player) {
  const rarityRoll = Math.random();
  let rarity = "common";
  if (rarityRoll < 0.02) rarity = "legendary";
  else if (rarityRoll < 0.08) rarity = "epic";
  else if (rarityRoll < 0.20) rarity = "rare";
  else if (rarityRoll < 0.45) rarity = "uncommon";

  const emoji = FISH_EMOJI[Math.floor(Math.random() * FISH_EMOJI.length)];
  const names = ["Nemo", "Goldie", "Shadow", "Bubbles", "Coral", "Finn", "Splash", "Tide", "Wave", "Reef"];
  const name = names[Math.floor(Math.random() * names.length)];

  return {
    id: Date.now() + Math.random(),
    name,
    emoji,
    rarity,
    caught: Date.now(),
    level: player.level || 1,
  };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Aquarium", [
        "AKUARIUM RPG",
        "Koleksi & pamer ikan langka",
        "Max: " + MAX_FISH + " ikan | Feed: " + FEED_COST + " gold/6jam",
        "",
        "RARITY:",
        "⚪ Common 45% - jual 100g",
        "🟢 Uncommon 25% - jual 300g",
        "🔵 Rare 12% - jual 1000g",
        "🟣 Epic 6% - jual 3000g",
        "🟡 Legendary 2% - jual 10000g",
        "",
        "PERINTAH:",
        usedPrefix + "rpgaquarium - Lihat koleksi",
        usedPrefix + "rpgaquarium add - Tambah ikan",
        usedPrefix + "rpgaquarium feed - Beri makan (+exp)",
        usedPrefix + "rpgaquarium release <no> - Lepas",
        usedPrefix + "rpgaquarium sell <no> - Jual",
      ], "info"));
    }

    if (action === "add") {
      if (!player.aquarium) player.aquarium = [];
      if (player.aquarium.length >= MAX_FISH) {
        return m.reply(claraWrap("RPG Aquarium", "Aquarium penuh! (" + MAX_FISH + " max). Lepas/jual dulu.", "warn"));
      }

      const fish = generateFish(player);
      player.aquarium.push(fish);
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aquarium", [
        "Ikan ditambah!",
        RARITY_BONUS[fish.rarity].emoji + " " + fish.emoji + " " + fish.name,
        "Rarity: " + fish.rarity.toUpperCase(),
        "",
        "Total: " + player.aquarium.length + "/" + MAX_FISH,
      ], "info"));
    }

    if (action === "feed") {
      if (!player.aquarium || player.aquarium.length === 0) {
        return m.reply(claraWrap("RPG Aquarium", "Aquarium kosong! Tambah ikan dulu.", "warn"));
      }

      if (player.lastFeed && Date.now() - player.lastFeed < FEED_COOLDOWN) {
        const remaining = Math.round((FEED_COOLDOWN - (Date.now() - player.lastFeed)) / 3600000);
        return m.reply(claraWrap("RPG Aquarium", "Ikan masih kenyang! " + remaining + " jam lagi.", "warn"));
      }

      if ((player.gold || 0) < FEED_COST) {
        return m.reply(claraWrap("RPG Aquarium", "Gold kurang! Butuh: " + FEED_COST, "warn"));
      }

      addGold(m, -FEED_COST);
      const totalExp = FEED_EXP * player.aquarium.length;
      addExp(m, totalExp);
      player.lastFeed = Date.now();
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aquarium", [
        "Ikan diberi makan!",
        "Jumlah ikan: " + player.aquarium.length,
        "Gold: -" + FEED_COST,
        "Exp: +" + totalExp + " (30 per ikan)",
        "",
        "Feed lagi dalam 6 jam",
      ], "info"));
    }

    if (action === "release") {
      const num = parseInt(args[1]) - 1;
      if (!player.aquarium || num < 0 || num >= player.aquarium.length) {
        return m.reply(claraWrap("RPG Aquarium", "Nomor ikan tidak valid", "warn"));
      }

      const fish = player.aquarium[num];
      const bonusExp = Math.round(RARITY_BONUS[fish.rarity].exp * 0.5);
      addExp(m, bonusExp);
      player.aquarium.splice(num, 1);
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aquarium", [
        fish.emoji + " " + fish.name + " dilepas ke laut!",
        "Exp: +" + bonusExp + " (karma baik)",
        "Sisa: " + player.aquarium.length + "/" + MAX_FISH,
      ], "info"));
    }

    if (action === "sell") {
      const num = parseInt(args[1]) - 1;
      if (!player.aquarium || num < 0 || num >= player.aquarium.length) {
        return m.reply(claraWrap("RPG Aquarium", "Nomor ikan tidak valid", "warn"));
      }

      const fish = player.aquarium[num];
      const sellPrice = RARITY_BONUS[fish.rarity].sellPrice;
      addGold(m, sellPrice);
      player.aquarium.splice(num, 1);
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aquarium", [
        "Terjual!",
        RARITY_BONUS[fish.rarity].emoji + " " + fish.emoji + " " + fish.name,
        "Rarity: " + fish.rarity.toUpperCase(),
        "Harga: +" + sellPrice + " gold",
        "Sisa: " + player.aquarium.length + "/" + MAX_FISH,
      ], "info"));
    }

    // Default: show collection
    if (!player.aquarium || player.aquarium.length === 0) {
      return m.reply(claraWrap("RPG Aquarium", [
        "Aquarium kosong!",
        "Tambah ikan: " + usedPrefix + "rpgaquarium add",
      ], "warn"));
    }

    const lines = ["AKUARIUM (" + player.aquarium.length + "/" + MAX_FISH + ")", ""];

    // Group by rarity
    const byRarity = {};
    player.aquarium.forEach((fish, idx) => {
      if (!byRarity[fish.rarity]) byRarity[fish.rarity] = [];
      byRarity[fish.rarity].push({ ...fish, index: idx + 1 });
    });

    const rarityOrder = ["legendary", "epic", "rare", "uncommon", "common"];
    for (const rarity of rarityOrder) {
      if (!byRarity[rarity]) continue;
      lines.push(RARITY_BONUS[rarity].emoji + " " + rarity.toUpperCase() + " (" + byRarity[rarity].length + "):");
      byRarity[rarity].forEach(f => {
        lines.push("  " + f.index + ". " + f.emoji + " " + f.name);
      });
    }

    const canFeed = !player.lastFeed || Date.now() - player.lastFeed >= FEED_COOLDOWN;
    lines.push("");
    lines.push(canFeed ? "Feed tersedia! " + usedPrefix + "rpgaquarium feed" : "Feed cooldown");

    return m.reply(claraWrap("RPG Aquarium", lines, "info"));
  } catch (e) {
    console.error("[RpgAquarium]", e);
    return m.reply(claraWrap("RPG Aquarium", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
