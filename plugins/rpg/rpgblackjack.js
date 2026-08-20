// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Blackjack — Kartu 21, melawan dealer untuk gold
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgblackjack",
  alias: ["blackjackrpg", "kartu21", "twentyone", "bjrpg", "21kartu"],
  category: "rpg",
  description: "RPG Blackjack — Kartu 21, kalahkan dealer untuk gold",
  usage: ".rpgblackjack <gold> — Mulai dengan taruhan\n.rpgblackjack hit — Ambil kartu\n.rpgblackjack stand — Berhenti\n.rpgblackjack double — Double down",
  example: ".rpgblackjack 1000\n.rpgblackjack hit",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const MIN_BET = 100;
const MAX_BET = 5000;

const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = [
  { name: "A", value: 11 }, { name: "2", value: 2 }, { name: "3", value: 3 },
  { name: "4", value: 4 }, { name: "5", value: 5 }, { name: "6", value: 6 },
  { name: "7", value: 7 }, { name: "8", value: 8 }, { name: "9", value: 9 },
  { name: "10", value: 10 }, { name: "J", value: 10 }, { name: "Q", value: 10 }, { name: "K", value: 10 },
];

function drawCard() {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return { suit, rank: rank.name, value: rank.value, display: rank.name + suit };
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let aces = hand.filter(c => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function formatHand(hand, hide) {
  if (hide && hand.length > 1) {
    return hand[0].display + " [?]";
  }
  return hand.map(c => c.display).join(" ");
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);
    const session = player.blackjackGame;

    // Start new game
    if (action && !["hit", "stand", "double", "fold"].includes(action)) {
      const bet = parseInt(args[0]) || 0;
      if (bet < MIN_BET) return m.reply(claraWrap("RPG Blackjack", "Min bet: " + MIN_BET + " gold", "warn"));
      if (bet > MAX_BET) return m.reply(claraWrap("RPG Blackjack", "Max bet: " + MAX_BET + " gold", "warn"));
      if ((player.gold || 0) < bet) return m.reply(claraWrap("RPG Blackjack", "Gold kurang! Punya: " + (player.gold || 0), "warn"));

      // Expire old session
      if (session && Date.now() - session.startTime > 120000) {
        delete player.blackjackGame;
      }

      addGold(m, -bet);

      const playerHand = [drawCard(), drawCard()];
      const dealerHand = [drawCard(), drawCard()];

      player.blackjackGame = {
        bet,
        playerHand,
        dealerHand,
        startTime: Date.now(),
        doubled: false,
      };
      savePlayer(m, player);

      const pVal = handValue(playerHand);
      const lines = [
        "BLACKJACK RPG",
        "Taruhan: " + bet + " gold",
        "",
        "Kartu kamu: " + formatHand(playerHand) + " (" + pVal + ")",
        "Kartu dealer: " + formatHand(dealerHand, true),
        "",
        usedPrefix + "rpgblackjack hit — Ambil kartu",
        usedPrefix + "rpgblackjack stand — Berhenti",
        usedPrefix + "rpgblackjack double — Double down (2x bet)",
      ];

      if (pVal === 21) {
        // Natural blackjack!
        const winnings = Math.round(bet * 2.5);
        addGold(m, winnings);
        addExp(m, bet);
        delete player.blackjackGame;
        savePlayer(m, player);
        lines.push("");
        lines.push("BLACKJACK NATURAL! +" + winnings + " gold");
      }

      return m.reply(claraWrap("RPG Blackjack", lines, "info"));
    }

    if (!session || Date.now() - session.startTime > 120000) {
      delete player.blackjackGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Blackjack", "Tidak ada game aktif. Ketik " + usedPrefix + "rpgblackjack <gold>", "warn"));
    }

    if (action === "hit") {
      session.playerHand.push(drawCard());
      const pVal = handValue(session.playerHand);

      if (pVal > 21) {
        // Bust
        delete player.blackjackGame;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Blackjack", [
          "BUST! Kartu kamu: " + formatHand(session.playerHand) + " (" + pVal + ")",
          "Melebihi 21. Kalah -" + session.bet + " gold",
        ], "warn"));
      }

      savePlayer(m, player);
      return m.reply(claraWrap("RPG Blackjack", [
        "Kartu kamu: " + formatHand(session.playerHand) + " (" + pVal + ")",
        "Kartu dealer: " + formatHand(session.dealerHand, true),
        "",
        usedPrefix + "rpgblackjack hit | stand",
      ], "info"));
    }

    if (action === "stand") {
      // Dealer plays
      while (handValue(session.dealerHand) < 17) {
        session.dealerHand.push(drawCard());
      }

      const pVal = handValue(session.playerHand);
      const dVal = handValue(session.dealerHand);

      const lines = [
        "HASIL BLACKJACK",
        "Kartu kamu: " + formatHand(session.playerHand) + " (" + pVal + ")",
        "Kartu dealer: " + formatHand(session.dealerHand) + " (" + dVal + ")",
        "",
      ];

      if (dVal > 21 || pVal > dVal) {
        const winnings = session.bet * 2;
        addGold(m, winnings);
        addExp(m, Math.round(session.bet * 0.5));
        lines.push("MENANG! +" + winnings + " gold");
        lines.push("Exp: +" + Math.round(session.bet * 0.5));
      } else if (pVal === dVal) {
        addGold(m, session.bet); // return bet
        lines.push("PUSH! Bet dikembalikan");
      } else {
        lines.push("KALAH! -" + session.bet + " gold");
      }

      delete player.blackjackGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Blackjack", lines, pVal >= dVal ? "info" : "warn"));
    }

    if (action === "double") {
      if ((player.gold || 0) < session.bet) {
        return m.reply(claraWrap("RPG Blackjack", "Gold tidak cukup untuk double!", "warn"));
      }
      addGold(m, -session.bet);
      session.bet *= 2;
      session.doubled = true;
      session.playerHand.push(drawCard());

      const pVal = handValue(session.playerHand);
      if (pVal > 21) {
        delete player.blackjackGame;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Blackjack", [
          "DOUBLE & BUST! " + formatHand(session.playerHand) + " (" + pVal + ")",
          "Kalah -" + session.bet + " gold",
        ], "warn"));
      }

      // Auto stand after double
      while (handValue(session.dealerHand) < 17) {
        session.dealerHand.push(drawCard());
      }
      const dVal = handValue(session.dealerHand);

      const lines = [
        "DOUBLE DOWN!",
        "Kartu kamu: " + formatHand(session.playerHand) + " (" + pVal + ")",
        "Kartu dealer: " + formatHand(session.dealerHand) + " (" + dVal + ")",
        "",
      ];

      if (dVal > 21 || pVal > dVal) {
        addGold(m, session.bet * 2);
        addExp(m, session.bet);
        lines.push("MENANG! +" + (session.bet * 2) + " gold");
      } else if (pVal === dVal) {
        addGold(m, session.bet);
        lines.push("PUSH! Bet dikembalikan");
      } else {
        lines.push("KALAH! -" + session.bet + " gold");
      }

      delete player.blackjackGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Blackjack", lines, pVal >= dVal ? "info" : "warn"));
    }

    if (action === "fold") {
      addGold(m, Math.round(session.bet * 0.5));
      delete player.blackjackGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Blackjack", "Fold! Dapat balik " + Math.round(session.bet * 0.5) + " gold", "warn"));
    }

    return m.reply(claraWrap("RPG Blackjack", "Perintah: hit, stand, double, fold", "warn"));
  } catch (e) {
    console.error("[RpgBlackjack]", e);
    return m.reply(claraWrap("RPG Blackjack", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
