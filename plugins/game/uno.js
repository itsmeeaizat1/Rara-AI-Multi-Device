// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// UNO — Multiplayer Card Game
import { novaWrap, novaBox } from "../../src/lib/nova-menu-style.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import te from "../../src/lib/nova-error.js";
import { formatRp } from "../../src/lib/nova-rpg-service.js";
import { rollBonus } from "../../src/lib/nova-game-rewards.js";

const pluginConfig = {
  name: "uno",
  alias: ["uno"],
  aliases: ["uno"],
  category: "game",
  description: "Game UNO multiplayer di grup",
  usage: ".uno | .uno join | .uno start | .uno play <no> | .uno draw | .uno hand | .uno pass | .uno color <warna> | .uno stop",
  example: ".uno",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: false,
  cooldown: 3, energi: 2, isEnabled: true,
};

const games = new Map();

function createDeck() {
  const colors = ["red", "yellow", "green", "blue"];
  const values = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  const deck = [];
  colors.forEach(color => {
    values.forEach(value => { deck.push({ color, value }); if (value !== "1") deck.push({ color, value }); });
  });
  ["wild13","wild14"].forEach(value => { deck.push({ color: "black", value }); deck.push({ color: "black", value }); });
  return shuffle(deck);
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function isValidPlay(current, play) { return play.color === "black" || current.color === play.color || current.value === play.value; }
function getNextPlayer(g) { return (g.currentPlayer + g.direction + g.players.length) % g.players.length; }
function hasPlayableCard(p, c) { return p.hand.some(card => isValidPlay(c, card)); }
function cardUrl(card) {
  const base = "https://raw.githubusercontent.com/abhisheks008/UNO/main/images/";
  return card.color === "black" ? base + card.value + ".png" : base + card.color + card.value + ".png";
}

async function handler(m, { sock, text, command, isOwner, isAdmins }) {
  try {
    const chatId = m.chat;
    const sender = m.sender;
    const args = (text || "").trim().split(/\s+/);
    const sub = args[0] || "";

    if (!games.has(chatId)) {
      games.set(chatId, { players: [], deck: createDeck(), discardPile: [], currentPlayer: 0, direction: 1, currentCard: null, drawStack: 0, stopVotes: new Set(), awaitingColorChoice: false });
      return m.reply(novaBox("Uno", [
        "Permainan dimulai",
        "---",
        ".uno join — bergabung",
        ".uno start — mulai (min 2)",
      ]));
    }

    const game = games.get(chatId);

    if (sub === "join") {
      if (game.players.find(p => p.id === sender)) return m.reply(novaWrap("uno", "Kamu sudah bergabung.", "info"));
      game.players.push({ id: sender, hand: [] });
      return m.reply(novaGameBox({ title: "uno", icon: "🃏", flavor: "🃏 *GABUNG!*", body: "@" + sender.split("@")[0] + " masuk meja!\nTotal: " + game.players.length + " pemain" }), { mentions: [sender] });
    }

    if (sub === "start") {
      if (game.players.length < 2) return m.reply(novaWrap("uno", "Minimal 2 pemain.", "info"));
      game.deck = shuffle(createDeck());
      game.players.forEach(p => { p.hand = []; for (let i = 0; i < 7; i++) p.hand.push(game.deck.pop()); });
      game.currentCard = game.deck.pop();
      game.discardPile.push(game.currentCard);
      return sendStatus(m, sock, game);
    }

    if (sub === "info") {
      return m.reply(novaBox("Panduan Uno", [
        ".uno join — Gabung",
        ".uno start — Mulai (min 2)",
        ".uno play <no> — Main kartu",
        ".uno draw — Ambil kartu",
        ".uno pass — Lewati",
        ".uno hand — Lihat kartu (DM)",
        ".uno color <red|yellow|green|blue> — Pilih warna",
        ".uno stop — Hentikan",
      ]));
    }

    if (sub === "hand") {
      const p = game.players.find(p => p.id === sender);
      if (!p) return m.reply(novaWrap("uno", "Kamu belum bergabung.", "info"));
      const hand = p.hand.map((c, i) => i + ": " + c.color + " " + c.value).join("\n");
      await sock.sendMessage(sender, { text: smallcapsText("🎴 *Kartu UNO-mu:*\n\n" + hand) });
      return m.reply(novaGameBox({ title: "uno", icon: "🃏", flavor: "📩 *KARTU TERKIRIM!*", body: "Cek DM kamu — kartu sudah dikirim rahasia ke pesan pribadi." }));
    }

    if (sub === "draw") {
      const p = game.players[game.currentPlayer];
      if (!p || p.id !== sender) return m.reply(novaWrap("uno", "Bukan giliranmu!", "info"));
      if (game.drawStack > 0) {
        for (let i = 0; i < game.drawStack; i++) { if (!game.deck.length) { game.deck = shuffle(game.discardPile); game.discardPile = []; } p.hand.push(game.deck.pop()); }
        m.reply(novaGameBox({ title: "uno", icon: "🃏", body: "📥 Kamu ambil " + game.drawStack + " kartu — sanksi penalti tuntas!" })); game.drawStack = 0;
      } else {
        if (!game.deck.length) { game.deck = shuffle(game.discardPile); game.discardPile = []; }
        const c = game.deck.pop(); p.hand.push(c);
        m.reply(novaGameBox({ title: "uno", icon: "🃏", body: "📥 Kamu ambil: " + c.color + " " + c.value }));
      }
      game.currentPlayer = getNextPlayer(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "play") {
      const p = game.players[game.currentPlayer];
      if (!p || p.id !== sender) return m.reply(novaWrap("uno", "Bukan giliranmu!", "info"));
      const idx = parseInt(args[1]);
      if (isNaN(idx) || idx < 0 || idx >= p.hand.length) return m.reply(novaWrap("uno", "Nomor kartu tidak valid.", "info"));
      const card = p.hand[idx];
      if (!isValidPlay(game.currentCard, card)) return m.reply(novaWrap("uno", "Kartu tidak bisa dimainkan.", "info"));
      if (card.value === "12") game.drawStack += 2;
      else if (card.value === "wild14") { game.drawStack += 4; game.awaitingColorChoice = true; }
      else if (card.value === "10") game.currentPlayer = getNextPlayer(game);
      else if (card.value === "11") game.direction *= -1;
      game.currentCard = card; game.discardPile.push(card); p.hand.splice(idx, 1);
      if (p.hand.length === 0) { games.delete(chatId);
        // 💵 uang (semua game ada uang — request owner 8 Sep 2026)
        let uCash = { gain: 0, saldo: 0 };
        try { uCash = rollBonus(m, "uno"); } catch {}
        const uBody = "@" + sender.split("@")[0] + " habiskan semua kartunya!\n💵 Uang: +" + formatRp(uCash.gain) + " (saldo " + formatRp(uCash.saldo) + ")" + (uCash.jackpot ? "\n🎰 JACKPOT! Bonus 3x uang!" : "");
        return m.reply(novaGameBox({ title: "uno", icon: "🃏", flavor: "🎉 *UNO! MENANG TOTAL!*", body: uBody, cta: gameCTA("uno") }), { mentions: [sender] }); }
      game.currentPlayer = getNextPlayer(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "pass") {
      const p = game.players[game.currentPlayer];
      if (!p || p.id !== sender) return m.reply(novaWrap("uno", "Bukan giliranmu!", "info"));
      game.currentPlayer = getNextPlayer(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "color") {
      if (!game.awaitingColorChoice || game.players[game.currentPlayer]?.id !== sender) return m.reply(novaWrap("uno", "Tidak ada pilihan warna saat ini.", "info"));
      const color = (args[1] || "").toLowerCase();
      if (!["red","yellow","green","blue"].includes(color)) return m.reply(novaWrap("uno", "Warna: red, yellow, green, blue.", "guide"));
      game.currentCard.color = color; game.awaitingColorChoice = false;
      game.currentPlayer = getNextPlayer(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "stop") {
      const p = game.players.find(p => p.id === sender);
      if (!p) return m.reply(novaWrap("uno", "Kamu belum bergabung.", "info"));
      if (isAdmins || isOwner) { games.delete(chatId); return m.reply(novaGameBox({ title: "uno", icon: "🃏", flavor: "⏹️ *STOP!*", body: "UNO dihentikan oleh admin.", cta: gameCTA("uno") })); }
      game.stopVotes.add(sender);
      if (game.stopVotes.size === game.players.length) { games.delete(chatId); return m.reply(novaGameBox({ title: "uno", icon: "🃏", flavor: "⏹️ *STOP!*", body: "UNO dihentikan — semua pemain setuju.", cta: gameCTA("uno") })); }
      return m.reply(novaGameBox({ title: "uno", icon: "🃏", body: "📢 Butuh " + (game.players.length - game.stopVotes.size) + " vote lagi buat stop." }));
    }

    return m.reply(novaWrap("uno", "Perintah tidak dikenali. .uno info untuk panduan.", "guide"));
  } catch (e) {
    console.error("uno error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("uno", te(m.prefix, m.command, m.pushName), "error"));
  }
}

async function sendStatus(m, sock, game) {
  const cardText = "Kartu saat ini: " + game.currentCard.color + " " + game.currentCard.value;
  const hands = game.players.map((p, i) => i + ": @" + p.id.split("@")[0] + " (" + p.hand.length + ")").join("\n");
  const curr = game.players[game.currentPlayer];
  let t = cardText + "\n";
  t += "Giliran: @" + (curr?.id.split("@")[0] || "-") + "\n\n";
  t += "Kartu pemain:\n" + hands;
  return m.reply(t, { mentions: game.players.map(p => p.id) });
}

export { pluginConfig as config, handler };
