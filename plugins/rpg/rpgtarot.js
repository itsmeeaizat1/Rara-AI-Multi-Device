// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Tarot — Baca kartu tarot untuk buff/debuff random
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgtarot",
  alias: ["tarotrpg", "bacatarot", "kartutaru", "tarot", "kartutaro"],
  category: "rpg",
  description: "RPG Tarot — Baca kartu tarot untuk fortune buff/debuff",
  usage: ".rpgtarot draw — Tarik 3 kartu (biaya 800g)\n.rpgtarot info — Statistik & history\n.rpgtarot daily — Free reading (1x/hari)",
  example: ".rpgtarot draw\n.rpgtarot daily",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const DRAW_COST = 800;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

const MAJOR_ARCANA = [
  // Positive cards
  { id: "fool", name: "The Fool", emoji: "🃏", polarity: "positive", gold: 500, exp: 100, buff: "luck", duration: 3600, desc: "Awal baru, keberuntungan menanti" },
  { id: "magician", name: "The Magician", emoji: "🃏", polarity: "positive", gold: 1000, exp: 200, buff: "power", duration: 3600, desc: "Kekuatan tak terbatas" },
  { id: "empress", name: "The Empress", emoji: "🃏", polarity: "positive", gold: 1500, exp: 150, buff: "fortune", duration: 1800, desc: "Kelimpahan & kemakmuran" },
  { id: "sun", name: "The Sun", emoji: "🃏", polarity: "positive", gold: 2000, exp: 300, buff: "vitality", duration: 3600, desc: "Kesuksesan & kebahagiaan" },
  { id: "star", name: "The Star", emoji: "🃏", polarity: "positive", gold: 1200, exp: 250, buff: "hope", duration: 1800, desc: "Harapan & inspirasi" },
  { id: "world", name: "The World", emoji: "🃏", polarity: "positive", gold: 3000, exp: 500, buff: "complete", duration: 3600, desc: "Kesempurnaan & pencapaian" },
  // Negative cards
  { id: "tower", name: "The Tower", emoji: "🃏", polarity: "negative", gold: -500, exp: 50, buff: "chaos", duration: 1800, desc: "Perubahan drastis, kehancuran" },
  { id: "devil", name: "The Devil", emoji: "🃏", polarity: "negative", gold: -800, exp: 30, buff: "greed", duration: 1800, desc: "Keserakahan & ikatan" },
  { id: "death", name: "Death", emoji: "🃏", polarity: "negative", gold: -300, exp: 200, buff: "rebirth", duration: 3600, desc: "Akhir & permulaan baru" },
  { id: "moon", name: "The Moon", emoji: "🃏", polarity: "negative", gold: -200, exp: 100, buff: "illusion", duration: 1800, desc: "Ilusi & ketidakpastian" },
  // Neutral cards
  { id: "hermit", name: "The Hermit", emoji: "🃏", polarity: "neutral", gold: 200, exp: 150, buff: "wisdom", duration: 1800, desc: "Kebijaksanaan dalam kesendirian" },
  { id: "temperance", name: "Temperance", emoji: "🃏", polarity: "neutral", gold: 400, exp: 100, buff: "balance", duration: 3600, desc: "Keseimbangan & harmoni" },
];

const POSITIONS = ["Masa Lalu", "Masa Kini", "Masa Depan"];

