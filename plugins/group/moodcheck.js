// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "moodcheck",
  aliases: ["moodcheck", "vibecheck", "vibe"],
  category: "group",
  description: "Cek mood/suasana grup dengan poll emoji",
  usage: ".moodcheck start | .moodcheck result | .moodcheck reset",
  isGroupOnly: true,
};

const MOODS = {
  "😊": { name: "Senang", score: 5 },
  "😐": { name: "Biasa", score: 3 },
  "😔": { name: "Sedih", score: 2 },
  "😡": { name: "Marah", score: 1 },
  "🤔": { name: "Bingung", score: 3 },
  "😴": { name: "Ngantuk", score: 2 },
  "🥳": { name: "Excited", score: 5 },
  "🤒": { name: "Sakitt", score: 1 },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.moodCheck) db.data.moodCheck = {};
    if (!db.data.moodCheck[groupId]) {
      db.data.moodCheck[groupId] = { active: false, votes: {}, startedBy: null, startTime: null, messageId: null };
      await db.save();
    }

    const poll = db.data.moodCheck[groupId];

    if (sub === "start") {
      if (poll.active) return m.reply(claraWrap("Mood Check", `Sedang aktif. Ketik ${usedPrefix}moodcheck result untuk lihat hasil.`));
      poll.active = true;
      poll.votes = {};
      poll.startedBy = sender;
      poll.startTime = Date.now();
      await db.save();

      const moodList = Object.entries(MOODS).map(([emoji, d]) => `${emoji} ${d.name}`).join("  ");
      const msg = await conn.sendMessage(groupId, {
        text: claraWrap("Mood Check", [
          `Cek suasana grup!`,
          `React pesan ini dengan mood kamu:`,
          "",
          moodList,
          "",
          `Started by @${sender.split("@")[0]}`,
        ].join("\n")),
      });
      poll.messageId = msg?.key?.id || null;
      await db.save();

      try {
        for (const emoji of Object.keys(MOODS)) {
          await conn.sendMessage(groupId, { react: { key: msg.key, text: emoji } });
        }
      } catch (e) {}
      return;
    }

    if (sub === "result" || sub === "stats") {
      if (!poll.active && Object.keys(poll.votes).length === 0) {
        return m.reply(claraWrap("Mood Check", `Belum ada mood check. Mulai dengan ${usedPrefix}moodcheck start`));
      }
      const voteCount = Object.values(poll.votes);
      const total = voteCount.length;
      if (total === 0) {
        return m.reply(claraWrap("Mood Check", "Belum ada vote. Member react emoji di pesan mood check."));
      }
      const tally = {};
      for (const vote of voteCount) {
        tally[vote] = (tally[vote] || 0) + 1;
      }
      let totalScore = 0;
      const breakdown = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .map(([emoji, count]) => {
          const mood = MOODS[emoji];
          if (mood) totalScore += mood.score * count;
          const pct = Math.round((count / total) * 100);
          const bar = "█".repeat(Math.round(pct / 5)).padEnd(20, "░");
          return `${emoji} ${mood?.name || "?"} | ${bar} ${count} (${pct}%)`;
        }).join("\n");

      const avgScore = (totalScore / total).toFixed(1);
      const vibeLabel = avgScore >= 4.5 ? "Sangat Positif" : avgScore >= 3.5 ? "Positif" : avgScore >= 2.5 ? "Netral" : avgScore >= 1.5 ? "Negatif" : "Sangat Negatif";

      return m.reply(claraWrap("Mood Check", [
        `Hasil Mood Check Grup`,
        `Total voter: ${total}`,
        `Avg score: ${avgScore}/5 (${vibeLabel})`,
        "",
        breakdown,
        "",
        `Ketik ${usedPrefix}moodcheck reset untuk mulai ulang`,
      ].join("\n")));
    }

    if (sub === "reset") {
      poll.active = false;
      poll.votes = {};
      poll.startedBy = null;
      poll.startTime = null;
      poll.messageId = null;
      await db.save();
      return m.reply(claraWrap("Mood Check", "Mood check direset."));
    }

    return m.reply(claraWrap("Mood Check", [
      `Mood Check - Cek suasana grup dengan emoji poll`,
      "",
      `Command:`,
      `1. ${usedPrefix}moodcheck start - Mulai poll`,
      `2. ${usedPrefix}moodcheck result - Lihat hasil`,
      `3. ${usedPrefix}moodcheck reset - Reset`,
    ].join("\n")));
  } catch (e) {
    console.error("moodcheck error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
