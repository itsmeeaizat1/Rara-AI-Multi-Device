// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "twotruths",
  alias: ["twotruths"],
  aliases: ["twotruths", "ttol", "duakebenaran"],
  category: "group",
  description: "Two Truths One Lie - 3 statement, tebak mana yang bohong",
  usage: ".twotruths submit <1> | <2> | <3> (markai * di depan yang bohong) | .twotruths guess <player> <nomor> | .twotruths list | .twotruths reveal | .twotruths stop",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.twoTruths) db.data.twoTruths = {};
    if (!db.data.twoTruths[groupId]) {
      db.data.twoTruths[groupId] = { active: false, players: {}, phase: "submit", revealed: {} };
      await db.save();
    }

    const game = db.data.twoTruths[groupId];

    if (sub === "start") {
      game.active = true;
      game.players = {};
      game.revealed = {};
      game.phase = "submit";
      await db.save();
      return m.reply(raraWrap("Two Truths One Lie", [
        `Game dimulai!`,
        `Phase: Submit statements`,
        "",
        `Ketik: ${usedPrefix}twotruths submit <statement1> | <statement2> | <*statement3_bohong>`,
        `Tandai yang BOHONG dengan * di depan`,
        "",
        `Contoh: .twotruths submit Saya bisa main piano | Saya pernah ke Jepang | *Saya jago masak`,
      ].join("\n")));
    }

    if (sub === "submit") {
      if (!game.active) return m.reply(raraWrap("Info", `Belum mulai. Ketik ${usedPrefix}twotruths start`, "info"));
      if (game.phase !== "submit") return m.reply(raraWrap("Info", "\u274c Phase submit sudah selesai."));
      if (game.players[sender]) return m.reply(raraWrap("Info", "\u274c Kamu sudah submit!"));

      const parts = text.split("|").map(s => s.trim());
      parts.shift();
      if (parts.length !== 3) {
        return m.reply(raraWrap("Two Truths One Lie", [
          `Butuh 3 statement dipisah dengan |`,
          `Tandai yang BOHONG dengan *`,
          `Contoh: ${usedPrefix}twotruths submit Aku suka kopi | Aku bisa renang | *Aku pernah juara`,
        ].join("\n")));
      }

      const lieIndex = parts.findIndex(p => p.startsWith("*"));
      if (lieIndex === -1) {
        return m.reply(raraWrap("Two Truths One Lie", "Tandai statement BOHONG dengan * di depan!"));
      }

      const statements = parts.map((p, i) => ({
        text: p.replace(/^\*/, "").trim(),
        isLie: i === lieIndex,
      }));

      game.players[sender] = { statements, guesses: {}, correctGuesses: 0, guessedBy: {} };
      await db.save();

      const display = statements.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
      return m.reply(raraWrap("Two Truths One Lie", [
        `@${sender.split("@")[0]} sudah submit!`,
        `Statements:`,
        display,
        "",
        `Jumlah player submit: ${Object.keys(game.players).length}`,
        `Ketik ${usedPrefix}twotruths guess untuk mulai menebak`,
      ].join("\n")));
    }

    if (sub === "guess") {
      if (!game.active) return m.reply(raraWrap("Info", "\u274c Tidak ada game aktif."));
      const target = m.mentionedJid?.[0];
      const guessNum = parseInt(args[2]) || parseInt(args[1]);
      if (!target) {
        if (game.phase === "submit" && Object.keys(game.players).length >= 1) {
          game.phase = "guess";
          await db.save();
        }
        const playerList = Object.entries(game.players).map(([jid, p], i) => `${i + 1}. @${jid.split("@")[0]}`).join("\n");
        return m.reply(raraWrap("Two Truths One Lie", [
          `Phase: Guess`,
          `Cara: ${usedPrefix}twotruths guess @player <nomor>`,
          "",
          `Players:`,
          playerList,
        ].join("\n")));
      }
      if (!game.players[target]) return m.reply(raraWrap("Info", "\u274c Player tidak ditemukan."));
      if (target === sender) return m.reply(raraWrap("Info", "\u274c Tidak bisa tebak sendiri!"));
      if (game.players[target].guessedBy[sender]) return m.reply(raraWrap("Info", "\u274c Kamu sudah tebak player ini!"));
      if (!guessNum || guessNum < 1 || guessNum > 3) return m.reply(raraWrap("Usage", "Pilih nomor 1, 2, atau 3."));

      const isCorrect = game.players[target].statements[guessNum - 1].isLie;
      game.players[target].guessedBy[sender] = guessNum;
      if (isCorrect) game.players[sender] = game.players[sender] || { statements: [], guesses: {}, correctGuesses: 0, guessedBy: {} };
      if (isCorrect && game.players[sender]) game.players[sender].correctGuesses++;
      await db.save();

      return m.reply(raraWrap("Two Truths One Lie", [
        `@${sender.split("@")[0]} menebak @${target.split("@")[0]}:`,
        `Pilihan: ${guessNum} - "${game.players[target].statements[guessNum - 1].text}"`,
        isCorrect ? "BENAR! Itu memang bohong!" : "SALAH! Itu statement benar.",
      ].join("\n")));
    }

    if (sub === "reveal") {
      if (!game.active) return m.reply(raraWrap("Info", "\u274c Tidak ada game aktif."));
      game.phase = "revealed";
      const results = Object.entries(game.players).map(([jid, p]) => {
        const lieIdx = p.statements.findIndex(s => s.isLie);
        const correct = p.statients?.[lieIdx] || p.statements[lieIdx];
        const guessers = Object.entries(p.guessedBy || {})
          .map(([g, num]) => `@${g.split("@")[0]}: ${num} ${num - 1 === lieIdx ? "(benar)" : "(salah)"}`)
          .join(", ");
        return [
          `@${jid.split("@")[0]}:`,
          p.statements.map((s, i) => `  ${i + 1}. ${s.text} ${s.isLie ? "<= BOHONG" : "(benar)"}`).join("\n"),
          `  Tebakan: ${guessers || "Belum ada yang tebak"}`,
        ].join("\n");
      }).join("\n\n");
      game.active = false;
      await db.save();
      return m.reply(raraWrap("Two Truths One Lie", `Hasil Reveal:\n\n${results}`, "info"));
    }

    if (sub === "list") {
      if (!game.active) return m.reply(raraWrap("Info", "\u274c Tidak ada game aktif."));
      const list = Object.entries(game.players).map(([jid, p]) => {
        const s = p.statements.map((st, i) => `${i + 1}. ${st.text}`).join("\n");
        return `@${jid.split("@")[0]}:\n${s}`;
      }).join("\n\n");
      return m.reply(raraWrap("Two Truths One Lie", `Players (${Object.keys(game.players).length}):\n\n${list}`, "info"));
    }

    if (sub === "stop") {
      game.active = false;
      game.players = {};
      game.phase = "idle";
      await db.save();
      return m.reply(raraWrap("Two Truths One Lie", "Game dihentikan."));
    }

    return m.reply(raraWrap("Two Truths One Lie", [
      `Two Truths One Lie - 2 benar 1 bohong, tebak!`,
      "",
      `Command:`,
      `1. ${usedPrefix}twotruths start - Mulai game`,
      `2. ${usedPrefix}twotruths submit <1> | <2> | <*3_bohong>`,
      `3. ${usedPrefix}twotruths guess @player <nomor>`,
      `4. ${usedPrefix}twotruths reveal - Buka jawaban`,
      `5. ${usedPrefix}twotruths list - Lihat player`,
      `6. ${usedPrefix}twotruths stop - Stop`,
    ].join("\n")));
  } catch (e) {
    console.error("twotruths error:", e);
    return m.reply(raraError("Twotruths", e.message));
  }
}

export { pluginConfig as config, handler };