function drawCard() {
  return MAJOR_ARCANA[Math.floor(Math.random() * MAJOR_ARCANA.length)];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Tarot", [
        "BACA KARTU TAROT",
        "Tarik 3 kartu: Masa Lalu, Kini, Depan",
        "Buff/debuff aktif sesuai kartu yang ditarik",
        "",
        "PERINTAH:",
        usedPrefix + "rpgtarot draw - Tarik 3 kartu (" + DRAW_COST + "g)",
        usedPrefix + "rpgtarot daily - Free reading (1x/24jam)",
        usedPrefix + "rpgtarot info - Statistik",
        "",
        "12 Major Arcana, positive/negative/neutral",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.tarotStats || {};
      const buff = player.tarotBuff;

      const lines = [
        "STATISTIK TAROT",
        "Total baca: " + (stats.readings || 0),
        "Positive: " + (stats.positive || 0),
        "Negative: " + (stats.negative || 0),
        "Neutral: " + (stats.neutral || 0),
      ];

      if (buff && buff.expires > Date.now()) {
        const remaining = Math.round((buff.expires - Date.now()) / 60000);
        lines.push("");
        lines.push("BUFF AKTIF:");
        lines.push(buff.card.emoji + " " + buff.card.name);
        lines.push("Buff: " + buff.card.buff + " | Sisa: " + remaining + " menit");
      } else {
        lines.push("");
        lines.push("Buff: Tidak ada");
      }

      return m.reply(claraWrap("RPG Tarot", lines, "info"));
    }

    if (action === "daily") {
      if (player.lastTarotDaily && Date.now() - player.lastTarotDaily < DAILY_COOLDOWN) {
        const remaining = Math.round((DAILY_COOLDOWN - (Date.now() - player.lastTarotDaily)) / 3600000);
        return m.reply(claraWrap("RPG Tarot", "Daily reading " + remaining + " jam lagi", "warn"));
      }

      player.lastTarotDaily = Date.now();
      return await doReading(m, player, true, usedPrefix);
    }

    if (action === "draw") {
      if ((player.gold || 0) < DRAW_COST) {
        return m.reply(claraWrap("RPG Tarot", "Gold kurang! Butuh: " + DRAW_COST, "warn"));
      }

      addGold(m, -DRAW_COST);
      return await doReading(m, player, false, usedPrefix);
    }

    return m.reply(claraWrap("RPG Tarot", "Perintah: draw, daily, info", "warn"));
  } catch (e) {
    console.error("[RpgTarot]", e);
    return m.reply(claraWrap("RPG Tarot", "Error: " + e.message, "error"));
  }
}

async function doReading(m, player, isDaily, usedPrefix) {
  const cards = [drawCard(), drawCard(), drawCard()];
  const now = Date.now();

  // Apply gold/exp from all cards
  let totalGold = 0;
  let totalExp = 0;
  let polarityCount = { positive: 0, negative: 0, neutral: 0 };

  cards.forEach(card => {
    totalGold += card.gold;
    totalExp += card.exp;
    polarityCount[card.polarity]++;
  });

  if (totalGold > 0) addGold(m, totalGold);
  else if (totalGold < 0) {
    // Can't go below 0
    const deduct = Math.min(Math.abs(totalGold), player.gold || 0);
    addGold(m, -deduct);
  }
  if (totalExp > 0) addExp(m, totalExp);

  // Last card buff (Masa Depan) becomes active
  const futureCard = cards[2];
  player.tarotBuff = {
    card: futureCard,
    expires: now + futureCard.duration * 1000,
  };

  // Stats
  if (!player.tarotStats) player.tarotStats = {};
  player.tarotStats.readings = (player.tarotStats.readings || 0) + 1;
  player.tarotStats.positive = (player.tarotStats.positive || 0) + polarityCount.positive;
  player.tarotStats.negative = (player.tarotStats.negative || 0) + polarityCount.negative;
  player.tarotStats.neutral = (player.tarotStats.neutral || 0) + polarityCount.neutral;

  savePlayer(m, player);

  const lines = [
    isDaily ? "DAILY TAROT READING (FREE)" : "TAROT READING (" + DRAW_COST + "g)",
    "",
  ];

  cards.forEach((card, i) => {
    const goldStr = card.gold >= 0 ? "+" + card.gold : "" + card.gold;
    lines.push(POSITIONS[i] + ": " + card.emoji + " " + card.name + " (" + card.polarity + ")");
    lines.push("  " + card.desc);
    lines.push("  " + goldStr + "g | +" + card.exp + "exp | buff: " + card.buff);
    lines.push("");
  });

  lines.push("Total: " + (totalGold >= 0 ? "+" : "") + totalGold + "g | +" + totalExp + " exp");
  lines.push("Buff aktif: " + futureCard.buff + " (" + Math.round(futureCard.duration / 60) + " menit)");

  return m.reply(claraWrap("RPG Tarot", lines, totalGold >= 0 ? "info" : "warn"));
}

export { pluginConfig as config, handler };
