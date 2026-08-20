// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Wishing Well — Lempar koin ke sumur, dapat hadiah acak atau sial
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgwish",
  alias: ["wishingwell", "sumurpetak", "sumurmusik", "mohonkoin", "wishrpg"],
  category: "rpg",
  description: "RPG Wishing Well — Lempar koin ke sumur untuk hadiah acak",
  usage: ".rpgwish (biaya 300 gold)\n.rpgwish <jumlah> — Lempar banyak koin sekaligus",
  example: ".rpgwish\n.rpgwish 5 (lempar 5x = 1500 gold)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 5,
  isEnabled: true,
};

const WISH_COST = 300;
const MAX_WISHES = 10;

// Possible outcomes: weight, goldMin, goldMax, exp, message, type
const OUTCOMES = [
  { weight: 30, goldMin: 0, goldMax: 0, exp: 5, msg: "Sumur diam... tidak ada apa-apa", type: "miss" },
  { weight: 25, goldMin: 100, goldMax: 300, exp: 10, msg: "Koinmu memantul! Dapat sedikit gold balik", type: "small" },
  { weight: 20, goldMin: 300, goldMax: 600, exp: 20, msg: "Cahaya keemasan dari dasar sumur!", type: "medium" },
  { weight: 15, goldMin: 600, goldMax: 1200, exp: 50, msg: "Permata bersinar terang dari sumur!", type: "good" },
  { weight: 7, goldMin: 1500, goldMax: 3000, exp: 100, msg: "Sumur memuntahkan harta karun!", type: "great" },
  { weight: 3, goldMin: 3000, goldMax: 5000, exp: 200, msg: "NAGA EMAS muncul dari sumur! Jackpot!", type: "jackpot" },
];

function pickOutcome() {
  const totalWeight = OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const o of OUTCOMES) {
    roll -= o.weight;
    if (roll <= 0) return o;
  }
  return OUTCOMES[0];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    let count = parseInt(args[0]) || 1;
    count = Math.max(1, Math.min(MAX_WISHES, count));
    const totalCost = WISH_COST * count;

    if ((player.gold || 0) < totalCost) {
      return m.reply(claraWrap("RPG Wish", [
        "Gold tidak cukup!",
        "Butuh: " + totalCost + " gold (" + count + "x @ " + WISH_COST + ")",
        "Punya: " + (player.gold || 0) + " gold",
      ], "warn"));
    }

    addGold(m, -totalCost);

    let totalGold = 0;
    let totalExp = 0;
    const results = [];
    let bestType = "miss";

    for (let i = 0; i < count; i++) {
      const outcome = pickOutcome();
      const gold = Math.floor(Math.random() * (outcome.goldMax - outcome.goldMin + 1)) + outcome.goldMin;
      totalGold += gold;
      totalExp += outcome.exp;

      if (gold > 0) addGold(m, gold);
      if (outcome.exp > 0) addExp(m, outcome.exp);

      results.push(outcome.emoji ? outcome.emoji + " " + outcome.msg : outcome.msg);

      if (["great", "jackpot"].includes(outcome.type)) bestType = outcome.type;
    }

    savePlayer(m, player);

    const netGold = totalGold - totalCost;
    const lines = [
      "SUMUR KEINGINAN",
      "Lempar " + count + "x koin @ " + WISH_COST + " gold (total: " + totalCost + ")",
      "",
    ];

    if (count <= 3) {
      results.forEach((r, i) => {
        lines.push((i + 1) + ". " + r);
      });
    } else {
      lines.push(count + " lemparan selesai (terlalu banyak untuk ditampilkan)");
    }

    lines.push("");
    lines.push("Total gold dapat: +" + totalGold);
    lines.push("Net profit: " + (netGold >= 0 ? "+" : "") + netGold + " gold");
    lines.push("Total exp: +" + totalExp);
    lines.push("Gold sekarang: " + (player.gold || 0));

    if (bestType === "jackpot") {
      lines.push("");
      lines.push("JACKPOT TER CAPAI!");
    }

    return m.reply(claraWrap("RPG Wish", lines, bestType === "miss" && netGold < 0 ? "warn" : "info"));
  } catch (e) {
    console.error("[RpgWish]", e);
    return m.reply(claraWrap("RPG Wish", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
