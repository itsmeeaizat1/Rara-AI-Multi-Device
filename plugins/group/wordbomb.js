// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wordbomb",
  alias: ["wordbomb", "bomkata", "bombword", "passbom"],
  category: "group",
  description: "Bom kata! Ketik kata sesuai tema sebelum waktu habis",
  usage: ".wordbomb start | .wordbomb join | .wordbomb stop | .wordbomb stats",
  isGroupOnly: true,
};

const THEMES = [
  { theme: "Buah", words: ["mangga", "apel", "jeruk", "pisang", "anggur", "semangka", "melon", "jeruk bali", "durian", "rambutan", "salak", "nanas", "strawberry", "alpukat", "manggis", "kelapa", "pepaya", "leci", "kiwi", "naga"] },
  { theme: "Hewan", words: ["kucing", "anjing", "kelinci", "gajah", "harimau", "singa", "burung", "ikan", "kuda", "sapi", "kambing", "buaya", "ular", "monyet", "tikus", "kelelawar", "kupu-kupu", "lebah", "semut", "laba-laba"] },
  { theme: "Kota di Indonesia", words: ["jakarta", "bandung", "surabaya", "medan", "semarang", "makassar", "palembang", "denpasar", "yogyakarta", "bogor", "bekasi", "tangerang", "depok", "malang", "solo", "batam", "padang", "pekanbaru", "manado", "balikpapan"] },
  { theme: "Makanan", words: ["nasi", "mie", "gado-gado", "sate", "rendang", "bakso", "soto", "nasi goreng", "gado", "ayam", "bebek", "gudeg", "rawon", "pempek", "tekwan", "bika", "klepon", "serabi", "lumpia", "otak-otak"] },
  { theme: "Olahraga", words: ["sepak bola", "basket", "voli", "bulu tangkis", "renang", "lari", "tenis", "tinju", "karate", "judo", "panjat", "golf", "baseball", "rugby", "hoki", "bowling", "menembak", "anggar", "panahan", "balap"] },
  { theme: "Warna", words: ["merah", "biru", "hijau", "kuning", "ungu", "jingga", "hitam", "putih", "coklat", "abu-abu", "merah muda", "toska", "maroon", "emas", "perak", "perunggu", "nila", "magenta", "indigo", "salmon"] },
  { theme: "Mata Uang", words: ["rupiah", "dolar", "euro", "yen", "won", "ringgit", "baht", "pound", "franc", "yuan", "rupee", "lira", "rubel", "peso", "dinar", "dirham", "krona", "rand", "forint", "zloty"] },
  { theme: "Film/Anime", words: ["doraemon", "naruto", "one piece", "conan", "pokemon", "titanic", "avatar", "avengers", "spider-man", "batman", "superman", "frozen", "upin", "spongebob", "saitama", "jojo", "haikyu", "kuroko", "bleach", "dragon"] },
];

