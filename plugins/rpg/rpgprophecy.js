// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Prophecy — Ramalan harian, prediksi keberuntungan untuk hari itu
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgprophecy",
  alias: ["prophecrpg", "ramalan", "nubuarpg", "prophecy", "ramalanharian"],
  category: "rpg",
  description: "RPG Prophecy — Ramalan harian, prediksi luck & event untuk hari itu",
  usage: ".rpgprophecy — Lihat ramalan hari ini (1x/hari)\n.rpgprophecy fulfill — Penuhi nubuat untuk bonus\n.rpgprophecy info — Statistik",
  example: ".rpgprophecy\n.rpgprophecy fulfill",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const DAILY_COOLDOWN = 20 * 60 * 60 * 1000;

const PROPHECIES = [
  {
    id: "goldhunt",
    text: "Harta tersembunyi menanti di hutan. Buruan 3x hari ini untuk menemukannya.",
    quest: { action: "hunt", count: 3 },
    reward: { gold: 3000, exp: 500 },
    luck: 1.3,
  },
  {
    id: "battle",
    text: "Musuh besar muncul. Selesaikan 2 battle untuk mendapat berkah kekuatan.",
    quest: { action: "battle", count: 2 },
    reward: { gold: 5000, exp: 800 },
    luck: 1.5,
  },
  {
    id: "gather",
    text: "Material langka bertebaran. Kumpulkan resource 3x untuk bonus.",
    quest: { action: "gather", count: 3 },
    reward: { gold: 2000, exp: 400 },
    luck: 1.2,
  },
  {
    id: "fish",
    text: "Ikan legendaris terlihat. Mancing 2x untuk menangkapnya.",
    quest: { action: "fish", count: 2 },
    reward: { gold: 2500, exp: 450 },
    luck: 1.25,
  },
  {
    id: "merchant",
    text: "Pedagang misterius datang. Lakukan 1 transaksi untuk diskon rahasia.",
    quest: { action: "shop", count: 1 },
    reward: { gold: 1500, exp: 300 },
    luck: 1.1,
  },
  {
    id: "boss",
    text: "Sang Bos terbangun. Hadapi 1 boss untuk hadiah legendaris.",
    quest: { action: "boss", count: 1 },
    reward: { gold: 8000, exp: 1500 },
    luck: 2.0,
  },
];

