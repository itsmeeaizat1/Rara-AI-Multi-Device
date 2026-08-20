// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Dream — Eksplorasi alam mimpi, high-risk high-reward神秘
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgdream",
  alias: ["dreamrpg", "alamimpi", "mimpi", "eksplorasimimpi", "dreamrealm"],
  category: "rpg",
  description: "RPG Dream — Eksplorasi alam mimpi, high-risk high-reward",
  usage: ".rpgdream sleep — Tidur & masuk alam mimpi\n.rpgdream <pilih 1-4> — Pilih jalan mimpi\n.rpgdream wake — Bangun (tarik hasil)\n.rpgdream info — Statistik",
  example: ".rpgdream sleep\n.rpgdream 2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 12,
  isEnabled: true,
};

const STAMINA_COST = 15;
const MAX_DEPTH = 5;

const DREAM_PATHS = [
  { id: 1, name: "Hutan Glimer", emoji: "🌲", desc: "Pohon bercahaya" },
  { id: 2, name: "Sungai Bintang", emoji: "🌌", desc: "Air berkilau bintang" },
  { id: 3, name: "Gua Kristal", emoji: "💎", desc: "Dinding kristal murni" },
  { id: 4, name: "Menara Kabut", emoji: "🗼", desc: "Menara menjulang" },
];

const DREAM_EVENTS = [
  { id: "treasure", weight: 20, emoji: "💰", type: "good", desc: "Peti harta mimpi!" },
  { id: "lucid", weight: 15, emoji: "✨", type: "great", desc: "Mimpi jernih, kontrol penuh!" },
  { id: "nightmare", weight: 25, emoji: "👹", type: "bad", desc: "Mimpi buruk menyerang!" },
  { id: "spirit", weight: 15, emoji: "👻", type: "bad", desc: "Roh mimpi muncul" },
  { id: "peaceful", weight: 15, emoji: "🌈", type: "neutral", desc: "Mimpi damai" },
  { id: "vision", weight: 10, emoji: "🔮", type: "great", desc: "Penglihatan masa depan!" },
];

