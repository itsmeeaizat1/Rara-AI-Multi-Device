// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mostlikely",
  alias: ["mostlikely"],
  category: "group",
  description: "Siapa paling mungkin... — voting member grup secara seru",
  usage: ".mostlikely start | .mostlikely vote @user | .mostlikely result | .mostlikely stop",
  isGroupOnly: true,
};

const QUESTIONS = [
  "Paling mungkin tidur di kelas",
  "Paling mungkin lupa ulang tahun sendiri",
  "Paling mungkin habis uang jajan dalam 1 hari",
  "Paling mungkin menangis nonton film sedih",
  "Paling mungkin tertawa sendiri ingat joke lama",
  "Paling mungkin lupa dimana taruh HP",
  "Paling mungkin reply chat 3 hari kemudian",
  "Paling mungkin pakai baju keluar dalam-dalam",
  "Paling mungkin nyanyin lagi shower dengan volume penuh",
  "Paling mungkin beli sesuatu cuma karena diskon",
  "Paling mungkin lupa nama orang pas dipapercaya",
  "Paling mungkin tidur jam 3 pagi tiap hari",
  "Paling mungkin makan 5x sehari",
  "Paling mungkin ghosting seseorang",
  "Paling mungkin nangis pas dikirain jadian",
  "Paling mungkin ikut challenge viral di TikTok",
  "Paling mungkin ketinggalan kereta karena bangun siang",
  "Paling mungkin scroll TikTok sampai pagi",
  "Paling mungkin order GoFood tiap hari",
  "Paling mungkin bilang 'besok aja' tiap diajak nongkrong",
  "Paling mungkin jadi miliarder pertama di grup",
  "Paling mungkin pindah agama karena cinta",
  "Paling mungkin jadi influencer viral",
  "Paling mungkin menang lomba makan",
  "Paling mungkin ketiduran pas meeting online",
  "Paling mungkin kirim screenshot ke orang salah",
  "Paling mungkin jual barang beliannya sendiri",
  "Paling mungkin follow crush di semua sosmed",
  "Paling mungkin lupa password akun sendiri",
  "Paling mungkin beli minuman cuma bukan diminum, buat foto",
  "Paling mungkin jadi orang paling sibuk padahal gak jelas",
  "Paling mungkin reply 'haha' padahal gak lucu",
  "Paling mungkin repost story orang tanpa baca",
  "Paling mungkin makan mie instan 3x sehari",
  "Paling mungkin pake filter selfie tiap foto",
  "Paling mungkin keluar rumah pakai dompet kosong",
  "Paling mungkin lupa hari jadian sendiri",
  "Paling mungkin nonton drama Korea sampai marathon",
  "Paling mungkin tidur di angkot dan kelewat stop",
  "Paling mungkin komen 'halo' di grup tapi gak dibalas",
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.mostLikely) db.data.mostLikely = {};
    if (!db.data.mostLikely[groupId]) {
      db.data.mostLikely[groupId] = { active: false, question: null, votes: {}, voters: {}, startedAt: null, round: 0 };
      await db.save();
    }
    const game = db.data.mostLikely[groupId];

    // START
    if (sub === "start") {
      if (game.active) {
        return m.reply(claraWrap("Most Likely", "Game lagi jalan!\nKetik .mostlikely stop untuk hentikan."));
      }

      const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      game.active = true;
      game.question = question;
      game.votes = {};
      game.voters = {};
      game.startedAt = Date.now();
      game.round = (game.round || 0) + 1;
      await db.save();

      return m.reply(claraWrap("Most Likely", [
        "Ronde #" + game.round,
        "",
        game.question + "??",
        "",
        "Tag orang yang menurutmu paling mungkin!",
        "",
        "Ketik: .mostlikely vote @user",
        "Lihat hasil: .mostlikely result",
        "Stop: .mostlikely stop",
      ], "success"));
    }

    // VOTE
    if (sub === "vote") {
      if (!game.active) {
        return m.reply(claraWrap("Most Likely", "Gak ada game aktif. Ketik .mostlikely start."));
      }

      const target = m.mentionedJid?.[0] || (args[1] ? args[1].replace("@", "") + "@s.whatsapp.net" : null);
      if (!target) {
        return m.reply(claraWrap("Most Likely", "Tag orangnya!\nContoh: .mostlikely vote @Budi"));
      }

      if (game.voters[sender]) {
        return m.reply(claraWrap("Most Likely", "Kamu sudah vote ronde ini!"));
      }

      game.votes[target] = (game.votes[target] || 0) + 1;
      game.voters[sender] = target;
      await db.save();

      return m.reply(claraWrap("Most Likely", [
        "@" + sender.split("@")[0] + " vote @" + target.split("@")[0] + "!",
        "",
        "Total vote: " + Object.keys(game.voters).length,
      ], "success"));
    }

    // RESULT
    if (sub === "result" || sub === "hasil") {
      if (!game.active && !game.question) {
        return m.reply(claraWrap("Most Likely", "Belum ada game. Ketik .mostlikely start."));
      }

      if (Object.keys(game.votes).length === 0) {
        return m.reply(claraWrap("Most Likely", "Belum ada yang vote!\nKetik .mostlikely vote @user"));
      }

      const sorted = Object.entries(game.votes).sort((a, b) => b[1] - a[1]);
      let result = "Pertanyaan: " + game.question + "\n\nHasil vote:\n";
      sorted.forEach(([user, count], i) => {
        const medal = i === 0 ? "Paling banyak dipilih" : i + 2 + " vote";
        result += (i + 1) + ". @" + user.split("@")[0] + " — " + count + " vote\n";
      });

      return m.reply(claraWrap("Most Likely", result));
    }

    // STOP
    if (sub === "stop") {
      if (!game.active) {
        return m.reply(claraWrap("Most Likely", "Gak ada game aktif."));
      }
      game.active = false;
      await db.save();

      let result = "Game dihentikan!\n";
      if (Object.keys(game.votes).length > 0) {
        const sorted = Object.entries(game.votes).sort((a, b) => b[1] - a[1]);
        result += "\nHasil akhir:\n";
        result += game.question + "\n\n";
        sorted.forEach(([user, count], i) => {
          result += (i + 1) + ". @" + user.split("@")[0] + " — " + count + " vote\n";
        });
      }
      return m.reply(claraWrap("Most Likely", result, "warn"));
    }

    // DEFAULT - help
    return m.reply(claraWrap("Most Likely", [
      "Siapa paling mungkin... — voting member grup seru",
      "",
      "CARA PAKAI:",
      usedPrefix + "mostlikely start — Mulai ronde baru",
      usedPrefix + "mostlikely vote @user — Vote member",
      usedPrefix + "mostlikely result — Lihat hasil vote",
      usedPrefix + "mostlikely stop — Hentikan game",
      "",
      "CONTOH:",
      usedPrefix + "mostlikely start",
      usedPrefix + "mostlikely vote @6281234567890",
    ]));
  } catch (e) {
    console.error("[Most Likely]", e);
    m.reply(claraWrap("Most Likely", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
