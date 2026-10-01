// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rapbattle",
  alias: ["rapbattle"],
  category: "group",
  description: "Rap battle grup — tiap pemain kirim baris rap, grup vote paling hot",
  usage: ".rapbattle start @lawan | .rapbattle <baris rap> | .rapbattle vote @user | .rapbattle result | .rapbattle stop",
  isGroupOnly: true,
};

const BEATS = [
  "Beat 1 — Boom Bap Classic (90 BPM)",
  "Beat 2 — Trap Heavy (140 BPM)",
  "Beat 3 — Old School (85 BPM)",
  "Beat 4 — Drill Dark (145 BPM)",
  "Beat 5 — Lo-Fi Chill (75 BPM)",
];

const ROUNDS_MAX = 3;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.rapBattle) db.data.rapBattle = {};
    if (!db.data.rapBattle[groupId]) {
      db.data.rapBattle[groupId] = {
        active: false,
        p1: null,
        p2: null,
        round: 0,
        phase: "idle",
        bars: { },
        votes: {},
        voters: {},
        beat: null,
        currentTurn: null,
        startedAt: null,
      };
      await db.save();
    }
    const game = db.data.rapBattle[groupId];

    // START
    if (sub === "start") {
      if (game.active) {
        return m.reply(novaWrap("Rap Battle", "Battle lagi jalan!\nKetik .rapbattle stop untuk hentikan."));
      }

      const target = m.mentionedJid?.[0];
      if (!target) {
        return m.reply(novaWrap("Rap Battle", [
          "Tag lawan kamu!\n",
          "Contoh: .rapbattle start @Budi",
          "",
          "Tiap pemain kirim baris rap, grup vote paling hot!",
        ]));
      }
      if (target === sender) {
        return m.reply(novaWrap("Rap Battle", "Gak bisa battle diri sendiri!"));
      }

      game.active = true;
      game.p1 = sender;
      game.p2 = target;
      game.round = 1;
      game.phase = "p1";
      game.bars = { p1: [], p2: [] };
      game.votes = {};
      game.voters = {};
      game.beat = BEATS[Math.floor(Math.random() * BEATS.length)];
      game.currentTurn = sender;
      game.startedAt = Date.now();
      await db.save();

      return m.reply(novaWrap("Rap Battle", [
        "Rap battle dimulai!",
        "",
        "P1: @" + sender.split("@")[0],
        "P2: @" + target.split("@")[0],
        "Beat: " + game.beat,
        "Ronde: 1/" + ROUNDS_MAX,
        "",
        "@" + sender.split("@")[0] + " duluan! Kirim baris rap:",
        ".rapbattle <baris rap kamu>",
        "",
        "Tiap pemain kirim 2 baris per ronde.",
      ], "success"));
    }

    // VOTE
    if (sub === "vote") {
      if (!game.active || game.phase !== "vote") {
        return m.reply(novaWrap("Rap Battle", "Belum waktunya vote! Tunggu semua pemain kirim rap."));
      }

      const target = m.mentionedJid?.[0];
      if (!target) {
        return m.reply(novaWrap("Rap Battle", "Tag siapa yang menurutmu menang!\n.rapbattle vote @user"));
      }
      if (target !== game.p1 && target !== game.p2) {
        return m.reply(novaWrap("Rap Battle", "Itu bukan pemain battle!"));
      }
      if (game.voters[sender]) {
        return m.reply(novaWrap("Rap Battle", "Kamu sudah vote!"));
      }

      game.votes[target] = (game.votes[target] || 0) + 1;
      game.voters[sender] = target;
      await db.save();

      return m.reply(novaWrap("Rap Battle", "Vote @" + target.split("@")[0] + " tercatat! (" + game.votes[target] + " vote)", "success"));
    }

    // RESULT
    if (sub === "result" || sub === "hasil") {
      if (game.phase !== "vote" && !game.p1) {
        return m.reply(novaWrap("Rap Battle", "Belum ada battle. Ketik .rapbattle start @lawan."));
      }

      let result = "Rap Battle Result:\n\n";
      result += "P1: @" + game.p1.split("@")[0] + " — " + (game.votes[game.p1] || 0) + " vote\n";
      result += "P2: @" + game.p2.split("@")[0] + " — " + (game.votes[game.p2] || 0) + " vote\n\n";

      result += "Baris P1:\n";
      game.bars.p1.forEach((b) => (result += "  " + b + "\n"));
      result += "\nBaris P2:\n";
      game.bars.p2.forEach((b) => (result += "  " + b + "\n"));

      return m.reply(novaWrap("Rap Battle", result));
    }

    // STOP
    if (sub === "stop") {
      if (!game.active) {
        return m.reply(novaWrap("Rap Battle", "Gak ada battle aktif."));
      }
      game.active = false;
      game.phase = "idle";
      await db.save();

      const p1Votes = game.votes[game.p1] || 0;
      const p2Votes = game.votes[game.p2] || 0;
      let winner;
      if (p1Votes > p2Votes) winner = "P1 @" + game.p1.split("@")[0] + " menang!";
      else if (p2Votes > p1Votes) winner = "P2 @" + game.p2.split("@")[0] + " menang!";
      else winner = "Seri!";

      return m.reply(novaWrap("Rap Battle", [
        "Battle dihentikan!",
        "",
        winner,
        "",
        "P1: " + p1Votes + " vote | P2: " + p2Votes + " vote",
      ], "warn"));
    }

    // SUBMIT BAR
    if (game.active && (game.phase === "p1" || game.phase === "p2") && sender === game.currentTurn) {
      const bar = text.trim();
      if (!bar || bar.length < 3) {
        return m.reply(novaWrap("Rap Battle", "Kirim baris rap kamu!\n.rapbattle <baris rap>"));
      }

      const playerKey = game.phase;
      game.bars[playerKey].push(bar);
      await db.save();

      const barsCount = game.bars[playerKey].length;

      if (barsCount >= 2) {
        // Switch turn
        if (game.phase === "p1") {
          game.phase = "p2";
          game.currentTurn = game.p2;
          await db.save();

          return m.reply(novaWrap("Rap Battle", [
            "Baris P1 selesai!",
            "",
            "Giliran P2: @" + game.p2.split("@")[0],
            "Kirim 2 baris rap: .rapbattle <baris>",
          ], "success"));
        } else {
          // Both players done this round
          if (game.round >= ROUNDS_MAX) {
            // Final - go to vote
            game.phase = "vote";
            await db.save();

            let result = "Semua ronde selesai!\n\n";
            result += "Saatnya grup vote!\n";
            result += "Vote: .rapbattle vote @p1 atau @p2\n\n";
            result += "P1: @" + game.p1.split("@")[0] + "\n";
            game.bars.p1.forEach((b) => (result += "  " + b + "\n"));
            result += "\nP2: @" + game.p2.split("@")[0] + "\n";
            game.bars.p2.forEach((b) => (result += "  " + b + "\n"));

            return m.reply(novaWrap("Rap Battle", result, "success"));
          } else {
            // Next round
            game.round++;
            game.phase = "p1";
            game.currentTurn = game.p1;
            game.beat = BEATS[Math.floor(Math.random() * BEATS.length)];
            await db.save();

            return m.reply(novaWrap("Rap Battle", [
              "Ronde " + game.round + "/" + ROUNDS_MAX + "!",
              "Beat: " + game.beat,
              "",
              "Giliran P1: @" + game.p1.split("@")[0],
              "Kirim 2 baris rap: .rapbattle <baris>",
            ], "success"));
          }
        }
      }

      return m.reply(novaWrap("Rap Battle", "Baris " + barsCount + "/2 terkirim!\nKirim 1 baris lagi.", "success"));
    }

    // DEFAULT - help
    return m.reply(novaWrap("Rap Battle", [
      "Rap battle grup — tiap pemain kirim baris rap, grup vote paling hot",
      "",
      "CARA PAKAI:",
      usedPrefix + "rapbattle start @lawan — Mulai battle",
      usedPrefix + "rapbattle <baris rap> — Kirim baris rap",
      usedPrefix + "rapbattle vote @user — Vote pemenang",
      usedPrefix + "rapbattle result — Lihat baris rap",
      usedPrefix + "rapbattle stop — Hentikan battle",
      "",
      "CONTOH:",
      usedPrefix + "rapbattle start @Budi",
      usedPrefix + "rapbattle Aku terlalu dingin untuk kalah",
    ]));
  } catch (e) {
    console.error("[Rap Battle]", e);
    m.reply(novaWrap("Rap Battle", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
