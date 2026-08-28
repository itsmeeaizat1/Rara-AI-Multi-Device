// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

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
    const pfx = usedPrefix || m.prefix || ".";

    if (!db.data.mostLikely) db.data.mostLikely = {};
    if (!db.data.mostLikely[groupId]) {
      db.data.mostLikely[groupId] = { active: false, question: null, votes: {}, voters: {}, startedAt: null, round: 0 };
      await db.save();
    }
    const game = db.data.mostLikely[groupId];

    // START
    if (sub === "start") {
      if (game.active) {
        return m.reply(novaError("Most Likely", `Game lagi berjalan nih!\nKetik \`${pfx}mostlikely stop\` untuk menghentikan.`));
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
        `Ketik: ${pfx}mostlikely vote @user`,
        `Lihat hasil: ${pfx}mostlikely result`,
        `Stop: ${pfx}mostlikely stop`,
      ], "success"));
    }

    // VOTE
    if (sub === "vote") {
      if (!game.active) {
        return m.reply(novaEmpty("Most Likely", `Gak ada game yang lagi aktif nih. Mulai dulu dengan \`${pfx}mostlikely start\``));
      }

      const target = m.mentionedJid?.[0] || (args[1] ? args[1].replace("@", "") + "@s.whatsapp.net" : null);
      if (!target) {
        return m.reply(novaNoInput("Most Likely", `Tag member yang mau kamu vote ya!\nContoh: \`${pfx}mostlikely vote @user\``));
      }

      if (game.voters[sender]) {
        return m.reply(novaError("Most Likely", "Kamu sudah memberikan vote di ronde ini!"));
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
        return m.reply(novaEmpty("Most Likely", `Belum ada sesi game. Mulai game baru dengan \`${pfx}mostlikely start\``));
      }

      if (Object.keys(game.votes).length === 0) {
        return m.reply(novaEmpty("Most Likely", `Belum ada member yang memberikan vote nih!\nKetik \`${pfx}mostlikely vote @user\``));
      }

      const sorted = Object.entries(game.votes).sort((a, b) => b[1] - a[1]);
      let result = "Pertanyaan: " + game.question + "\n\nHasil vote:\n";
      sorted.forEach(([user, count], i) => {
        result += (i + 1) + ". @" + user.split("@")[0] + " — " + count + " vote\n";
      });

      return m.reply(claraWrap("Most Likely", result));
    }

    // STOP
    if (sub === "stop") {
      if (!game.active) {
        return m.reply(novaEmpty("Most Likely", "Gak ada game yang lagi aktif untuk dihentikan."));
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
    return m.reply(novaGuide("Most Likely", "Siapa paling mungkin... — Game voting member grup yang seru!", `${pfx}mostlikely start | vote @user | result | stop`));
  } catch (e) {
    console.error("[Most Likely]", e);
    return m.reply(novaError("Most Likely", `Terjadi kesalahan pada game: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
