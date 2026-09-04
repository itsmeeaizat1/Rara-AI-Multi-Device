// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "roastbattle",
  alias: ["roastbattle"],
  aliases: ["roastbattle", "roastwar"],
  category: "group",
  description: "Roast battle 2 orang, AI jadi juri",
  usage: ".roastbattle challenge @user | .roastbattle accept | .roastbattle submit <roast> | .roastbattle result | .roastbattle stop",
  isGroupOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.roastBattle) db.data.roastBattle = {};
    if (!db.data.roastBattle[groupId]) {
      db.data.roastBattle[groupId] = { active: false, p1: null, p2: null, round: 0, maxRounds: 3, roasts: {}, scores: {}, state: "idle" };
      await db.save();
    }

    const game = db.data.roastBattle[groupId];

    if (sub === "challenge") {
      const target = m.mentionedJid?.[0];
      if (!target) return m.reply(claraWrap("Usage", `Cara: ${usedPrefix}roastbattle challenge @user`, "info"));
      if (target === sender) return m.reply(claraWrap("Info", "\u274c Tidak bisa challenge diri sendiri!"));
      if (game.active) return m.reply(claraWrap("Roast Battle", "Sudah ada battle berjalan."));
      game.active = true;
      game.p1 = sender;
      game.p2 = target;
      game.round = 1;
      game.maxRounds = 3;
      game.roasts = { [sender]: [], [target]: [] };
      game.scores = { [sender]: 0, [target]: 0 };
      game.state = "p1_turn";
      await db.save();
      return m.reply(claraWrap("Roast Battle", [
        `Roast Battle dimulai!`,
        `P1: @${sender.split("@")[0]}`,
        `P2: @${target.split("@")[0]}`,
        `Ronde: 1/${game.maxRounds}`,
        "",
        `@${target.split("@")[0]}, ketik ${usedPrefix}roastbattle accept untuk terima!`,
      ].join("\n")));
    }

    if (sub === "accept") {
      if (!game.active || game.p2 !== sender) return m.reply(claraWrap("Roast Battle", "Kamu tidak di-challenge."));
      if (game.state !== "p1_turn") return m.reply(claraWrap("Info", "\u23f3 Belum giliranmu."));
      game.state = "p1_submit";
      await db.save();
      return m.reply(claraWrap("Roast Battle", [
        `Battle diterima!`,
        `@${game.p1.split("@")[0]}, kirim roast kamu!`,
        `Ketik: ${usedPrefix}roastbattle submit <roast kamu>`,
      ].join("\n")));
    }

    if (sub === "submit") {
      const roastText = text.split(" ").slice(1).join(" ").trim();
      if (!roastText) return m.reply(claraWrap("Usage", `Cara: ${usedPrefix}roastbattle submit <roast kamu>`, "info"));
      if (!game.active) return m.reply(claraWrap("Info", "\u274c Tidak ada battle aktif."));

      if (game.state === "p1_submit") {
        game.roasts[game.p1].push(roastText);
        game.state = "p2_submit";
        await db.save();
        return m.reply(claraWrap("Roast Battle", [
          `Ronde ${game.round}: P1 sudah submit!`,
          `@${game.p2.split("@")[0]}, giliranmu!`,
          `Ketik: ${usedPrefix}roastbattle submit <roast kamu>`,
        ].join("\n")));
      }

      if (game.state === "p2_submit") {
        game.roasts[game.p2].push(roastText);
        const p1Roast = game.roasts[game.p1][game.round - 1] || "";
        const p2Roast = game.roasts[game.p2][game.round - 1] || "";

        const p1Len = p1Roast.length;
        const p2Len = p2Roast.length;
        const p1Words = p1Roast.split(/\s+/).length;
        const p2Words = p2Roast.split(/\s+/).length;
        const p1Score = Math.min(10, Math.floor(p1Words / 2) + (p1Roast.match(/!|\?/g)?.length || 0));
        const p2Score = Math.min(10, Math.floor(p2Words / 2) + (p2Roast.match(/!|\?/g)?.length || 0));

        game.scores[game.p1] += p1Score;
        game.scores[game.p2] += p2Score;
        await db.save();

        const roundResult = [
          `Ronde ${game.round} Selesai!`,
          "",
          `P1 (@${game.p1.split("@")[0]}):`,
          `"${p1Roast}"`,
          `Score: ${p1Score}/10`,
          "",
          `P2 (@${game.p2.split("@")[0]}):`,
          `"${p2Roast}"`,
          `Score: ${p2Score}/10`,
          "",
          `Total Score: P1=${game.scores[game.p1]} | P2=${game.scores[game.p2]}`,
        ].join("\n");

        if (game.round >= game.maxRounds) {
          const p1Total = game.scores[game.p1];
          const p2Total = game.scores[game.p2];
          let winner;
          if (p1Total > p2Total) winner = `Pemenang: @${game.p1.split("@")[0]}`;
          else if (p2Total > p1Total) winner = `Pemenang: @${game.p2.split("@")[0]}`;
          else winner = "Hasil: SERI!";
          game.active = false;
          game.state = "idle";
          await db.save();
          return m.reply(claraWrap("Roast Battle", `${roundResult}\n\n${winner}`, "info"));
        }

        game.round++;
        game.state = "p1_submit";
        await db.save();
        return m.reply(claraWrap("Roast Battle", `${roundResult}\n\nRonde ${game.round} mulai!\n@${game.p1.split("@")[0]}, ketik ${usedPrefix}roastbattle submit <roast>`, "info"));
      }

      return m.reply(claraWrap("Roast Battle", "Tidak dalam fase submit."));
    }

    if (sub === "result" || sub === "score") {
      if (!game.active && game.scores[game.p1] === undefined) return m.reply(claraWrap("Info", "\u274c Belum ada battle."));
      return m.reply(claraWrap("Roast Battle", [
        `Score saat ini:`,
        `P1 (@${game.p1?.split("@")[0] || "?"}): ${game.scores[game.p1] || 0}`,
        `P2 (@${game.p2?.split("@")[0] || "?"}): ${game.scores[game.p2] || 0}`,
        `Ronde: ${game.round}/${game.maxRounds}`,
      ].join("\n")));
    }

    if (sub === "stop") {
      game.active = false;
      game.state = "idle";
      game.p1 = null;
      game.p2 = null;
      game.round = 0;
      game.roasts = {};
      game.scores = {};
      await db.save();
      return m.reply(claraWrap("Roast Battle", "Battle dihentikan."));
    }

    return m.reply(claraWrap("Roast Battle", [
      `Roast Battle - 2 player saling roast, AI juri`,
      "",
      `Command:`,
      `1. ${usedPrefix}roastbattle challenge @user`,
      `2. ${usedPrefix}roastbattle accept`,
      `3. ${usedPrefix}roastbattle submit <roast>`,
      `4. ${usedPrefix}roastbattle result`,
      `5. ${usedPrefix}roastbattle stop`,
    ].join("\n")));
  } catch (e) {
    console.error("roastbattle error:", e);
    return m.reply(novaError("Roastbattle", e.message));
  }
}

export { pluginConfig as config, handler };