function rollEvent() {
  const total = DREAM_EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of DREAM_EVENTS) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return DREAM_EVENTS[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Dream", [
        "ALAM MIMPI",
        "Tidur, eksplorasi mimpi, dapat hadiah langka",
        "Makin dalam makin besar hadiah, tapi makin bahaya",
        "Max kedalaman: " + MAX_DEPTH + " | Stamina: -" + STAMINA_COST,
        "",
        "PERINTAH:",
        usedPrefix + "rpgdream sleep - Tidur & mulai",
        usedPrefix + "rpgdream <1-4> - Pilih jalan",
        usedPrefix + "rpgdream wake - Bangun & tarik hadiah",
        usedPrefix + "rpgdream info - Statistik",
        "",
        "Bangun kapan saja untuk amankan hadiah",
        "Tidur terlalu lama = mimpi buruk bisa hilangkan semua!",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.dreamStats || {};
      const lines = [
        "STATISTIK MIMPI",
        "Total tidur: " + (stats.sleeps || 0),
        "Max kedalaman: " + (stats.maxDepth || 0),
        "Harta total: " + (stats.totalGold || 0) + "g",
        "Exp total: " + (stats.totalExp || 0),
        "Nightmare: " + (stats.nightmares || 0),
        "Lucid dreams: " + (stats.lucid || 0),
      ];
      return m.reply(claraWrap("RPG Dream", lines, "info"));
    }

    if (action === "sleep") {
      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Dream", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);
      player.dreamRun = {
        depth: 1,
        gold: 0,
        exp: 0,
        startTime: Date.now(),
        nightmareRisk: 0,
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Dream", [
        "Kamu tertidur...",
        "🎮 Alam Mimpi - Kedalaman 1/" + MAX_DEPTH,
        "",
        "Pilih jalan:",
        "1. 🌲 Hutan Glimer",
        "2. 🌌 Sungai Bintang",
        "3. 💎 Gua Kristal",
        "4. 🗼 Menara Kabut",
        "",
        usedPrefix + "rpgdream <1-4> - Pilih jalan",
        usedPrefix + "rpgdream wake - Bangun",
      ], "info"));
    }

    if (action === "wake") {
      const run = player.dreamRun;
      if (!run) {
        return m.reply(claraWrap("RPG Dream", "Kamu sedang terjaga! Tidur: " + usedPrefix + "rpgdream sleep", "warn"));
      }

      addGold(m, run.gold);
      addExp(m, run.exp);

      if (!player.dreamStats) player.dreamStats = {};
      player.dreamStats.sleeps = (player.dreamStats.sleeps || 0) + 1;
      player.dreamStats.totalGold = (player.dreamStats.totalGold || 0) + run.gold;
      player.dreamStats.totalExp = (player.dreamStats.totalExp || 0) + run.exp;
      player.dreamStats.maxDepth = Math.max(player.dreamStats.maxDepth || 0, run.depth);

      delete player.dreamRun;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Dream", [
        "KAMU BANGUN!",
        "Kedalaman: " + run.depth + "/" + MAX_DEPTH,
        "Gold: +" + run.gold,
        "Exp: +" + run.exp,
        "",
        "Tidur lagi: " + usedPrefix + "rpgdream sleep",
      ], "info"));
    }

    // Choose path (1-4)
    const pathNum = parseInt(action);
    if (pathNum >= 1 && pathNum <= 4) {
      const run = player.dreamRun;
      if (!run) {
        return m.reply(claraWrap("RPG Dream", "Kamu sedang terjaga! Tidur: " + usedPrefix + "rpgdream sleep", "warn"));
      }

      if (Date.now() - run.startTime > 180000) {
        // Auto-wake if too long
        addGold(m, Math.round(run.gold * 0.5));
        delete player.dreamRun;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Dream", "Mimpi menghilang... Kamu bangun otomatis. Hadiah dikurangi 50%.", "warn"));
      }

      const path = DREAM_PATHS[pathNum - 1];
      const event = rollEvent();
      run.nightmareRisk += 5;

      const lines = [
        "🎮 Kedalaman " + run.depth + "/" + MAX_DEPTH,
        "Jalan: " + path.emoji + " " + path.name,
        "",
        event.emoji + " " + event.desc,
      ];

      if (event.type === "good") {
        const gold = 500 * run.depth + Math.floor(Math.random() * 1000);
        const exp = 100 * run.depth;
        run.gold += gold;
        run.exp += exp;
        lines.push("Gold: +" + gold + " | Exp: +" + exp);
      } else if (event.type === "great") {
        const gold = 2000 * run.depth + Math.floor(Math.random() * 3000);
        const exp = 500 * run.depth;
        run.gold += gold;
        run.exp += exp;
        lines.push("JACKPOT! Gold: +" + gold + " | Exp: +" + exp);
        if (!player.dreamStats) player.dreamStats = {};
        player.dreamStats.lucid = (player.dreamStats.lucid || 0) + 1;
      } else if (event.type === "bad") {
        const loss = Math.round(run.gold * 0.3);
        run.gold = Math.max(0, run.gold - loss);
        lines.push("Nightmare! Kehilangan " + loss + " gold dari mimpi");
        if (!player.dreamStats) player.dreamStats = {};
        player.dreamStats.nightmares = (player.dreamStats.nightmares || 0) + 1;

        // 30% chance nightmare forces wake
        if (Math.random() < 0.3) {
          addGold(m, run.gold);
          addExp(m, run.exp);
          lines.push("");
          lines.push("Nightmare terlalu kuat! Kamu terbangun.");
          lines.push("Gold: +" + run.gold + " | Exp: +" + run.exp);
          delete player.dreamRun;
          savePlayer(m, player);
          return m.reply(claraWrap("RPG Dream", lines, "warn"));
        }
      } else {
        // neutral
        const exp = 50 * run.depth;
        run.exp += exp;
        lines.push("Mimpi damai... Exp: +" + exp);
      }

      // Check max depth
      if (run.depth >= MAX_DEPTH) {
        const bonus = 3000;
        run.gold += bonus;
        addGold(m, run.gold);
        addExp(m, run.exp);
        lines.push("");
        lines.push("MAX KEDALAMAN! Bonus: +" + bonus + " gold");
        lines.push("Total: +" + run.gold + "g | +" + run.exp + " exp");
        if (!player.dreamStats) player.dreamStats = {};
        player.dreamStats.sleeps = (player.dreamStats.sleeps || 0) + 1;
        player.dreamStats.totalGold = (player.dreamStats.totalGold || 0) + run.gold;
        player.dreamStats.totalExp = (player.dreamStats.totalExp || 0) + run.exp;
        player.dreamStats.maxDepth = MAX_DEPTH;
        delete player.dreamRun;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Dream", lines, "info"));
      }

      run.depth++;
      lines.push("");
      lines.push("Kedalaman " + run.depth + "/" + MAX_DEPTH);
      lines.push("Pilih: " + usedPrefix + "rpgdream <1-4>");
      lines.push("Bangun: " + usedPrefix + "rpgdream wake");
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Dream", lines, event.type === "bad" ? "warn" : "info"));
    }

    return m.reply(claraWrap("RPG Dream", "Perintah: sleep, 1-4, wake, info", "warn"));
  } catch (e) {
    console.error("[RpgDream]", e);
    return m.reply(claraWrap("RPG Dream", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
