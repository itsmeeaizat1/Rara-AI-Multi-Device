// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Apocalypse — Event apocalypse, bertahan hidup untuk hadiah besar
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgapocalypse",
  alias: ["apocalypserpg", "kiamat", "bertahanhidup", "survivalrpg", "apocalypse"],
  category: "rpg",
  description: "RPG Apocalypse — Bertahan hidup di event apocalypse untuk hadiah besar",
  usage: ".rpgapocalypse enter — Masuk apocalypse (min Lv 10)\n.rpgapocalypse <pilih> — Pilih aksi (1-4)\n.rpgapocalypse info — Statistik\n.rpgapocalypse status — Status survival",
  example: ".rpgapocalypse enter\n.rpgapocalypse 2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 15,
  isEnabled: true,
};

const MIN_LEVEL = 10;
const STAMINA_COST = 20;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const MAX_DAYS = 7;

const THREATS = [
  { id: "horde", name: "Zombie Horde", emoji: "🧟", power: 30, weight: 25 },
  { id: "raiders", name: "Raiders", emoji: "🏴‍☠️", power: 25, weight: 20 },
  { id: "beast", name: "Mutated Beast", emoji: "🐺", power: 35, weight: 20 },
  { id: "storm", name: "Toxic Storm", emoji: "⛈️", power: 20, weight: 15 },
  { id: "famine", name: "Famine", emoji: "💀", power: 15, weight: 15 },
  { id: "boss", name: "Apocalypse Boss", emoji: "👹", power: 60, weight: 5 },
];

const ACTIONS = [
  { id: 1, name: "Fight", emoji: "⚔️", desc: "Lawan ancaman langsung" },
  { id: 2, name: "Hide", emoji: "🏚️", desc: "Bersembunyi (aman tapi sedikit reward)" },
  { id: 3, name: "Scavenge", emoji: "📦", desc: "Cari supply (gold, risk)" },
  { id: 4, name: "Fortify", emoji: "🛡️", desc: "Perkuat pertahanan (reduce damage)" },
];