const TIME_LIMIT = 15000; // 15 detik per giliran

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.wordBomb) db.data.wordBomb = {};
    if (!db.data.wordBomb[groupId]) {
      db.data.wordBomb[groupId] = { active: false, players: [], theme: null, words: [], usedWords: [], currentPlayer: null, timer: null, scores: {}, round: 0, maxRounds: 5 };
      await db.save();
    }
    const game = db.data.wordBomb[groupId];

    // START
    if (sub === "start") {
      if (game.active) {
        return m.reply(claraWrap("Word Bomb", "Game lagi jalan!\nKetik .wordbomb stop untuk hentikan."));
      }
      if (game.players.length < 2) {
        return m.reply(claraWrap("Word Bomb", "Minimal 2 pemain!\nKetik .wordbomb join dulu."));
      }

      const picked = THEMES[Math.floor(Math.random() * THEMES.length)];
      game.active = true;
      game.theme = picked.theme;
      game.words = picked.words.map((w) => w.toLowerCase());
      game.usedWords = [];
      game.scores = {};
      game.round = 0;
      game.maxRounds = Math.max(5, game.players.length * 2);
      game.players.forEach((p) => (game.scores[p] = 0));
      game.currentPlayer = game.players[0];
      await db.save();

      m.reply(claraWrap("Word Bomb", [
        "Bom kata dimulai!",
        "",
        "Tema: *" + game.theme + "*",
        "Pemain: " + game.players.length,
        "Waktu per giliran: 15 detik",
        "",
        "Giliran pertama: @" + game.currentPlayer.split("@")[0],
        "",
        "Ketik kata sesuai tema sebelum bom meledak!",
      ], "success"));

      // Timer
      game.timer = Date.now();
      await db.save();

      // Auto-expire check
      setTimeout(async () => {
        try {
          const db2 = await getDatabase();
          const g = db2.data.wordBomb[groupId];
          if (g && g.active && g.currentPlayer === game.currentPlayer && g.timer === game.timer) {
            g.scores[g.currentPlayer] = (g.scores[g.currentPlayer] || 0) - 1;
            await conn.sendMessage(groupId, { text: claraWrap("Word Bomb", [
              "BOM MELEDAK!",
              "@" + g.currentPlayer.split("@")[0] + " terlambat! -1 poin",
              "",
              "Giliran berikutnya...",
            ], "warn"), mentions: [g.currentPlayer] });
            await nextTurn(db2, groupId, conn);
          }
        } catch (e) { console.error('[wordbomb.js]:', e.message); }
      }, TIME_LIMIT);

      return;
    }

    // JOIN
    if (sub === "join") {
      if (game.active) {
        return m.reply(claraWrap("Word Bomb", "Game sudah dimulai! Tunggu ronde berikutnya."));
      }
      if (game.players.includes(sender)) {
        return m.reply(claraWrap("Word Bomb", "Kamu sudah join!"));
      }
      game.players.push(sender);
      await db.save();

      return m.reply(claraWrap("Word Bomb", [
        "@" + sender.split("@")[0] + " join game!",
        "Total pemain: " + game.players.length,
        "",
        game.players.length >= 2 ? "Ketik .wordbomb start untuk mulai!" : "Butuh minimal 2 pemain.",
      ], "success"));
    }

    // STOP
    if (sub === "stop") {
      if (!game.active) {
        return m.reply(claraWrap("Word Bomb", "Gak ada game aktif."));
      }
      game.active = false;
      const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
      let result = "Game dihentikan!\n\nSkor akhir:\n";
      scores.forEach(([p, s], i) => {
        result += (i + 1) + ". @" + p.split("@")[0] + ": " + s + " poin\n";
      });
      await db.save();
      return m.reply(claraWrap("Word Bomb", result, "success"));
    }

    // STATS
    if (sub === "stats" || sub === "skor") {
      if (!game.active && Object.keys(game.scores).length === 0) {
        return m.reply(claraWrap("Word Bomb", "Belum ada game. Ketik .wordbomb start."));
      }
      const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
      let result = "Skor sementara:\n";
      scores.forEach(([p, s], i) => {
        result += (i + 1) + ". @" + p.split("@")[0] + ": " + s + " poin\n";
      });
      if (game.active) {
        result += "\nTema: " + game.theme + "\n";
        result += "Kata terpakai: " + game.usedWords.length;
      }
      return m.reply(claraWrap("Word Bomb", result));
    }

    // ANSWER
    if (game.active && game.currentPlayer === sender) {
      const word = text.trim().toLowerCase();
      if (!word) {
        return m.reply(claraWrap("Word Bomb", "Ketik kata sesuai tema: " + game.theme));
      }
      if (game.usedWords.includes(word)) {
        game.scores[sender] = (game.scores[sender] || 0) - 1;
        await db.save();
        return m.reply(claraWrap("Word Bomb", "Kata sudah dipakai! -1 poin\nKetik kata lain.", "warn"));
      }
      if (game.words.includes(word)) {
        game.usedWords.push(word);
        game.scores[sender] = (game.scores[sender] || 0) + 1;
        game.round++;
        await db.save();

        await m.react("🐣");
        m.reply(claraWrap("Word Bomb", "Betul! +1 poin\nKata: " + word + "\nTotal: " + game.scores[sender] + " poin", "success"));

        if (game.round >= game.maxRounds) {
          return endGame(db, groupId, conn);
        }

        return nextTurn(db, groupId, conn);
      } else {
        game.scores[sender] = (game.scores[sender] || 0) - 1;
        await db.save();
        return m.reply(claraWrap("Word Bomb", "Salah tema! -1 poin\nTema: " + game.theme, "warn"));
      }
    }

    // DEFAULT - help
    return m.reply(claraWrap("Word Bomb", [
      "Bom kata — ketik kata sesuai tema sebelum bom meledak!",
      "",
      "CARA PAKAI:",
      usedPrefix + "wordbomb join — Daftar sebagai pemain",
      usedPrefix + "wordbomb start — Mulai game (min 2 pemain)",
      usedPrefix + "wordbomb stop — Hentikan game",
      usedPrefix + "wordbomb stats — Lihat skor",
      "",
      "CONTOH:",
      usedPrefix + "wordbomb join",
      usedPrefix + "wordbomb start",
    ]));
  } catch (e) {
    console.error("[Word Bomb]", e);
    m.reply(claraWrap("Word Bomb", "Error: " + e.message));
  }
}

async function nextTurn(db, groupId, conn) {
  const game = db.data.wordBomb[groupId];
  const idx = game.players.indexOf(game.currentPlayer);
  game.currentPlayer = game.players[(idx + 1) % game.players.length];
  game.timer = Date.now();
  await db.save();

  await conn.sendMessage(groupId, {
    text: claraWrap("Word Bomb", [
      "Giliran: @" + game.currentPlayer.split("@")[0],
      "Tema: " + game.theme,
      "Waktu: 15 detik!",
    ]),
    mentions: [game.currentPlayer],
  });

  const cp = game.currentPlayer;
  const t = game.timer;
  setTimeout(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.wordBomb[groupId];
      if (g && g.active && g.currentPlayer === cp && g.timer === t) {
        g.scores[cp] = (g.scores[cp] || 0) - 1;
        await conn.sendMessage(groupId, { text: claraWrap("Word Bomb", [
          "BOM MELEDAK!",
          "@" + cp.split("@")[0] + " terlambat! -1 poin",
        ], "warn"), mentions: [cp] });
        g.round++;
        if (g.round >= g.maxRounds) {
          await endGame(db2, groupId, conn);
        } else {
          await nextTurn(db2, groupId, conn);
        }
      }
    } catch (e) { console.error('[wordbomb.js]:', e.message); }
  }, TIME_LIMIT);
}

async function endGame(db, groupId, conn) {
  const game = db.data.wordBomb[groupId];
  game.active = false;
  const scores = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
  let result = "Game selesai!\n\nSkor akhir:\n";
  scores.forEach(([p, s], i) => {
    const medal = i === 0 ? "Juara 1" : i === 1 ? "Juara 2" : i === 2 ? "Juara 3" : "Peserta";
    result += medal + ": @" + p.split("@")[0] + " — " + s + " poin\n";
  });
  await db.save();
  return conn.sendMessage(groupId, {
    text: claraWrap("Word Bomb", result, "success"),
    mentions: scores.map(([p]) => p),
  });
}

export { pluginConfig as config, handler };
