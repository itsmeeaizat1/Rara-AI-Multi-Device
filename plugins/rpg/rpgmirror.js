// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mirror — Cermin kebenaran, refleksi diri untuk buff/kutukan
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgmirror",
  alias: ["mirrorrpg", "cerminkebenaran", "refleksi", "cermin", "mirrortruth"],
  category: "rpg",
  description: "RPG Mirror — Cermin kebenaran, refleksi diri untuk buff atau kutukan",
  usage: ".rpgmirror gaze — Menatap cermin (biaya 1000g)\n.rpgmirror shatter — Pecahkan cermin (risiko besar)\n.rpgmirror info — Status refleksi & statistik\n.rpgmirror cleanse — Bersihkan refleksi negatif (2000g)",
  example: ".rpgmirror gaze\n.rpgmirror shatter",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 8,
  isEnabled: true,
};

const GAZE_COST = 1000;
const CLEANSE_COST = 2000;
const SHATTER_RISK = 0.4;

const REFLECTIONS = [
  // Positive
  { id: "hero", name: "Refleksi Pahlawan", emoji: "🦸", type: "positive", gold: 2000, exp: 500, buff: "bravery", duration: 3600, desc: "Keberanian membara dalam dirimu" },
  { id: "sage", name: "Refleksi Bijaksana", emoji: "🧙", type: "positive", gold: 1000, exp: 1000, buff: "wisdom", duration: 3600, desc: "Kebijaksanaan mengalir" },
  { id: "guardian", name: "Refleksi Penjaga", emoji: "🛡️", type: "positive", gold: 1500, exp: 600, buff: "protection", duration: 3600, desc: "Perlindungan abadi" },
  { id: "champion", name: "Refleksi Juara", emoji: "🏆", type: "great", gold: 5000, exp: 1500, buff: "champion", duration: 1800, desc: "Aura juara menyelimuti" },
  // Negative
  { id: "shadow", name: "Refleksi Bayangan", emoji: "👤", type: "negative", gold: -500, exp: 100, buff: "doubt", duration: 1800, desc: "Keraguan muncul dari kegelapan" },
  { id: "void", name: "Refleksi Void", emoji: "🕳️", type: "negative", gold: -800, exp: 0, buff: "void", duration: 1800, desc: "Kekosongan meresap" },
  { id: "fear", name: "Refleksi Ketakutan", emoji: "😱", type: "negative", gold: -300, exp: 50, buff: "fear", duration: 3600, desc: "Ketakutan menjalar" },
  // Legendary
  { id: "divine", name: "Refleksi Dewa", emoji: "✨", type: "legendary", gold: 10000, exp: 5000, buff: "divine", duration: 3600, desc: "Cahaya dewa memancar dari cermin" },
];

const RARITY_WEIGHTS = { positive: 35, negative: 35, great: 20, legendary: 10 };

