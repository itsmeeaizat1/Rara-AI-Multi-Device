// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Gaple — Multiplayer Domino Game
import { raraWrap , raraBox } from "../../src/lib/rara-menu-style.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";
import te from "../../src/lib/rara-error.js";
import { formatRp } from "../../src/lib/rara-rpg-service.js";
import { rollBonus } from "../../src/lib/rara-game-rewards.js";

const pluginConfig = {
  name: "domino",
  alias: ["gaple"],
  aliases: ["gaple", "domino"],
  category: "game",
  description: "Game Gaple (Domino) multiplayer di grup",
  usage: ".domino | .domino join | .domino start | .domino play <no> <left|right> | .domino draw | .domino hand | .domino pass | .domino stop",
  example: ".domino",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: false,
  cooldown: 3, energi: 2, isEnabled: true,
};

const games = new Map();

function createDeck() {
  const d = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) d.push([i, j]);
  return shuffle(d);
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function getNext(g) { return (g.currentPlayer + 1) % g.players.length; }
function tryPlace(table, card, side) {
  if (!table.length) { table.push([card[0], card[1]]); return true; }
  const left = table[0][0], right = table[table.length - 1][1];
  if (side === "left") {
    if (card[1] === left) { table.unshift([card[1], card[0]]); return true; }
    if (card[0] === left) { table.unshift([card[0], card[1]]); return true; }
  } else {
    if (card[0] === right) { table.push([card[0], card[1]]); return true; }
    if (card[1] === right) { table.push([card[1], card[0]]); return true; }
  }
  return false;
}

