// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Dimension — Portal dimensi, masuk dimensi acak dengan rule unik
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgdimension",
  alias: ["dimensionrpg", "portaldimensi", "dimensi", "portalrpg", "dimensionportal"],
  category: "rpg",
  description: "RPG Dimension — Portal dimensi, masuk dimensi acak dengan rule unik",
  usage: ".rpgdimension enter — Buka portal (biaya)\n.rpgdimension <pilih> — Pilih aksi di dimensi\n.rpgdimension exit — Keluar dimensi\n.rpgdimension info — Statistik",
  example: ".rpgdimension enter\n.rpgdimension 2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 15,
  isEnabled: true,
};

const ENTER_COST = 1500;
const STAMINA_COST = 20;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

const DIMENSIONS = [
  {
    id: "inferno",
    name: "Dimensi Api", emoji: "🔥", color: "merah",
    modifier: "2x gold, 0.5x exp, 30% chance kehilangan gold",
    actions: [
      { id: 1, name: "Cari lava emas", emoji: "🌋", type: "gamble", risk: 0.3, mult: 2 },
      { id: 2, name: "Hadapi phoenix", emoji: "🦅", type: "combat", risk: 0.4, mult: 3 },
      { id: 3, name: "Panen fire flower", emoji: "🌺", type: "safe", risk: 0, mult: 1 },
    ],
  },
  {
    id: "frost",
    name: "Dimensi Es", emoji: "❄️", color: "biru",
    modifier: "2x exp, 0.5x gold, stamina tidak berkurang",
    actions: [
      { id: 1, name: "Tambang ice crystal", emoji: "💎", type: "safe", risk: 0, mult: 1.5 },
      { id: 2, name: "Lawan ice giant", emoji: "🧊", type: "combat", risk: 0.3, mult: 2 },
      { id: 3, name: "Pulihkan energi", emoji: "🔋", type: "rest", risk: 0, mult: 1 },
    ],
  },
  {
    id: "void",
    name: "Dimensi Void", emoji: "🌌", color: "hitam",
    modifier: "3x semua, 50% chance kena void drain",
    actions: [
      { id: 1, name: "Tarik void energy", emoji: "⚡", type: "gamble", risk: 0.5, mult: 3 },
      { id: 2, name: "Bicara void entity", emoji: "👁️", type: "combat", risk: 0.6, mult: 5 },
      { id: 3, name: "Eksplorasi void", emoji: "🕳️", type: "safe", risk: 0.1, mult: 1.5 },
    ],
  },
  {
    id: "celestial",
    name: "Dimensi Surgawi", emoji: "✨", color: "emas",
    modifier: "RARE: 4x gold, 4x exp, semua aman",
    actions: [
      { id: 1, name: "Panen star dust", emoji: "⭐", type: "safe", risk: 0, mult: 4 },
      { id: 2, name: "Terima divine gift", emoji: "🎁", type: "safe", risk: 0, mult: 5 },
      { id: 3, name: "Meditasi cahaya", emoji: "🧘", type: "rest", risk: 0, mult: 3 },
    ],
  },
];

const DIMENSION_WEIGHTS = { inferno: 30, frost: 30, void: 25, celestial: 15 };