function rollReflection() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let selectedType = "positive";
  for (const [type, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { selectedType = type; break; }
  }
  const pool = REFLECTIONS.filter(r => r.type === selectedType);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Mirror", [
        "CERMIN KEBENARAN",
        "Menatap cermin untuk melihat refleksi jiwa",
        "Refleksi bisa buff atau kutukan!",
        "",
        "TIPE REFLEKSI:",
        "Positive (35%) - buff & gold",
        "Negative (35%) - debuff & rugi",
        "Great (20%) - buff besar",
        "Legendary (10%) - RARE, buff dewa",
        "",
        "PERINTAH:",
        usedPrefix + "rpgmirror gaze - Menatap (" + GAZE_COST + "g)",
        usedPrefix + "rpgmirror shatter - Pecah (HIGH RISK)",
        usedPrefix + "rpgmirror cleanse - Bersihkan negatif (" + CLEANSE_COST + "g)",
        usedPrefix + "rpgmirror info - Status",
      ], "info"));
    }

    if (action === "info") {
      const buff = player.mirrorReflection;
      const stats = player.mirrorStats || {};
      const lines = [
        "STATISTIK CERMIN",
        "Total menatap: " + (stats.gazes || 0),
        "Positive: " + (stats.positive || 0),
        "Negative: " + (stats.negative || 0),
        "Great: " + (stats.great || 0),
        "Legendary: " + (stats.legendary || 0) + " RARE",
        "Pecah: " + (stats.shattered || 0),
      ];

      if (buff && buff.expires > Date.now()) {
        const remaining = Math.round((buff.expires - Date.now()) / 60000);
        lines.push("");
        lines.push("REFLEKSI AKTIF:");
        lines.push(buff.emoji + " " + buff.name);
        lines.push("Buff: " + buff.buff + " | Sisa: " + remaining + " menit");
      } else {
        lines.push("");
        lines.push("Refleksi: Tidak ada");
      }

      return m.reply(claraWrap("RPG Mirror", lines, "info"));
    }

    if (action === "gaze") {
      if ((player.gold || 0) < GAZE_COST) {
        return m.reply(claraWrap("RPG Mirror", "Gold kurang! Butuh: " + GAZE_COST, "warn"));
      }

      addGold(m, -GAZE_COST);
      const reflection = rollReflection();
      const now = Date.now();

      // Apply gold/exp
      if (reflection.gold > 0) addGold(m, reflection.gold);
      else if (reflection.gold < 0) {
        const loss = Math.min(Math.abs(reflection.gold), player.gold || 0);
        addGold(m, -loss);
      }
      if (reflection.exp > 0) addExp(m, reflection.exp);

      // Apply buff
      player.mirrorReflection = {
        id: reflection.id,
        name: reflection.name,
        emoji: reflection.emoji,
        buff: reflection.buff,
        type: reflection.type,
        expires: now + reflection.duration * 1000,
      };

      if (!player.mirrorStats) player.mirrorStats = {};
      player.mirrorStats.gazes = (player.mirrorStats.gazes || 0) + 1;
      player.mirrorStats[reflection.type] = (player.mirrorStats[reflection.type] || 0) + 1;
      savePlayer(m, player);

      const goldStr = reflection.gold >= 0 ? "+" + reflection.gold : "" + reflection.gold;
      const lines = [
        "MENATAP CERMIN...",
        "",
        reflection.emoji + " " + reflection.name,
        reflection.desc,
        "",
        "Gold: " + goldStr + " | Exp: +" + reflection.exp,
        "Buff: " + reflection.buff + " (" + Math.round(reflection.duration / 60) + " menit)",
      ];

      if (reflection.type === "legendary") {
        lines.push("");
        lines.push("LEGENDARY REFLECTION! ✨");
      }

      return m.reply(claraWrap("RPG Mirror", lines, reflection.type === "negative" ? "warn" : "info"));
    }

    if (action === "shatter") {
      // Shatter mirror: 40% chance huge reward, 60% terrible curse
      if ((player.gold || 0) < GAZE_COST) {
        return m.reply(claraWrap("RPG Mirror", "Gold kurang! Butuh: " + GAZE_COST, "warn"));
      }

      addGold(m, -GAZE_COST);

      if (Math.random() < SHATTER_RISK) {
        // Win big
        const goldReward = 15000 + Math.floor(Math.random() * 10000);
        const expReward = 5000;
        addGold(m, goldReward);
        addExp(m, expReward);

        player.mirrorReflection = {
          id: "shattered_god",
          name: "Refleksi Shattered God",
          emoji: "💎",
          buff: "shattered",
          type: "legendary",
          expires: Date.now() + 3600 * 1000,
        };

        if (!player.mirrorStats) player.mirrorStats = {};
        player.mirrorStats.shattered = (player.mirrorStats.shattered || 0) + 1;
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Mirror", [
          "CERMIN DIPECAHKAN!",
          "💎 Cahaya dewa keluar dari pecahan!",
          "",
          "Gold: +" + goldReward,
          "Exp: +" + expReward,
          "Buff: Shattered God (1 jam)",
          "",
          "RISIKO BERHASIL!",
        ], "info"));
      } else {
        // Terrible curse
        const goldLoss = Math.min(5000, player.gold || 0);
        addGold(m, -goldLoss);

        player.mirrorReflection = {
          id: "shattered_curse",
          name: "Kutukan Cermin Pecah",
          emoji: "💥",
          buff: "cursed",
          type: "negative",
          expires: Date.now() + 3600 * 1000,
        };

        if (!player.mirrorStats) player.mirrorStats = {};
        player.mirrorStats.shattered = (player.mirrorStats.shattered || 0) + 1;
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Mirror", [
          "CERMIN DIPECAHKAN!",
          "💥 Kutukan 7 tahun keluar!",
          "",
          "Gold: -" + goldLoss,
          "Buff: Cursed (1 jam)",
          "",
          "RISIKO GAGAL! Hati-hati!",
        ], "warn"));
      }
    }

    if (action === "cleanse") {
      if (!player.mirrorReflection || player.mirrorReflection.type !== "negative") {
        return m.reply(claraWrap("RPG Mirror", "Tidak ada refleksi negatif untuk dibersihkan", "warn"));
      }

      if ((player.gold || 0) < CLEANSE_COST) {
        return m.reply(claraWrap("RPG Mirror", "Gold kurang! Butuh: " + CLEANSE_COST, "warn"));
      }

      addGold(m, -CLEANSE_COST);
      delete player.mirrorReflection;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Mirror", [
        "Refleksi negatif dibersihkan!",
        "Biaya: " + CLEANSE_COST + " gold",
        "Cermin kembali bersih.",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Mirror", "Perintah: gaze, shatter, cleanse, info", "warn"));
  } catch (e) {
    console.error("[RpgMirror]", e);
    return m.reply(claraWrap("RPG Mirror", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
