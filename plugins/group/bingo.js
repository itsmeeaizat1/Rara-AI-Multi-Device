// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bingo",
  alias: ["bingo"],
  aliases: ["bingo", "groupbingo"],
  category: "group",
  description: "Game Bingo real-time di grup",
  usage: ".bingo start | .bingo join | .bingo stop | .bingo card",
  isGroupOnly: true,
};

function generateBingoCard() {
  const ranges = [
    { min: 1, max: 15 },
    { min: 16, max: 30 },
    { min: 31, max: 45 },
    { min: 46, max: 60 },
    { min: 61, max: 75 },
  ];
  const card = [];
  for (const range of ranges) {
    const nums = [];
    const pool = Array.from({ length: range.max - range.min + 1 }, (_, i) => i + range.min);
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      nums.push(pool.splice(idx, 1)[0]);
    }
    card.push(nums);
  }
  card[2][2] = "FREE";
  return card;
}

function checkBingo(card, called) {
  for (let row = 0; row < 5; row++) {
    let count = 0;
    for (let col = 0; col < 5; col++) {
      if (card[col][row] === "FREE" || called.includes(card[col][row])) count++;
    }
    if (count === 5) return true;
  }
  for (let col = 0; col < 5; col++) {
    let count = 0;
    for (let row = 0; row < 5; row++) {
      if (card[col][row] === "FREE" || called.includes(card[col][row])) count++;
    }
    if (count === 5) return true;
  }
  let diag1 = 0, diag2 = 0;
  for (let i = 0; i < 5; i++) {
    if (card[i][i] === "FREE" || called.includes(card[i][i])) diag1++;
    if (card[i][4 - i] === "FREE" || called.includes(card[i][4 - i])) diag2++;
  }
  return diag1 === 5 || diag2 === 5;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.bingoGames) db.data.bingoGames = {};
    if (!db.data.bingoGames[groupId]) {
      db.data.bingoGames[groupId] = {
        active: false,
        players: {},
        called: [],
        caller: null,
        startTime: null,
        intervalId: null,
        lastCall: null,
      };
      await db.save();
    }

    const game = db.data.bingoGames[groupId];

    if (sub === "start") {
      if (game.active) return m.reply(claraWrap("Bingo", "Game sudah berjalan!"));
      game.active = true;
      game.called = [];
      game.caller = sender;
      game.startTime = Date.now();
      game.players = {};
      await db.save();
      return m.reply(claraWrap("Bingo", [
        `Game Bingo dimulai!`,
        `Caller: @${sender.split("@")[0]}`,
        "",
        `Ketik ${usedPrefix}bingo join untuk ikut`,
        `Bot akan panggil angka otomatis tiap 10 detik`,
      ].join("\n")));
    }

    if (sub === "join") {
      if (!game.active) return m.reply(claraWrap("Bingo", `Belum ada game. Mulai dengan ${usedPrefix}bingo start`));
      if (game.players[sender]) {
        return m.reply(claraWrap("Bingo", "Kamu sudah join!"));
      }
      game.players[sender] = { card: generateBingoCard(), won: false };
      await db.save();
      const card = game.players[sender].card;
      const cardStr = formatCard(card);
      return m.reply(claraWrap("Bingo", [
        `Kamu join game Bingo!`,
        `Kartu kamu:`,
        "",
        cardStr,
        "",
        "Tunggu angka dipanggil. Kalau sudah BINGO, ketik .bingo claim",
      ].join("\n")));
    }

    if (sub === "claim") {
      if (!game.active) return m.reply(claraWrap("Bingo", "Tidak ada game aktif."));
      if (!game.players[sender]) return m.reply(claraWrap("Bingo", `Kamu belum join! Ketik ${usedPrefix}bingo join`));
      if (game.players[sender].won) return m.reply(claraWrap("Bingo", "Kamu sudah menang!"));
      const card = game.players[sender].card;
      if (checkBingo(card, game.called)) {
        game.players[sender].won = true;
        game.active = false;
        await db.save();
        return m.reply(claraWrap("Bingo", [
          `BINGO! @${sender.split("@")[0]} MENANG!`,
          `Angka dipanggil: ${game.called.length}`,
          `Durasi: ${Math.floor((Date.now() - game.startTime) / 1000)} detik`,
        ].join("\n")));
      } else {
        return m.reply(claraWrap("Bingo", "Belum BINGO! Kartu kamu belum lengkap. Cek lagi angka yang dipanggil."));
      }
    }

    if (sub === "card") {
      if (!game.active) return m.reply(claraWrap("Bingo", "Tidak ada game aktif."));
      if (!game.players[sender]) return m.reply(claraWrap("Bingo", `Belum join. Ketik ${usedPrefix}bingo join`));
      return m.reply(claraWrap("Bingo", [
        `Kartu kamu:`,
        "",
        formatCard(game.players[sender].card),
        "",
        `Angka sudah dipanggil: ${game.called.join(", ") || "belum ada"}`,
      ].join("\n")));
    }

    if (sub === "called" || sub === "numbers") {
      if (!game.active) return m.reply(claraWrap("Bingo", "Tidak ada game aktif."));
      return m.reply(claraWrap("Bingo", [
        `Angka dipanggil (${game.called.length}):`,
        game.called.join(", ") || "Belum ada",
      ].join("\n")));
    }

    if (sub === "stop") {
      game.active = false;
      game.players = {};
      game.called = [];
      game.caller = null;
      await db.save();
      return m.reply(claraWrap("Bingo", "Game dihentikan."));
    }

    if (sub === "players") {
      if (!game.active) return m.reply(claraWrap("Bingo", "Tidak ada game aktif."));
      const playerList = Object.entries(game.players).map(([jid, p], i) => `${i + 1}. @${jid.split("@")[0]}${p.won ? " (MENANG)" : ""}`).join("\n");
      return m.reply(claraWrap("Bingo", `Pemain (${Object.keys(game.players).length}):\n\n${playerList}`));
    }

    return m.reply(claraWrap("Bingo", [
      `Bingo - Game real-time grup`,
      "",
      `Command:`,
      `1. ${usedPrefix}bingo start - Mulai game`,
      `2. ${usedPrefix}bingo join - Ikut game`,
      `3. ${usedPrefix}bingo card - Lihat kartu`,
      `4. ${usedPrefix}bingo called - Angka dipanggil`,
      `5. ${usedPrefix}bingo claim - Claim BINGO`,
      `6. ${usedPrefix}bingo players - Lihat pemain`,
      `7. ${usedPrefix}bingo stop - Hentikan`,
    ].join("\n")));
  } catch (e) {
    console.error("bingo error:", e);
    return m.reply("Error: " + e.message);
  }
}

function formatCard(card) {
  const header = " B   I   N   G   O ";
  const lines = [header, "-".repeat(20)];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 5; col++) {
      const val = card[col][row];
      cells.push(String(val).padStart(3, " "));
    }
    lines.push(cells.join("  "));
  }
  return lines.join("\n");
}

export { pluginConfig as config, handler };