function rollThreat() {
  const total = THREATS.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of THREATS) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return THREATS[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Apocalypse", [
        "EVENT APOCALYPSE",
        "Bertahan 7 hari di dunia apocalypse untuk hadiah besar!",
        "Min Lv: " + MIN_LEVEL + " | Stamina: -" + STAMINA_COST,
        "Cooldown: 2 jam setelah selesai",
        "",
        "ANCAMAN: Zombie, Raiders, Beast, Storm, Famine, Boss",
        "AKSI: Fight / Hide / Scavenge / Fortify",
        "",
        "Makin lama bertahan, makin besar hadiah!",
        "Day 7 = mega reward (50K gold + 20K exp)",
        "",
        "PERINTAH:",
        usedPrefix + "rpgapocalypse enter - Mulai",
        usedPrefix + "rpgapocalypse <1-4> - Pilih aksi",
        usedPrefix + "rpgapocalypse info - Statistik",
        usedPrefix + "rpgapocalypse status - Status survival",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.apocalypseStats || {};
      const lines = [
        "STATISTIK APOCALYPSE",
        "Total event: " + (stats.events || 0),
        "Total selesai: " + (stats.completed || 0),
        "Meninggal: " + (stats.deaths || 0),
        "Hari terlama: " + (stats.bestDay || 0) + "/7",
        "Boss dikalahkan: " + (stats.bosses || 0),
        "Total gold: " + (stats.totalGold || 0),
        "Total exp: " + (stats.totalExp || 0),
      ];

      const lastEnd = player.apocalypseEnd || 0;
      if (Date.now() < lastEnd + COOLDOWN_MS) {
        const cd = Math.round((lastEnd + COOLDOWN_MS - Date.now()) / 60000);
        lines.push("");
        lines.push("Cooldown: " + cd + " menit");
      } else {
        lines.push("");
        lines.push("Tersedia! " + usedPrefix + "rpgapocalypse enter");
      }

      return m.reply(claraWrap("RPG Apocalypse", lines, "info"));
    }

    if (action === "status") {
      const run = player.apocalypseRun;
      if (!run) {
        return m.reply(claraWrap("RPG Apocalypse", "Tidak ada event aktif. " + usedPrefix + "rpgapocalypse enter", "warn"));
      }

      const lines = [
        "STATUS SURVIVAL",
        "Hari: " + run.day + "/" + MAX_DAYS,
        "HP: " + (run.hp || 100) + "/100",
        "Defense: " + (run.defense || 0),
        "Gold terkumpul: " + (run.gold || 0),
        "Exp terkumpul: " + (run.exp || 0),
        "",
        "Pilih aksi:",
        "1. ⚔️ Fight | 2. 🏚️ Hide",
        "3. 📦 Scavenge | 4. 🛡️ Fortify",
        usedPrefix + "rpgapocalypse <1-4>",
      ];

      return m.reply(claraWrap("RPG Apocalypse", lines, "info"));
    }

    if (action === "enter") {
      if ((player.level || 0) < MIN_LEVEL) {
        return m.reply(claraWrap("RPG Apocalypse", "Level belum cukup! Butuh: " + MIN_LEVEL, "warn"));
      }
      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Apocalypse", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      const lastEnd = player.apocalypseEnd || 0;
      if (Date.now() < lastEnd + COOLDOWN_MS) {
        const cd = Math.round((lastEnd + COOLDOWN_MS - Date.now()) / 60000);
        return m.reply(claraWrap("RPG Apocalypse", "Cooldown: " + cd + " menit", "warn"));
      }

      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);
      player.apocalypseRun = {
        day: 1,
        hp: 100,
        defense: 0,
        gold: 0,
        exp: 0,
        startTime: Date.now(),
      };

      if (!player.apocalypseStats) player.apocalypseStats = {};
      player.apocalypseStats.events = (player.apocalypseStats.events || 0) + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Apocalypse", [
        "APOCALYPSE DIMULAI!",
        "Hari 1/" + MAX_DAYS,
        "HP: 100 | Defense: 0",
        "Stamina: -" + STAMINA_COST,
        "",
        "Ancaman mendekat... Pilih aksi:",
        "1. ⚔️ Fight | 2. 🏚️ Hide",
        "3. 📦 Scavenge | 4. 🛡️ Fortify",
        "",
        usedPrefix + "rpgapocalypse <1-4>",
      ], "info"));
    }

    // Choose action (1-4)
    const actNum = parseInt(action);
    if (actNum >= 1 && actNum <= 4) {
      const run = player.apocalypseRun;
      if (!run) {
        return m.reply(claraWrap("RPG Apocalypse", "Tidak ada event aktif. " + usedPrefix + "rpgapocalypse enter", "warn"));
      }

      if (Date.now() - run.startTime > 180000) {
        addGold(m, Math.round(run.gold * 0.5));
        delete player.apocalypseRun;
        player.apocalypseEnd = Date.now();
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Apocalypse", "Waktu habis! Kamu dievakuasi. Hadiah -50%.", "warn"));
      }

      const threat = rollThreat();
      const actChoice = ACTIONS.find(a => a.id === actNum);
      let damage = 0;
      let goldGain = 0;
      let expGain = 0;
      let resultText = "";

      if (actNum === 1) {
        // Fight
        const playerPower = (player.level || 1) * 5 + Math.random() * 50 + run.defense * 2;
        damage = Math.max(0, threat.power - run.defense);
        if (playerPower > threat.power) {
          goldGain = 500 * run.day + (threat.id === "boss" ? 5000 : 0);
          expGain = 200 * run.day + (threat.id === "boss" ? 2000 : 0);
          resultText = "Menang! Threan dikalahkan";
          if (threat.id === "boss") {
            if (!player.apocalypseStats) player.apocalypseStats = {};
            player.apocalypseStats.bosses = (player.apocalypseStats.bosses || 0) + 1;
          }
        } else {
          damage = Math.round(damage * 1.5);
          resultText = "Kalah! Terluka parah";
        }
      } else if (actNum === 2) {
        // Hide
        damage = 0;
        goldGain = 100 * run.day;
        expGain = 50 * run.day;
        resultText = "Bersembunyi berhasil, tapi sedikit reward";
      } else if (actNum === 3) {
        // Scavenge
        const risk = Math.random() < 0.3;
        if (risk) {
          damage = threat.power;
          resultText = "Ketemu ancaman saat scavenging!";
        } else {
          goldGain = 1000 * run.day + Math.floor(Math.random() * 2000);
          expGain = 100 * run.day;
          resultText = "Supply ditemukan!";
        }
      } else if (actNum === 4) {
        // Fortify
        run.defense = Math.min(50, run.defense + 10);
        damage = Math.max(0, threat.power - run.defense) * 0.5;
        goldGain = 200 * run.day;
        expGain = 100 * run.day;
        resultText = "Pertahanan diperkuat! Defense +" + 10 + " (total: " + run.defense + ")";
      }

      run.hp = Math.max(0, run.hp - Math.round(damage));
      run.gold += goldGain;
      run.exp += expGain;

      const lines = [
        "HARI " + run.day + "/" + MAX_DAYS,
        "Ancaman: " + threat.emoji + " " + threat.name + " (Power: " + threat.power + ")",
        "Aksi: " + actChoice.emoji + " " + actChoice.name,
        "",
        resultText,
        "Damage: -" + Math.round(damage) + " HP | HP: " + run.hp + "/100",
        "Gold: +" + goldGain + " | Exp: +" + expGain,
        "Defense: " + run.defense,
      ];

      // Check death
      if (run.hp <= 0) {
        addGold(m, Math.round(run.gold * 0.3));
        addExp(m, Math.round(run.exp * 0.3));
        if (!player.apocalypseStats) player.apocalypseStats = {};
        player.apocalypseStats.deaths = (player.apocalypseStats.deaths || 0) + 1;
        player.apocalypseStats.totalGold = (player.apocalypseStats.totalGold || 0) + Math.round(run.gold * 0.3);
        player.apocalypseStats.totalExp = (player.apocalypseStats.totalExp || 0) + Math.round(run.exp * 0.3);
        player.apocalypseStats.bestDay = Math.max(player.apocalypseStats.bestDay || 0, run.day);
        player.apocalypseEnd = Date.now();
        delete player.apocalypseRun;
        savePlayer(m, player);

        lines.push("");
        lines.push("KAMU MENINGGAL! 💀");
        lines.push("Hari bertahan: " + run.day);
        lines.push("Hadiah konsolasi: 30% (+" + Math.round(run.gold * 0.3) + "g)");
        return m.reply(claraWrap("RPG Apocalypse", lines, "warn"));
      }

      // Advance day
      run.day++;

      // Check if survived 7 days
      if (run.day > MAX_DAYS) {
        const bonusGold = 50000;
        const bonusExp = 20000;
        addGold(m, run.gold + bonusGold);
        addExp(m, run.exp + bonusExp);
        if (!player.apocalypseStats) player.apocalypseStats = {};
        player.apocalypseStats.completed = (player.apocalypseStats.completed || 0) + 1;
        player.apocalypseStats.totalGold = (player.apocalypseStats.totalGold || 0) + run.gold + bonusGold;
        player.apocalypseStats.totalExp = (player.apocalypseStats.totalExp || 0) + run.exp + bonusExp;
        player.apocalypseStats.bestDay = MAX_DAYS;
        player.apocalypseEnd = Date.now();
        delete player.apocalypseRun;
        savePlayer(m, player);

        lines.push("");
        lines.push("BERTAHAN 7 HARI! APOCALYPSE SURVIVED!");
        lines.push("Survival gold: +" + run.gold);
        lines.push("Mega bonus: +" + bonusGold + "g | +" + bonusExp + " exp");
        return m.reply(claraWrap("RPG Apocalypse", lines, "info"));
      }

      savePlayer(m, player);
      lines.push("");
      lines.push("Hari berikutnya: " + run.day + "/" + MAX_DAYS);
      lines.push("Pilih: " + usedPrefix + "rpgapocalypse <1-4>");
      return m.reply(claraWrap("RPG Apocalypse", lines, damage > 0 ? "warn" : "info"));
    }

    return m.reply(claraWrap("RPG Apocalypse", "Perintah: enter, 1-4, info, status", "warn"));
  } catch (e) {
    console.error("[RpgApocalypse]", e);
    return m.reply(claraWrap("RPG Apocalypse", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