const LUCK_FORECASTS = [
  { text: "Keberuntungan tinggi! Bonus gold +20% hari ini", goldMult: 0.2, expMult: 0 },
  { text: "Hari pengetahuan. Bonus exp +25% hari ini", goldMult: 0, expMult: 0.25 },
  { text: "Hari seimbang. +10% gold & exp", goldMult: 0.1, expMult: 0.1 },
  { text: "Hari sulit. Semua reward -10%, tapi exp quest 2x", goldMult: -0.1, expMult: 0.5 },
  { text: "Hari langka! +30% semua reward!", goldMult: 0.3, expMult: 0.3 },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Prophecy", [
        "RAMALAN HARIAN",
        "Dapatkan ramalan & quest harian untuk bonus",
        "Setiap hari: 1 ramalan + 1 nubuat (quest)",
        "",
        "PERINTAH:",
        usedPrefix + "rpgprophecy - Lihat ramalan hari ini",
        usedPrefix + "rpgprophecy fulfill - Tuntaskan nubuat",
        usedPrefix + "rpgprophecy info - Statistik",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.prophecyStats || {};
      const lines = [
        "STATISTIK PROPHECY",
        "Total ramalan: " + (stats.reads || 0),
        "Nubuat dituntaskan: " + (stats.fulfilled || 0),
        "Total gold dari nubuat: " + (stats.totalGold || 0),
        "Total exp dari nubuat: " + (stats.totalExp || 0),
      ];

      const prop = player.activeProphecy;
      if (prop && !prop.fulfilled) {
        const prophecy = PROPHECIES.find(p => p.id === prop.id);
        if (prophecy) {
          lines.push("");
          lines.push("NUBUAT AKTIF:");
          lines.push(prophecy.text);
          lines.push("Progress: " + (prop.progress || 0) + "/" + prophecy.quest.count);
        }
      }

      const canRead = !player.lastProphecyRead || Date.now() - player.lastProphecyRead >= DAILY_COOLDOWN;
      lines.push("");
      lines.push(canRead ? "Ramalan tersedia! " + usedPrefix + "rpgprophecy" : "Ramalan cooldown");

      return m.reply(claraWrap("RPG Prophecy", lines, "info"));
    }

    if (action === "fulfill") {
      const prop = player.activeProphecy;
      if (!prop) {
        return m.reply(claraWrap("RPG Prophecy", "Tidak ada nubuat aktif. Baca: " + usedPrefix + "rpgprophecy", "warn"));
      }

      if (prop.fulfilled) {
        return m.reply(claraWrap("RPG Prophecy", "Nubuat sudah dituntaskan!", "warn"));
      }

      const prophecy = PROPHECIES.find(p => p.id === prop.id);
      if (!prophecy) {
        delete player.activeProphecy;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Prophecy", "Nubuat tidak valid!", "warn"));
      }

      const progress = prop.progress || 0;
      if (progress < prophecy.quest.count) {
        return m.reply(claraWrap("RPG Prophecy", [
          "Nubuat belum selesai!",
          prophecy.text,
          "Progress: " + progress + "/" + prophecy.quest.count,
          "",
          "Lakukan aksi " + (prophecy.quest.count - progress) + "x lagi",
        ], "warn"));
      }

      // Fulfill!
      addGold(m, prophecy.reward.gold);
      addExp(m, prophecy.reward.exp);

      prop.fulfilled = true;
      if (!player.prophecyStats) player.prophecyStats = {};
      player.prophecyStats.fulfilled = (player.prophecyStats.fulfilled || 0) + 1;
      player.prophecyStats.totalGold = (player.prophecyStats.totalGold || 0) + prophecy.reward.gold;
      player.prophecyStats.totalExp = (player.prophecyStats.totalExp || 0) + prophecy.reward.exp;

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Prophecy", [
        "NUBUAT TUNTAS!",
        prophecy.text,
        "",
        "Gold: +" + prophecy.reward.gold,
        "Exp: +" + prophecy.reward.exp,
        "Luck hari ini: " + prophecy.luck + "x",
      ], "info"));
    }

    // Read daily prophecy
    if (player.lastProphecyRead && Date.now() - player.lastProphecyRead < DAILY_COOLDOWN) {
      const remaining = Math.round((DAILY_COOLDOWN - (Date.now() - player.lastProphecyRead)) / 3600000);
      return m.reply(claraWrap("RPG Prophecy", "Ramalan " + remaining + " jam lagi", "warn"));
    }

    // Generate prophecy
    const prophecy = PROPHECIES[Math.floor(Math.random() * PROPHECIES.length)];
    const forecast = LUCK_FORECASTS[Math.floor(Math.random() * LUCK_FORECASTS.length)];

    player.lastProphecyRead = Date.now();
    player.activeProphecy = {
      id: prophecy.id,
      progress: 0,
      fulfilled: false,
      luck: prophecy.luck,
      forecast: forecast,
    };

    if (!player.prophecyStats) player.prophecyStats = {};
    player.prophecyStats.reads = (player.prophecyStats.reads || 0) + 1;
    savePlayer(m, player);

    return m.reply(claraWrap("RPG Prophecy", [
      "RAMALAN HARI INI",
      "",
      "📈 PREDIKSI:",
      forecast.text,
      "",
      "🔮 NUBUAT:",
      prophecy.text,
      "Quest: " + prophecy.quest.action + " " + prophecy.quest.count + "x",
      "Reward: " + prophecy.reward.gold + "g + " + prophecy.reward.exp + " exp",
      "Luck: " + prophecy.luck + "x",
      "",
      "Tuntaskan nubuat: " + usedPrefix + "rpgprophecy fulfill",
    ], "info"));
  } catch (e) {
    console.error("[RpgProphecy]", e);
    return m.reply(claraWrap("RPG Prophecy", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