function rollDimension() {
  const total = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return DIMENSIONS.find(d => d.id === id);
  }
  return DIMENSIONS[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Dimension", [
        "PORTAL DIMENSI",
        "Masuk dimensi acak, tiap dimensi punya rule unik!",
        "Biaya: " + ENTER_COST + "g | Stamina: -" + STAMINA_COST,
        "",
        "DIMENSI:",
        "🔥 Api (30%) 2x gold, 0.5x exp, risky",
        "❄️ Es (30%) 2x exp, 0.5x gold, aman",
        "🌌 Void (25%) 3x semua, sangat risky",
        "✨ Surgawi (15%) 4x semua, LEGENDARY",
        "",
        "PERINTAH:",
        usedPrefix + "rpgdimension enter - Buka portal",
        usedPrefix + "rpgdimension <1-3> - Pilih aksi",
        usedPrefix + "rpgdimension exit - Keluar",
        usedPrefix + "rpgdimension info - Statistik",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.dimensionStats || {};
      const lines = [
        "STATISTIK DIMENSI",
        "Total masuk: " + (stats.total || 0),
        "Api: " + (stats.inferno || 0),
        "Es: " + (stats.frost || 0),
        "Void: " + (stats.void || 0),
        "Surgawi: " + (stats.celestial || 0) + " RARE",
        "",
        "Total gold: " + (stats.totalGold || 0),
        "Total exp: " + (stats.totalExp || 0),
      ];

      const lastExit = player.dimensionExit || 0;
      if (Date.now() < lastExit + COOLDOWN_MS) {
        const cd = Math.round((lastExit + COOLDOWN_MS - Date.now()) / 60000);
        lines.push("");
        lines.push("Cooldown: " + cd + " menit");
      } else {
        lines.push("");
        lines.push("Portal tersedia!");
      }

      return m.reply(claraWrap("RPG Dimension", lines, "info"));
    }

    if (action === "enter") {
      if ((player.gold || 0) < ENTER_COST) {
        return m.reply(claraWrap("RPG Dimension", "Gold kurang! Butuh: " + ENTER_COST, "warn"));
      }
      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Dimension", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      const lastExit = player.dimensionExit || 0;
      if (Date.now() < lastExit + COOLDOWN_MS) {
        const cd = Math.round((lastExit + COOLDOWN_MS - Date.now()) / 60000);
        return m.reply(claraWrap("RPG Dimension", "Cooldown: " + cd + " menit", "warn"));
      }

      addGold(m, -ENTER_COST);
      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);

      const dimension = rollDimension();
      player.dimensionRun = {
        dimId: dimension.id,
        dimName: dimension.name,
        dimEmoji: dimension.emoji,
        gold: 0,
        exp: 0,
        startTime: Date.now(),
      };

      if (!player.dimensionStats) player.dimensionStats = {};
      player.dimensionStats.total = (player.dimensionStats.total || 0) + 1;
      player.dimensionStats[dimension.id] = (player.dimensionStats[dimension.id] || 0) + 1;

      savePlayer(m, player);

      const lines = [
        "PORTAL DIBUKA!",
        dimension.dimEmoji + " " + dimension.dimName.toUpperCase(),
        "",
        "Modifier: " + dimension.modifier,
        "",
        "PILIH AKSI:",
      ];
      dimension.actions.forEach(a => {
        lines.push(a.id + ". " + a.emoji + " " + a.name);
      });
      lines.push("");
      lines.push(usedPrefix + "rpgdimension <1-3>");
      lines.push(usedPrefix + "rpgdimension exit - Keluar");

      return m.reply(claraWrap("RPG Dimension", lines, "info"));
    }

    if (action === "exit") {
      const run = player.dimensionRun;
      if (!run) {
        return m.reply(claraWrap("RPG Dimension", "Tidak ada portal aktif. " + usedPrefix + "rpgdimension enter", "warn"));
      }

      addGold(m, run.gold);
      addExp(m, run.exp);

      if (!player.dimensionStats) player.dimensionStats = {};
      player.dimensionStats.totalGold = (player.dimensionStats.totalGold || 0) + run.gold;
      player.dimensionStats.totalExp = (player.dimensionStats.totalExp || 0) + run.exp;

      player.dimensionExit = Date.now();
      delete player.dimensionRun;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Dimension", [
        "KELUAR DIMENSI!",
        run.dimEmoji + " " + run.dimName,
        "Gold: +" + run.gold,
        "Exp: +" + run.exp,
        "",
        "Cooldown: 2 jam",
      ], "info"));
    }

    // Choose action (1-3)
    const actNum = parseInt(action);
    if (actNum >= 1 && actNum <= 3) {
      const run = player.dimensionRun;
      if (!run) {
        return m.reply(claraWrap("RPG Dimension", "Tidak ada portal aktif. " + usedPrefix + "rpgdimension enter", "warn"));
      }

      if (Date.now() - run.startTime > 180000) {
        addGold(m, Math.round(run.gold * 0.5));
        delete player.dimensionRun;
        player.dimensionExit = Date.now();
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Dimension", "Portal tertutup! Kamu terlempar keluar. Hadiah -50%.", "warn"));
      }

      const dimension = DIMENSIONS.find(d => d.id === run.dimId);
      const chosenAction = dimension.actions.find(a => a.id === actNum);
      if (!chosenAction) {
        return m.reply(claraWrap("RPG Dimension", "Aksi tidak valid (1-3)", "warn"));
      }

      const lines = [run.dimEmoji + " " + chosenAction.emoji + " " + chosenAction.name, ""];

      // Calculate result
      const isFail = chosenAction.risk > 0 && Math.random() < chosenAction.risk;
      const baseGold = 500 + Math.floor(Math.random() * 2000);
      const baseExp = 200 + Math.floor(Math.random() * 500);
      const mult = chosenAction.mult;

      if (chosenAction.type === "safe") {
        run.gold += Math.round(baseGold * mult);
        run.exp += Math.round(baseExp * mult);
        lines.push("Sukses! +" + Math.round(baseGold * mult) + "g | +" + Math.round(baseExp * mult) + " exp");
      } else if (chosenAction.type === "rest") {
        const expGain = Math.round(baseExp * mult);
        run.exp += expGain;
        player.stamina = Math.min(100, (player.stamina || 0) + 20);
        lines.push("Pulih! +" + expGain + " exp | Stamina +20");
      } else if (isFail) {
        const loss = Math.round(run.gold * 0.5);
        run.gold = Math.max(0, run.gold - loss);
        lines.push("GAGAL! Kehilangan " + loss + "g");
      } else {
        const goldGain = Math.round(baseGold * mult);
        const expGain = Math.round(baseExp * mult);
        run.gold += goldGain;
        run.exp += expGain;
        lines.push("BERHASIL! +" + goldGain + "g | +" + expGain + " exp");
      }

      savePlayer(m, player);

      lines.push("");
      lines.push("Total: " + run.gold + "g | " + run.exp + " exp");
      lines.push(usedPrefix + "rpgdimension <1-3> - Aksi lagi");
      lines.push(usedPrefix + "rpgdimension exit - Keluar");

      return m.reply(claraWrap("RPG Dimension", lines, isFail ? "warn" : "info"));
    }

    return m.reply(claraWrap("RPG Dimension", "Perintah: enter, 1-3, exit, info", "warn"));
  } catch (e) {
    console.error("[RpgDimension]", e);
    return m.reply(claraWrap("RPG Dimension", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
