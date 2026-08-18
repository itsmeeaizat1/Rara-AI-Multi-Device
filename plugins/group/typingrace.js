// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "typingrace",
  aliases: ["typingrace", "typerace", "ketikcepat"],
  category: "group",
  description: "Race ketik cepat - siapa pertama ketik persis sama menang",
  usage: ".typingrace start | .typingrace join | .typingrace go | .typingrace leaderboard | .typingrace stop",
  isGroupOnly: true,
};

const SENTENCES = [
  "Buah kesukaanku adalah mangga harum manis",
  "Kucing hitam melompat pagar di malam hari",
  "Aku suka makan nasi goreng pedas di pagi hari",
  "Bunga mawar mekar indah di taman belakang rumah",
  "Pelangi muncul setelah hujan reda di sore hari",
  "Burung elang terbang tinggi mencari mangsa",
  "Anak kecil tertawa bahagia di taman bermain",
  "Sopir taksi menepi di pinggir jalan raya",
  "Roket meluncur tinggi menembus lapisan atmosfer",
  "Ikan hiu berenang cepat di lautan dalam",
  "Jangan lupa makan sebelum berangkat sekolah",
  "Guru kami sangat baik dan sabar mengajar",
  "Robot masa depan bisa membantu pekerjaan rumah",
  "Kopi hangat di pagi hari sangat menyegarkan",
  "Lampu jalan menyala terang sepanjang malam",
  "Musim semi membawa keindahan alam yang luar biasa",
  "Harimau berlari cepat mengejar mangsanya",
  "Buku cerita ini sangat menarik untuk dibaca",
  "Sepeda motor melaju kencang di jalanan lurus",
  "Es krim coklat leleh di terik matahari siang",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.typingRace) db.data.typingRace = {};
    if (!db.data.typingRace[groupId]) {
      db.data.typingRace[groupId] = { active: false, players: [], sentence: "", startedAt: null, winner: null, phase: "idle" };
      await db.save();
    }

    if (!db.data.typingRace.leaderboard) db.data.typingRace.leaderboard = {};

    const game = db.data.typingRace[groupId];
    const leaderboard = db.data.typingRace.leaderboard;

    if (sub === "start") {
      if (game.active) return m.reply(claraWrap("Typing Race", "Sudah ada race berjalan."));
      game.active = true;
      game.players = [];
      game.sentence = "";
      game.winner = null;
      game.phase = "join";
      await db.save();
      return m.reply(claraWrap("Typing Race", [
        `Race dimulai!`,
        `Phase: Join`,
        "",
        `Ketik ${usedPrefix}typingrace join untuk ikut`,
        `Minimal 2 player. Setelah semua join, ketik ${usedPrefix}typingrace go`,
      ].join("\n")));
    }

    if (sub === "join") {
      if (!game.active || game.phase !== "join") return m.reply(`Belum ada race. Ketik ${usedPrefix}typingrace start`);
      if (game.players.includes(sender)) return m.reply("Sudah join!");
      game.players.push(sender);
      await db.save();
      return m.reply(claraWrap("Typing Race", [
        `@${sender.split("@")[0]} joined!`,
        `Total player: ${game.players.length}`,
        "",
        `${game.players.length >= 2 ? `Ketik ${usedPrefix}typingrace go untuk mulai!` : "Butuh minimal 2 player."}`,
      ].join("\n")));
    }

    if (sub === "go") {
      if (!game.active || game.phase !== "join") return m.reply("Tidak dalam fase join.");
      if (game.players.length < 2) return m.reply("Minimal butuh 2 player.");
      game.sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
      game.startedAt = Date.now();
      game.phase = "racing";
      game.winner = null;
      await db.save();
      return m.reply(claraWrap("Typing Race", [
        `GO! Ketik kalimat ini persis sama:`,
        "",
        `"${game.sentence}"`,
        "",
        `Ketik ${usedPrefix}typingrace done <kalimat di atas>`,
        `Siapa pertama benar, dia menang!`,
      ].join("\n")));
    }

    if (sub === "done") {
      if (!game.active || game.phase !== "racing") return m.reply("Tidak ada race berjalan.");
      if (game.winner) return m.reply(`Race sudah selesai! Pemenang: @${game.winner.split("@")[0]}`);
      const typed = text.split(" ").slice(1).join(" ").trim();
      if (!typed) return m.reply(`Cara: ${usedPrefix}typingrace done <kalimat>`);

      if (typed === game.sentence) {
        const elapsed = (Date.now() - game.startedAt) / 1000;
        const words = game.sentence.split(" ").length;
        const wpm = Math.round((words / elapsed) * 60);
        game.winner = sender;
        game.active = false;
        game.phase = "idle";

        if (!leaderboard[sender]) leaderboard[sender] = { wins: 0, bestWpm: 0, totalRaces: 0 };
        leaderboard[sender].wins++;
        leaderboard[sender].totalRaces++;
        if (wpm > leaderboard[sender].bestWpm) leaderboard[sender].bestWpm = wpm;
        await db.save();

        return m.reply(claraWrap("Typing Race", [
          `@${sender.split("@")[0]} MENANG!`,
          `Waktu: ${elapsed.toFixed(2)} detik`,
          `Speed: ${wpm} WPM`,
          "",
          `Total menang: ${leaderboard[sender].wins}x`,
          `WPM terbaik: ${leaderboard[sender].bestWpm}`,
        ].join("\n")));
      } else {
        return m.reply(claraWrap("Typing Race", [
          `SALAH! Ketik persis sama.`,
          `Yang kamu ketik: "${typed}"`,
          `Yang diminta: "${game.sentence}"`,
        ].join("\n")));
      }
    }

    if (sub === "leaderboard" || sub === "lb") {
      const sorted = Object.entries(leaderboard)
        .sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0))
        .slice(0, 10);
      if (sorted.length === 0) return m.reply(claraWrap("Typing Race", "Belum ada leaderboard."));
      const lb = sorted.map(([jid, d], i) => {
        const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
        return `${medal} @${jid.split("@")[0]} - ${d.wins} win, best ${d.bestWpm} WPM`;
      }).join("\n");
      return m.reply(claraWrap("Typing Race", `Leaderboard:\n\n${lb}`));
    }

    if (sub === "stop") {
      game.active = false;
      game.phase = "idle";
      game.players = [];
      game.winner = null;
      game.sentence = "";
      await db.save();
      return m.reply(claraWrap("Typing Race", "Race dihentikan."));
    }

    return m.reply(claraWrap("Typing Race", [
      `Typing Race - Ketik cepat, siapa pertama menang`,
      "",
      `Command:`,
      `1. ${usedPrefix}typingrace start - Mulai race`,
      `2. ${usedPrefix}typingrace join - Ikut race`,
      `3. ${usedPrefix}typingrace go - Mulai ketik`,
      `4. ${usedPrefix}typingrace done <kalimat> - Submit jawaban`,
      `5. ${usedPrefix}typingrace leaderboard - Top player`,
      `6. ${usedPrefix}typingrace stop - Stop`,
    ].join("\n")));
  } catch (e) {
    console.error("typingrace error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