async function handler(m, { sock, text, command, isOwner, isAdmins }) {
  try {
    const chatId = m.chat, sender = m.sender;
    const args = (text || "").trim().split(/\s+/);
    const sub = args[0] || "";

    if (!games.has(chatId)) {
      games.set(chatId, { players: [], deck: createDeck(), table: [], currentPlayer: 0, stopVotes: [] });
      return m.reply(raraBox("Gaple", [
        "Permainan dimulai",
        "---",
        ".domino join — bergabung",
        ".domino start — mulai (min 2)",
      ]));
    }

    const game = games.get(chatId);

    if (sub === "join") {
      if (game.players.find(p => p.id === sender)) return m.reply(raraWrap("gaple", "Sudah bergabung.", "info"));
      game.players.push({ id: sender, hand: [] });
      return m.reply(raraGameBox({ title: "gaple", icon: "🁣", flavor: "🁣 *GABUNG!*", body: "@" + sender.split("@")[0] + " masuk meja!\nTotal: " + game.players.length + " pemain" }), { mentions: [sender] });
    }

    if (sub === "start") {
      if (game.players.length < 2) return m.reply(raraWrap("gaple", "Minimal 2 pemain.", "info"));
      game.deck = shuffle(createDeck());
      for (const p of game.players) {
        p.hand = [];
        for (let i = 0; i < 7 && game.deck.length; i++) p.hand.push(game.deck.pop());
        const ht = p.hand.map((c, i) => i + ": [" + c[0] + "|" + c[1] + "]").join("\n");
        await sock.sendMessage(p.id, { text: smallcapsText("🀱 *Kartu Gaple-mu:*\n\n" + ht) });
      }
      if (game.deck.length) game.table = [game.deck.pop()];
      game.currentPlayer = 0;
      return sendStatus(m, sock, game);
    }

    if (sub === "info") {
      return m.reply(raraBox("Gaple", [
        ".domino join — Gabung",
        ".domino start — Mulai (min 2)",
        ".domino play <no> <left|right> — Main kartu",
        ".domino draw — Ambil kartu",
        ".domino pass — Lewati",
        ".domino hand — Lihat kartu (DM)",
        ".domino stop — Hentikan",
      ]));
    }

    if (sub === "hand") {
      const p = game.players.find(p => p.id === sender);
      if (!p) return m.reply(raraWrap("gaple", "Belum bergabung.", "info"));
      const ht = p.hand.map((c, i) => i + ": [" + c[0] + "|" + c[1] + "]").join("\n");
      await sock.sendMessage(sender, { text: smallcapsText("🀱 *Kartu Gaple-mu:*\n\n" + ht) });
      return m.reply(raraGameBox({ title: "gaple", icon: "🁣", flavor: "📩 *BATAU DIBAGI!*", body: "Cek DM kamu — kartu domino sudah dikirim rahasia." }));
    }

    if (sub === "play") {
      const p = game.players[game.currentPlayer];
      if (!p || p.id !== sender) return m.reply(raraWrap("gaple", "Bukan giliranmu!", "info"));
      const idx = parseInt(args[1]), side = (args[2] || "").toLowerCase();
      if (isNaN(idx) || idx < 0 || idx >= p.hand.length) return m.reply(raraWrap("gaple", "Nomor kartu tidak valid.", "info"));
      if (!["left","right"].includes(side)) return m.reply(raraWrap("gaple", "Pilih sisi: left atau right.", "guide"));
      const card = p.hand[idx];
      if (!tryPlace(game.table, card, side)) return m.reply(raraWrap("gaple", "Kartu tidak cocok dengan ujung meja.", "info"));
      p.hand.splice(idx, 1);
      if (p.hand.length === 0) { games.delete(chatId);
        // 💵 uang (semua game ada uang — request owner 8 Sep 2026)
        let gCash = { gain: 0, saldo: 0 };
        try { gCash = rollBonus(m, "gaple"); } catch {}
        const gBody = "@" + sender.split("@")[0] + " habiskan semua batanya!\n💵 Uang: +" + formatRp(gCash.gain) + " (saldo " + formatRp(gCash.saldo) + ")" + (gCash.jackpot ? "\n🎰 JACKPOT! Bonus 3x uang!" : "");
        return m.reply(raraGameBox({ title: "gaple", icon: "🁣", flavor: "🎉 *GAPLE MASTER!*", body: gBody, cta: gameCTA("gaple") }), { mentions: [sender] }); }
      game.currentPlayer = getNext(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "draw") {
      const p = game.players[game.currentPlayer];
      if (!p || p.id !== sender) return m.reply(raraWrap("gaple", "Bukan giliranmu!", "info"));
      if (!game.deck.length) return m.reply(raraWrap("gaple", "Deck kosong.", "info"));
      const c = game.deck.pop(); p.hand.push(c);
      m.reply(raraGameBox({ title: "gaple", icon: "🁣", body: "📥 Ambil: [" + c[0] + "|" + c[1] + "]" }));
      game.currentPlayer = getNext(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "pass") {
      const p = game.players[game.currentPlayer];
      if (!p || p.id !== sender) return m.reply(raraWrap("gaple", "Bukan giliranmu!", "info"));
      game.currentPlayer = getNext(game);
      return sendStatus(m, sock, game);
    }

    if (sub === "stop") {
      const p = game.players.find(p => p.id === sender);
      if (!p) return m.reply(raraWrap("gaple", "Belum bergabung.", "info"));
      if (isAdmins || isOwner) { games.delete(chatId); return m.reply(raraGameBox({ title: "gaple", icon: "🁣", flavor: "⏹️ *STOP!*", body: "Gaple dihentikan oleh admin.", cta: gameCTA("gaple") })); }
      if (!game.stopVotes.includes(sender)) game.stopVotes.push(sender);
      if (game.stopVotes.length === game.players.length) { games.delete(chatId); return m.reply(raraGameBox({ title: "gaple", icon: "🁣", flavor: "⏹️ *STOP!*", body: "Gaple dihentikan — semua pemain setuju.", cta: gameCTA("gaple") })); }
      return m.reply(raraGameBox({ title: "gaple", icon: "🁣", body: "📢 Butuh " + (game.players.length - game.stopVotes.length) + " vote lagi buat stop." }));
    }

    return m.reply(raraWrap("gaple", "Perintah tidak dikenali. .domino info untuk panduan.", "guide"));
  } catch (e) {
    console.error("gaple error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("gaple", te(m.prefix, m.command, m.pushName), "error"));
  }
}

async function sendStatus(m, sock, game) {
  const meja = game.table.length ? game.table.map(c => "[" + c[0] + "|" + c[1] + "]").join(" - ") : "(kosong)";
  const hands = game.players.map((p, i) => i + ": @" + p.id.split("@")[0] + " (" + p.hand.length + ")").join("\n");
  const curr = game.players[game.currentPlayer];
  let t = "";
  t += "Meja: " + meja + "\n";
  t += "Giliran: @" + (curr?.id.split("@")[0] || "-") + "\n";
  t += "📊 Kartu pemain:\n" + hands.replace(/\n/g, "\n") + "\n";
  return m.reply(t, { mentions: game.players.map(p => p.id) });
}

export { pluginConfig as config, handler };
