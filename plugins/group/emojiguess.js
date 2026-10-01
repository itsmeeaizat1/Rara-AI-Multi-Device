// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "emojiguess",
  alias: ["emojiguess"],
  category: "group",
  description: "Tebak judul dari emoji — film, lagu, makanan, dll",
  usage: ".emojiguess start | .emojiguess <jawaban> | .emojiguess hint | .emojiguess stop",
  isGroupOnly: true,
};

const PUZZLES = [
  { emoji: "🦁👑", answer: "lion king", hints: ["Film Disney", "Raja hutan"] },
  { emoji: "🕷️👨", answer: "spiderman", hints: ["Superhero Marvel", "Manusia laba-laba"] },
  { emoji: "🦇🃏", answer: "batman", hints: ["Superhero DC", "Gotham City"] },
  { emoji: "❄️👸", answer: "frozen", hints: ["Film Disney", "Elsa dan Anna"] },
  { emoji: "🤖🚀", answer: "wall e", hints: ["Film Pixar", "Robot"] },
  { emoji: "🐠🦈", answer: "finding nemo", hints: ["Film Pixar", "Ikan"] },
  { emoji: "🍔🍟", answer: "mcd", hints: ["Restoran cepat saji", "M"] },
  { emoji: "📱💬", answer: "whatsapp", hints: ["Aplikasi chat", "Meta"] },
  { emoji: "🐲🔥", answer: "game of thrones", hints: ["Serial TV", "Dragon"] },
  { emoji: "🧙‍♂️⚡📖", answer: "harry potter", hints: ["Film", "Sihir"] },
  { emoji: "🐜🦸", answer: "antman", hints: ["Marvel", "Kecil"] },
  { emoji: "🌊🐚🧜‍♀️", answer: "little mermaid", hints: ["Disney", "Putri duyung"] },
  { emoji: "🌹👹", answer: "beauty and the beast", hints: ["Disney", "Bunga"] },
  { emoji: "🐘👃", answer: "dumbo", hints: ["Disney", "Hewan"] },
  { emoji: "🐼🥋", answer: "kungfu panda", hints: ["Film animasi", "Panda"] },
  { emoji: "🧊🚢💔", answer: "titanic", hints: ["Film", "Kapal"] },
  { emoji: "🐍📚🐍", answer: "harry potter", hints: ["Film", "Basilisk"] },
  { emoji: "🍓🍰", answer: "strawberry shortcake", hints: ["Dessert", "Buah"] },
  { emoji: "🍫🏭", answer: "charlie and the chocolate factory", hints: ["Film", "Coklat"] },
  { emoji: "🤝🧟", answer: "zombie", hints: ["Film horor", "Mayat hidup"] },
  { emoji: "🌞", answer: "tangled", hints: ["Disney", "Rapunzel"] },
  { emoji: "🏎️💨", answer: "fast and furious", hints: ["Film aksi", "Balap"] },
  { emoji: "🦖🦕🧬", answer: "jurassic park", hints: ["Film", "Dinosaurus"] },
  { emoji: "💍🌋👤", answer: "lord of the rings", hints: ["Film fantasi", "Cincin"] },
  { emoji: "👻🔫", answer: "ghostbusters", hints: ["Film", "Hantu"] },
  { emoji: "🐼🍜", answer: "kungfu panda", hints: ["Animasi", "Bela diri"] },
  { emoji: "🐠🐟🐾", answer: "finding nemo", hints: ["Pixar", "Laut"] },
  { emoji: "🦇🦇🦇", answer: "batman", hints: ["DC", "Gelap"] },
  { emoji: "🧊🧊🎵", answer: "frozen", hints: ["Disney", "Lagu Let It Go"] },
  { emoji: "🐲🏯", answer: "mulan", hints: ["Disney", "China"] },
  { emoji: "🐜🐜🐜", answer: "ants", hints: ["Film Pixar", "Serangga"] },
  { emoji: "🦸‍♀️🦸‍♂️🦹‍♂️", answer: "incredible", hints: ["Pixar", "Keluarga superhero"] },
  { emoji: "🐒👑", answer: "tarzan", hints: ["Disney", "Hutan"] },
  { emoji: "🤠🚀", answer: "toy story", hints: ["Pixar", "Woody"] },
  { emoji: "🐠🎥", answer: "finding nemo", hints: ["Pixar", "Kamera bawah laut"] },
  { emoji: "🧜‍♀️🌊🐚", answer: "little mermaid", hints: ["Disney", "Ariel"] },
  { emoji: "🦊🚶", answer: "zootopia", hints: ["Disney", "Rubah"] },
  { emoji: "🎪🤡", answer: "it", hints: ["Horor", "Badut"] },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.emojiGuess) db.data.emojiGuess = {};
    if (!db.data.emojiGuess[groupId]) {
      db.data.emojiGuess[groupId] = { active: false, puzzle: null, answer: null, hints: [], hintUsed: 0, startedAt: null, winner: null, scores: {} };
      await db.save();
    }
    const game = db.data.emojiGuess[groupId];

    // START
    if (sub === "start") {
      if (game.active) {
        return m.reply(novaWrap("Emoji Guess", "Game lagi jalan!\nKetik .emojiguess stop untuk hentikan."));
      }

      const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
      game.active = true;
      game.puzzle = puzzle.emoji;
      game.answer = puzzle.answer;
      game.hints = puzzle.hints;
      game.hintUsed = 0;
      game.startedAt = Date.now();
      game.winner = null;
      await db.save();

      return m.reply(novaWrap("Emoji Guess", [
        "Tebak judul dari emoji ini!",
        "",
        "Emoji: " + game.puzzle,
        "",
        "Ketik: .emojiguess <jawaban>",
        "Hint: .emojiguess hint",
        "Stop: .emojiguess stop",
      ], "success"));
    }

    // HINT
    if (sub === "hint") {
      if (!game.active) {
        return m.reply(novaWrap("Emoji Guess", "Gak ada game aktif. Ketik .emojiguess start."));
      }
      if (game.hintUsed >= game.hints.length) {
        return m.reply(novaWrap("Emoji Guess", "Hint habis! Tebak aja."));
      }
      const hint = game.hints[game.hintUsed];
      game.hintUsed++;
      await db.save();

      return m.reply(novaWrap("Emoji Guess", "Hint " + game.hintUsed + ": " + hint));
    }

    // STOP
    if (sub === "stop") {
      if (!game.active) {
        return m.reply(novaWrap("Emoji Guess", "Gak ada game aktif."));
      }
      game.active = false;
      await db.save();
      return m.reply(novaWrap("Emoji Guess", "Game dihentikan!\nJawabannya: " + game.answer, "warn"));
    }

    // ANSWER
    if (game.active) {
      const answer = text.trim().toLowerCase();
      if (!answer) {
        return m.reply(novaWrap("Emoji Guess", "Ketik jawaban: .emojiguess <jawaban>"));
      }
      if (answer === game.answer || answer.replace(/\s/g, "") === game.answer.replace(/\s/g, "")) {
        game.active = false;
        if (!game.scores[sender]) game.scores[sender] = 0;
        game.scores[sender] += 1;
        await db.save();

        let scoreText = "Total menang: " + game.scores[sender] + "x";
        return m.reply(novaWrap("Emoji Guess", [
          "BENAR! @" + sender.split("@")[0] + " menang!",
          "Jawaban: " + game.answer,
          "",
          scoreText,
          "",
          "Ketik .emojiguess start untuk ronde baru!",
        ], "success"));
      } else {
        return m.reply(novaWrap("Emoji Guess", "Salah! Coba lagi.\nHint: .emojiguess hint", "warn"));
      }
    }

    // DEFAULT - help
    return m.reply(novaWrap("Emoji Guess", [
      "Tebak judul dari emoji — film, lagu, makanan, dll",
      "",
      "CARA PAKAI:",
      usedPrefix + "emojiguess start — Mulai game baru",
      usedPrefix + "emojiguess <jawaban> — Submit jawaban",
      usedPrefix + "emojiguess hint — Minta hint",
      usedPrefix + "emojiguess stop — Hentikan game",
      "",
      "CONTOH:",
      usedPrefix + "emojiguess start",
      usedPrefix + "emojiguess spiderman",
    ]));
  } catch (e) {
    console.error("[Emoji Guess]", e);
    m.reply(novaWrap("Emoji Guess", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
