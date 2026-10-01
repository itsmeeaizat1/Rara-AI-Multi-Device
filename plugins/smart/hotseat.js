// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hotseat",
  alias: ["hotseat"],
  category: "smart",
  description: "Hot seat - 1 orang diinterogasi grup dengan pertanyaan acak",
  usage: ".hotseat <command>",
  example: ".hotseat start @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const QUESTIONS = [
  // Light
  { level: "light", q: "Makanan yang kamu benci banget tapi semua orang suka?" },
  { level: "light", q: "Lagu yang kamu malu akui kalau lagi sering diulang?" },
  { level: "light", q: "Apa kebiasaan paling annoying yang kamu lakuin?" },
  { level: "light", q: "Apa hal paling memalukan yang pernah terjadi di tempat umum?" },
  { level: "light", q: "Kapan terakhir kamu nangis dan kenapa?" },
  { level: "light", q: "Apa isi wallpaper HP kamu sekarang?" },
  { level: "light", q: "Apa alasan kamu join grup ini pertama kali?" },
  // Medium
  { level: "medium", q: "Siapa di grup ini yang paling kamu percaya dan kenapa?" },
  { level: "medium", q: "Apa rahasia yang belum pernah kamu kasih tahu siapa-siapa?" },
  { level: "medium", q: "Kalo bisa hapus 1 orang dari grup ini, siapa dan kenapa?" },
  { level: "medium", q: "Apa ketakutan terbesar kamu yang belum ada yang tahu?" },
  { level: "medium", q: "Kapan terakhir kamu bohong ke orang tua?" },
  { level: "medium", q: "Apa hal yang paling kamu sesali sampai sekarang?" },
  { level: "medium", q: "Pernah suka sama orang di grup ini tapi gak berani bilang?" },
  { level: "medium", q: "Apa ekspektasi kamu buat diri sendiri 5 tahun lagi?" },
  // Deep
  { level: "deep", q: "Apa yang bikin kamu merasa hidup berarti?" },
  { level: "deep", q: "Kalo besok dunia kiamat, 3 hal apa yang kamu lakuin?" },
  { level: "deep", q: "Pernah mikir buat pergi dari grup ini tanpa alasan jelas?" },
  { level: "deep", q: "Apa yang kamu harap orang bilang di pemakaman kamu?" },
  { level: "deep", q: "Apa hal paling tidak kamu maafkan dari orang lain?" },
  { level: "deep", q: "Kalo bisa mundur waktu, momen mana yang mau kamu ulang?" },
  { level: "deep", q: "Apa yang bikin kamu masih bertahan di hidup saat ini?" },
];

const QUESTIONS_PER_SESSION = 3;

