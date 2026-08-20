// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Meteor — Event meteor jatuh, koleksi material langka dengan timer
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgmeteor",
  alias: ["meteorrpg", "jatuhanmeteor", "meteorshower", "koleksimeteor", "meteorite"],
  category: "rpg",
  description: "RPG Meteor — Event meteor jatuh, koleksi material langka",
  usage: ".rpgmeteor — Cek & mulai event\n.rpgmeteor collect — Koleksi meteor (butuh stamina)\n.rpgmeteor info — Statistik & info",
  example: ".rpgmeteor\n.rpgmeteor collect",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 10,
  isEnabled: true,
};

const STAMINA_COST = 15;
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between events

const METEOR_TYPES = [
  { id: "iron", name: "Meteor Besi", emoji: "🌑", weight: 40, gold: 500, exp: 50, items: { iron: 3 }, desc: "Besi meteor biasa" },
  { id: "crystal", name: "Meteor Kristal", emoji: "🔷", weight: 25, gold: 1500, exp: 150, items: { diamond: 1 }, desc: "Mengandung kristal langka" },
  { id: "gold", name: "Meteor Emas", emoji: "🟡", weight: 20, gold: 3000, exp: 300, items: { diamond: 2, iron: 5 }, desc: "Emas murni dari luar angkasa" },
  { id: "ancient", name: "Meteor Kuno", emoji: "🟣", weight: 10, gold: 6000, exp: 600, items: { diamond: 3, emerald: 2 }, desc: "Sangat langka & berharga" },
  { id: "divine", name: "Meteor Dewa", emoji: "🌟", weight: 5, gold: 15000, exp: 1500, items: { diamond: 5, emerald: 3, iron: 10 }, desc: "Legendaris! Material dewa" },
];

const RARITY_EMOJI = { iron: "⚪", crystal: "🔵", gold: "🟡", ancient: "🟣", divine: "🌟" };

function rollMeteor() {
  const total = METEOR_TYPES.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of METEOR_TYPES) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return METEOR_TYPES[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Meteor", [
        "EVENT METEOR",
        "Meteor jatuh tiap 2 jam, koleksi untuk material langka!",
        "Stamina: -" + STAMINA_COST + " per koleksi",
        "",
        "JENIS METEOR:",
        "⚪ Besi - 500g + iron (40%)",
        "🔵 Kristal - 1500g + diamond (25%)",
        "🟡 Emas - 3000g + diamond+iron (20%)",
        "🟣 Kuno - 6000g + diamond+emerald (10%)",
        "🌟 Dewa - 15000g + banyak material (5%)",
        "",
        "PERINTAH:",
        usedPrefix + "rpgmeteor - Cek & mulai event",
        usedPrefix + "rpgmeteor collect - Koleksi meteor",
        usedPrefix + "rpgmeteor info - Statistik",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.meteorStats || {};
      const nextEvent = player.meteorEventEnd ? Math.max(0, Math.round((player.meteorEventEnd - Date.now()) / 60000)) : 0;

      const lines = [
        "STATISTIK METEOR",
        "Total dikoleksi: " + (stats.total || 0),
        "Besi: " + (stats.iron || 0),
        "Kristal: " + (stats.crystal || 0),
        "Emas: " + (stats.gold || 0),
        "Kuno: " + (stats.ancient || 0),
        "Dewa: " + (stats.divine || 0),
        "",
        "Total gold: " + (stats.totalGold || 0),
        "Total exp: " + (stats.totalExp || 0),
      ];

      if (player.meteorActive) {
        lines.push("");
        lines.push("Event AKTIF! Sisa: " + nextEvent + " menit");
        lines.push("Koleksi: " + usedPrefix + "rpgmeteor collect");
      } else {
        const cd = player.meteorCooldown ? Math.max(0, Math.round((player.meteorCooldown + COOLDOWN_MS - Date.now()) / 60000)) : 0;
        lines.push("");
        lines.push(cd > 0 ? "Cooldown: " + cd + " menit" : "Tersedia! Ketik " + usedPrefix + "rpgmeteor");
      }

      return m.reply(claraWrap("RPG Meteor", lines, "info"));
    }

    if (action === "collect") {
      if (!player.meteorActive) {
        return m.reply(claraWrap("RPG Meteor", "Tidak ada meteor! Ketik " + usedPrefix + "rpgmeteor untuk mulai", "warn"));
      }

      if (Date.now() > player.meteorEventEnd) {
        delete player.meteorActive;
        delete player.meteorEventEnd;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Meteor", "Event sudah berakhir!", "warn"));
      }

      if ((player.stamina || 100) < STAMINA_COST) {
        return m.reply(claraWrap("RPG Meteor", "Stamina kurang! Butuh: " + STAMINA_COST, "warn"));
      }

      player.stamina = Math.max(0, (player.stamina || 100) - STAMINA_COST);

      const meteor = rollMeteor();
      addGold(m, meteor.gold);
      addExp(m, meteor.exp);

      // Give items
      for (const [item, count] of Object.entries(meteor.items)) {
        player[item] = (player[item] || 0) + count;
      }

      // Stats
      if (!player.meteorStats) player.meteorStats = {};
      player.meteorStats.total = (player.meteorStats.total || 0) + 1;
      player.meteorStats[meteor.id] = (player.meteorStats[meteor.id] || 0) + 1;
      player.meteorStats.totalGold = (player.meteorStats.totalGold || 0) + meteor.gold;
      player.meteorStats.totalExp = (player.meteorStats.totalExp || 0) + meteor.exp;

      savePlayer(m, player);

      const lines = [
        "METEOR DIKOLEKSI!",
        RARITY_EMOJI[meteor.id] + " " + meteor.name,
        meteor.desc,
        "",
        "Gold: +" + meteor.gold,
        "Exp: +" + meteor.exp,
        "Items: " + Object.entries(meteor.items).map(([k, v]) => "+" + v + " " + k).join(", "),
        "",
        "Stamina: " + (player.stamina || 0) + "/100",
      ];

      if (meteor.id === "divine") {
        lines.push("");
        lines.push("LEGENDARY! Meteor Dewa!");
      }

      const remaining = Math.max(0, Math.round((player.meteorEventEnd - Date.now()) / 60000));
      lines.push("Sisa event: " + remaining + " menit");
      lines.push("Koleksi lagi: " + usedPrefix + "rpgmeteor collect");

      return m.reply(claraWrap("RPG Meteor", lines, meteor.id === "divine" ? "info" : "info"));
    }

    // Start event
    const lastCd = player.meteorCooldown || 0;
    if (Date.now() - lastCd < COOLDOWN_MS) {
      const remaining = Math.round((COOLDOWN_MS - (Date.now() - lastCd)) / 60000);
      return m.reply(claraWrap("RPG Meteor", [
        "Meteor belum jatuh lagi!",
        "Cooldown: " + remaining + " menit",
      ], "warn"));
    }

    // Start event
    player.meteorActive = true;
    player.meteorEventEnd = Date.now() + 10 * 60 * 1000; // 10 minute window
    player.meteorCooldown = Date.now();
    savePlayer(m, player);

    return m.reply(claraWrap("RPG Meteor", [
      "METEOR JATUH!",
      "Event aktif selama 10 menit",
      "Stamina per koleksi: " + STAMINA_COST,
      "",
      "Koleksi sekarang:",
      usedPrefix + "rpgmeteor collect",
      "",
      "Stamina kamu: " + (player.stamina || 100) + "/100",
    ], "info"));
  } catch (e) {
    console.error("[RpgMeteor]", e);
    return m.reply(claraWrap("RPG Meteor", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
