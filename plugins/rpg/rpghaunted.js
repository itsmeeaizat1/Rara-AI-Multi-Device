// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Haunted — Rumah berhantu, eksplorasi high-risk high-reward
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpghaunted",
  alias: ["hauntedrpg", "rumahhantu", "berhantu", "ghosthouse", "eksplorasihantu"],
  category: "rpg",
  description: "RPG Haunted — Rumah berhantu, eksplorasi high-risk high-reward",
  usage: ".rpghaunted enter — Masuk rumah hantu (min level 5)\n.rpghaunted <pilih> — Pilih pintu (a/b/c)\n.rpghaunted info — Info & statistik",
  example: ".rpghaunted enter\n.rpghaunted a",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 30,
  energi: 15,
  isEnabled: true,
};

const MIN_LEVEL = 5;
const STAMINA_COST = 20;

// Room outcomes
const ROOM_TYPES = [
  { id: "treasure", weight: 25, emoji: "💰", desc: "Ruang harta!", type: "good" },
  { id: "ghost", weight: 30, emoji: "👻", desc: "Hantu menyerang!", type: "bad" },
  { id: "trap", weight: 20, emoji: "🪤", desc: "Jebakan!", type: "bad" },
  { id: "empty", weight: 15, emoji: "🕯️", desc: "Ruang kosong...", type: "neutral" },
  { id: "mimic", weight: 5, emoji: "📦", desc: "Peti berhantu (Mimic)!", type: "boss" },
  { id: "exit", weight: 5, emoji: "🚪", desc: "Pintu keluar dengan hadiah!", type: "exit" },
];