function getConfig(db, gid) {
  const all = db.setting("hotseat") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("hotseat") || {};
  all[gid] = data;
  db.setting("hotseat", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("hotseat") || {};
  delete all[gid];
  db.setting("hotseat", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "start" || sub === "mulai") {
    if (game && game.active) {
      await m.reply(novaWrap("Hot Seat", "Masih ada sesi aktif! @" + game.target.split("@")[0] + " di hot seat.\n" + prefix + "hotseat stop untuk hentikan."), { mentions: [game.target] });
      return { handled: true };
    }
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(novaWrap("Hot Seat", "Khusus admin/owner buat mulai."));
      return { handled: true };
    }
    const target = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null;
    if (!target) {
      await m.reply(novaWrap("Hot Seat", "Tag orang yang mau di-hot seat!\n💡 *Contoh:* " + prefix + "hotseat start @user"));
      return { handled: true };
    }

    // Pick questions
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, QUESTIONS_PER_SESSION);

    const data = {
      active: true,
      target,
      questions: selected,
      currentQ: 0,
      answers: [],
      startedAt: Date.now(),
      startedBy: m.sender,
    };
    saveConfig(db, gid, data);

    await m.reply(novaWrap("Hot Seat", [
      "HOT SEAT DIMULAI!",
      "",
      "Target: @" + target.split("@")[0],
      "Pertanyaan: " + QUESTIONS_PER_SESSION + " (light, medium, deep)",
      "",
      "Pertanyaan #1:",
      "[" + selected[0].level.toUpperCase() + "]",
      selected[0].q,
      "",
      "@" + target.split("@")[0] + " jawab dengan: " + prefix + "hotseat answer <jawaban>",
      "Grup bisa vote jawaban: " + prefix + "hotseat vote 👍/👎",
    ].join("\n")), { mentions: [target] });
    return { handled: true };
  }

  if (sub === "answer" || sub === "jawab") {
    if (!game || !game.active) {
      await m.reply(novaWrap("Hot Seat", "Tidak ada sesi aktif."));
      return { handled: true };
    }
    if (game.target !== m.sender) {
      await m.reply(novaWrap("Hot Seat", "Bukan kamu yang di hot seat! @" + game.target.split("@")[0] + " yang jawab."), { mentions: [game.target] });
      return { handled: true };
    }
    const text = args.slice(2).join(" ").trim();
    if (!text) {
      await m.reply(novaWrap("Hot Seat", "Ketik jawaban: " + prefix + "hotseat answer <jawaban>"));
      return { handled: true };
    }

    const currentQuestion = game.questions[game.currentQ];
    game.answers.push({ q: currentQuestion.q, a: text, level: currentQuestion.level, votes: [], ts: Date.now() });

    await m.reply(novaWrap("Hot Seat - Jawaban", [
      "Q: " + currentQuestion.q,
      "@" + target.split("@")[0] + ":",
      text,
      "",
      "Grup vote: " + prefix + "hotseat vote 👍 atau " + prefix + "hotseat vote 👎",
    ].join("\n")), { mentions: [game.target] });
    return { handled: true };
  }

  if (sub === "vote" || sub === "react") {
    if (!game || !game.active) {
      await m.reply(novaWrap("Hot Seat", "Tidak ada sesi aktif."));
      return { handled: true };
    }
    if (game.target === m.sender) {
      await m.reply(novaWrap("Hot Seat", "Tidak bisa vote jawaban sendiri!"));
      return { handled: true };
    }
    if (game.answers.length === 0) {
      await m.reply(novaWrap("Hot Seat", "Belum ada jawaban untuk di-vote."));
      return { handled: true };
    }
    const emoji = (args[2] || "").trim();
    if (emoji !== "👍" && emoji !== "👎") {
      await m.reply(novaWrap("Hot Seat", "Ketik: " + prefix + "hotseat vote 👍 atau " + prefix + "hotseat vote 👎"));
      return { handled: true };
    }

    const lastAnswer = game.answers[game.answers.length - 1];
    if (!lastAnswer.voters) lastAnswer.voters = {};
    if (lastAnswer.voters[m.sender]) {
      await m.reply(novaWrap("Hot Seat", "Kamu sudah vote!"));
      return { handled: true };
    }
    lastAnswer.voters[m.sender] = emoji;
    saveConfig(db, gid, game);
    return { handled: true };
  }

  if (sub === "next" || sub === "lanjut") {
    if (!game || !game.active) {
      await m.reply(novaWrap("Hot Seat", "Tidak ada sesi aktif."));
      return { handled: true };
    }
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(novaWrap("Hot Seat", "Khusus admin/owner."));
      return { handled: true };
    }
    game.currentQ++;
    if (game.currentQ >= game.questions.length) {
      // Session complete
      const answerList = game.answers.map((a, i) => "Q" + (i + 1) + " [" + a.level + "]: " + a.q + "\nA: " + a.a + "\n").join("\n");
      delConfig(db, gid);
      await m.reply(novaWrap("Hot Seat - SELESAI", [
        "@" + game.target.split("@")[0] + " telah menjawab semua!",
        "",
        "Rekap jawaban:",
        answerList,
        "",
        "Hot seat berakhir. Terima kasih sudah jujur!",
      ].join("\n")), { mentions: [game.target] });
      return { handled: true };
    }

    const nextQ = game.questions[game.currentQ];
    saveConfig(db, gid, game);
    await m.reply(novaWrap("Hot Seat - Pertanyaan #" + (game.currentQ + 1), [
      "[" + nextQ.level.toUpperCase() + "]",
      nextQ.q,
      "",
      "@" + game.target.split("@")[0] + " jawab: " + prefix + "hotseat answer <jawaban>",
    ].join("\n")), { mentions: [game.target] });
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(novaWrap("Hot Seat", [
        "HOT SEAT",
        "",
        prefix + "hotseat start @user (admin) - mulai sesi",
        prefix + "hotseat answer <jawaban> - jawab pertanyaan",
        prefix + "hotseat vote 👍/👎 - vote jawaban",
        prefix + "hotseat next (admin) - pertanyaan selanjutnya",
        prefix + "hotseat stop (admin) - hentikan",
        "",
        "3 pertanyaan: light, medium, deep!",
      ].join("\n")));
      return { handled: true };
    }
    await m.reply(novaWrap("Hot Seat Status", [
      "Target: @" + game.target.split("@")[0],
      "Pertanyaan: " + (game.currentQ + 1) + "/" + game.questions.length,
      "Jawaban diberikan: " + game.answers.length,
    ].join("\n")), { mentions: [game.target] });
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(novaWrap("Hot Seat", "Khusus admin/owner."));
      return { handled: true };
    }
    delConfig(db, gid);
    await m.reply(novaWrap("Hot Seat", "Sesi dihentikan."));
    return { handled: true };
  }

  await m.reply(novaWrap("Hot Seat", [
    "HOT SEAT",
    "",
    prefix + "hotseat start @user (admin) - mulai",
    prefix + "hotseat answer <jawaban> - jawab",
    prefix + "hotseat vote 👍/👎 - vote jawaban",
    prefix + "hotseat next (admin) - lanjut",
    prefix + "hotseat stop (admin) - hentikan",
    "",
    "3 pertanyaan acak, dari ringan sampai dalam!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