function rollRoom() {
  const total = ROOM_TYPES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of ROOM_TYPES) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return ROOM_TYPES[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help" || action === "info") {
      const lines = [
        "RUMAH BERHANTU",
        "Eksplorasi high-risk high-reward",
        "Min level: " + MIN_LEVEL + " | Stamina: -" + STAMINA_COST,
        "",
        "SETIAP RUANGAN PUNYA 3 PINTU (a/b/c)",
        "Pilih pintu, temukan hasilnya",
        "",
        "MUNGKIN DITEMUKAN:",
        "💰 Harta (gold besar)",
        "👻 Hantu (kurang HP/gold)",
        "🪤 Jebakan (kurang stamina)",
        "🕯️ Kosong (tidak ada apa-apa)",
        "📦 Mimic (boss fight, hadiah besar)",
        "🚪 Pintu keluar (bonus + selesai)",
        "",
        "PERINTAH:",
        usedPrefix + "rpghaunted enter - Masuk",
        usedPrefix + "rpghaunted <a/b/c> - Pilih pintu",
      ];

      if (player.hauntedStats) {
        lines.push("");
        lines.push("STATISTIK:");
        lines.push("Eksplorasi: " + (player.hauntedStats.runs || 0));
        lines.push("Harta total: " + (player.hauntedStats.totalGold || 0) + " gold");
        lines.push("Mimic dikalahkan: " + (player.hauntedStats.mimics || 0));
      }

      return m.reply(claraWrap("RPG Haunted", lines, "info"));
    }

    if (action === "enter") {
      if ((player.level || 0) < MIN_LEVEL) {
        return m.reply(claraWrap("RPG Haunted", "Level belum cukup! Butuh: " + MIN_LEVEL, "warn"));
      }
      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Haunted", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);
      player.hauntedRun = {
        room: 1,
        gold: 0,
        startTime: Date.now(),
        choices: [],
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Haunted", [
        "MEMASUKI RUMAH BERHANTU",
        "Stamina: -" + STAMINA_COST,
        "",
        "Ruangan 1 — 3 pintu di depanmu",
        "A. " + "🚪 Pintu kayu",
        "B. " + "🚪 Pintu besi",
        "C. " + "🚪 Pintu merah",
        "",
        "Pilih: " + usedPrefix + "rpghaunted a (atau b/c)",
      ], "info"));
    }

    // Choosing a door
    if (["a", "b", "c"].includes(action)) {
      const run = player.hauntedRun;
      if (!run) {
        return m.reply(claraWrap("RPG Haunted", "Tidak sedang di rumah hantu. Ketik " + usedPrefix + "rpghaunted enter", "warn"));
      }

      // Expire after 3 minutes
      if (Date.now() - run.startTime > 180000) {
        delete player.hauntedRun;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Haunted", "Waktu habis! Kamu kabur dari rumah hantu.", "warn"));
      }

      const room = rollRoom();
      run.choices.push({ door: action, room: room.id, roomNum: run.room });

      let lines = ["Ruangan " + run.room + " — Pintu " + action.toUpperCase(), room.emoji + " " + room.desc, ""];

      if (room.type === "good") {
        const goldFound = 500 + Math.floor(Math.random() * 2000) * run.room;
        run.gold += goldFound;
        addGold(m, goldFound);
        addExp(m, goldFound / 10);
        lines.push("Dapat " + goldFound + " gold!");
        lines.push("Exp: +" + Math.round(goldFound / 10));
      } else if (room.type === "bad") {
        if (room.id === "ghost") {
          const dmg = 10 + run.room * 5;
          const goldLost = Math.min(run.gold, 200 + run.room * 100);
          run.gold -= goldLost;
          lines.push("HP -" + dmg + " | Gold hilang: " + goldLost);
          if ((player.health || 100) <= dmg) {
            lines.push("");
            lines.push("Kamu pingsan! Eksplorasi berakhir.");
            delete player.hauntedRun;
            savePlayer(m, player);
            return m.reply(claraWrap("RPG Haunted", lines, "warn"));
          }
        } else if (room.id === "trap") {
          lines.push("Stamina -" + (10 + run.room * 3));
        }
      } else if (room.type === "boss") {
        // Mimic fight
        const playerPower = (player.level || 1) * 10 + Math.random() * 50;
        const mimicPower = 30 + run.room * 15 + Math.random() * 30;
        if (playerPower > mimicPower) {
          const goldReward = 3000 + run.room * 2000;
          run.gold += goldReward;
          addGold(m, goldReward);
          addExp(m, goldReward / 5);
          lines.push("Mimic dikalahkan! +" + goldReward + " gold");
          if (!player.hauntedStats) player.hauntedStats = {};
          player.hauntedStats.mimics = (player.hauntedStats.mimics || 0) + 1;
        } else {
          lines.push("Mimik terlalu kuat! Kamu kabur dengan apa adanya");
        }
      } else if (room.type === "exit") {
        const bonus = 1000 + run.room * 500;
        run.gold += bonus;
        addGold(m, bonus);
        addExp(m, bonus / 5);
        lines.push("KELUAR! Bonus: +" + bonus + " gold");
        lines.push("");
        lines.push("Total eksplorasi: +" + run.gold + " gold");
        if (!player.hauntedStats) player.hauntedStats = {};
        player.hauntedStats.runs = (player.hauntedStats.runs || 0) + 1;
        player.hauntedStats.totalGold = (player.hauntedStats.totalGold || 0) + run.gold;
        delete player.hauntedRun;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Haunted", lines, "info"));
      }

      // Continue to next room
      run.room++;
      lines.push("");
      lines.push("Ruangan " + run.room + " — Pilih pintu:");
      lines.push("A. 🚪 | B. 🚪 | C. 🚪");
      lines.push(usedPrefix + "rpghaunted <a/b/c>");
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Haunted", lines, room.type === "bad" ? "warn" : "info"));
    }

    return m.reply(claraWrap("RPG Haunted", "Perintah: enter, a, b, c, info", "warn"));
  } catch (e) {
    console.error("[RpgHaunted]", e);
    return m.reply(claraWrap("RPG Haunted", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
