// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "karaoke",
  alias: ["karaoke"],
  category: "future",
  description: "Karaoke mode grup - lirik dibagi per baris, bergantian",
  usage: ".karaoke <command>",
  example: ".karaoke start diam diam rindu",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const LYRICS_DB = [
  {
    title: "Diam Diam Rindu",
    artist: "SManiak",
    lines: [
      "Diam diam aku rindu kamu",
      "Diam diam ingin peluk kamu",
      "Diam diam ku menunggu waktu",
      "Diam diam ku ingin bersamamu",
      "Reff: Oh sayangku, datanglah padaku",
      "Reff: Ku ingin slalu di sisimu",
      "Reff: Diam diam rindu ini abadi",
      "Reff: Diam diam ku cinta padamu",
    ],
  },
  {
    title: "Tetap Dalam Jiwa",
    artist: "Judika",
    lines: [
      "Ku tetap dalam jiwa",
      "Kisah kita berdua",
      "Ku selalu menjagamu",
      "Ku selalu mencintaimu",
      "Reff: Tak akan pernah hilang",
      "Reff: Kenangan indah bersamamu",
      "Reff: Ku tetap dalam jiwa",
      "Reff: Selamanya di hatiku",
    ],
  },
  {
    title: "Buku Ini",
    artist: "Yura Yunita",
    lines: [
      "Buku ini terbuka di halaman pertama",
      "Cerita kita berawal dari sini",
      "Kita tulis bersama kata cinta",
      "Halaman demi halaman kita isi",
      "Reff: Dan bila nanti ku tak lagi di sini",
      "Reff: Buku ini tetap akan jadi kenangan",
      "Reff: Tentang kita berdua",
      "Reff: Yang pernah saling mencintai",
    ],
  },
];

function getConfig(db, gid) {
  const all = db.setting("karaoke") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("karaoke") || {};
  all[gid] = data;
  db.setting("karaoke", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("karaoke") || {};
  delete all[gid];
  db.setting("karaoke", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "start" || sub === "mulai") {
    if (game && game.status === "active") {
      await m.reply(claraWrap("Karaoke", "Game masih aktif. Ketik " + prefix + "karaoke stop."));
      return { handled: true };
    }
    const query = args.slice(2).join(" ").trim().toLowerCase();
    const song = LYRICS_DB.find(s => s.title.toLowerCase().includes(query)) || LYRICS_DB[0];
    const data = {
      status: "active",
      song,
      currentLine: 0,
      currentTurn: null,
      scores: {},
      startedAt: Date.now(),
      history: [],
    };
    saveConfig(db, gid, data);
    await m.reply(claraWrap("Karaoke", [
      "KARAOKE DIMULAI!",
      "Lagu: " + song.title + " - " + song.artist,
      "",
      "Aturan: 1 baris per orang, gantian.",
      "Ketik " + prefix + "karaoke next untuk ambil giliran.",
      "Ketik " + prefix + "karaoke sing <baris lirik> untuk nyanyi.",
      "",
      "Baris 1/" + song.lines.length + ":",
      "??? (ketik " + prefix + "karaoke next untuk mulai)",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "next" || sub === "giliran") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Karaoke", "Belum ada game. Ketik " + prefix + "karaoke start."));
      return { handled: true };
    }
    if (game.currentTurn && game.currentTurn !== m.sender) {
      await m.reply(claraWrap("Karaoke", "Bukan giliranmu! Giliran @" + game.currentTurn.split("@")[0] + "."), { mentions: [game.currentTurn] });
      return { handled: true };
    }
    game.currentTurn = m.sender;
    const line = game.song.lines[game.currentLine];
    await m.reply(claraWrap("Karaoke", [
      "Giliran @" + m.sender.split("@")[0] + "!",
      "Baris " + (game.currentLine + 1) + "/" + game.song.lines.length,
      "",
      "Lirik: " + line,
      "",
      "Ketik: " + prefix + "karaoke sing untuk konfirmasi",
    ].join("\n")), { mentions: [m.sender] });
    saveConfig(db, gid, game);
    return { handled: true };
  }

  if (sub === "sing" || sub === "nyanyi") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Karaoke", "Belum ada game."));
      return { handled: true };
    }
    if (game.currentTurn !== m.sender) {
      await m.reply(claraWrap("Karaoke", "Bukan giliranmu! Ketik " + prefix + "karaoke next."));
      return { handled: true };
    }
    const userLine = args.slice(2).join(" ").trim().toLowerCase();
    const targetLine = game.song.lines[game.currentLine].toLowerCase();
    if (!userLine) {
      // Auto-accept (just sing the line)
      if (!game.scores[m.sender]) game.scores[m.sender] = 0;
      game.scores[m.sender]++;
      game.history.push({ user: m.sender, line: game.currentLine + 1 });
      game.currentLine++;
      game.currentTurn = null;
      saveConfig(db, gid, game);

      if (game.currentLine >= game.song.lines.length) {
        game.status = "completed";
        saveConfig(db, gid, game);
        const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
        const list = sorted.map(([jid, score], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + score + " baris").join("\n");
        await m.reply(claraWrap("Karaoke Selesai!", [
          "Lagu: " + game.song.title,
          "Total baris: " + game.song.lines.length,
          "",
          "Skor:",
          list,
        ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
        delConfig(db, gid);
      } else {
        await m.reply(claraWrap("Karaoke", "Lirik diterima! +1 poin\nBaris " + (game.currentLine + 1) + " siap.\nKetik " + prefix + "karaoke next untuk ambil giliran."));
      }
      return { handled: true };
    }
    // Check accuracy
    const similarity = calcSimilarity(userLine, targetLine);
    const points = similarity > 0.7 ? 2 : similarity > 0.4 ? 1 : 0;
    if (!game.scores[m.sender]) game.scores[m.sender] = 0;
    game.scores[m.sender] += points;
    game.currentLine++;
    game.currentTurn = null;
    saveConfig(db, gid, game);

    if (game.currentLine >= game.song.lines.length) {
      game.status = "completed";
      saveConfig(db, gid, game);
      const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
      const list = sorted.map(([jid, score], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + score + " poin").join("\n");
      await m.reply(claraWrap("Karaoke Selesai!", [
        "Lagu: " + game.song.title,
        "Akurasi kamu: " + Math.floor(similarity * 100) + "%",
        "Skor:",
        list,
      ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
      delConfig(db, gid);
    } else {
      await m.reply(claraWrap("Karaoke", "Akurasi: " + Math.floor(similarity * 100) + "% | +" + points + " poin\nBaris " + (game.currentLine + 1) + " siap.\nKetik " + prefix + "karaoke next."));
    }
    return { handled: true };
  }

  if (sub === "skip" || sub === "lewat") {
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Karaoke", "Belum ada game."));
      return { handled: true };
    }
    game.currentLine++;
    game.currentTurn = null;
    saveConfig(db, gid, game);
    if (game.currentLine >= game.song.lines.length) {
      game.status = "completed";
      saveConfig(db, gid, game);
      await m.reply(claraWrap("Karaoke", "Skipped. Lagu selesai."));
      delConfig(db, gid);
    } else {
      await m.reply(claraWrap("Karaoke", "Baris dilewati. Baris " + (game.currentLine + 1) + " siap.\nKetik " + prefix + "karaoke next."));
    }
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Karaoke", "Khusus admin/owner."));
      return { handled: true };
    }
    delConfig(db, gid);
    await m.reply(claraWrap("Karaoke", "Game dibatalkan."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(claraWrap("Karaoke", "Belum ada game.\n" + prefix + "karaoke start [judul lagu]\nLagu: " + LYRICS_DB.map(s => s.title).join(", ")));
      return { handled: true };
    }
    await m.reply(claraWrap("Karaoke", [
      "Lagu: " + game.song.title,
      "Baris: " + (game.currentLine + 1) + "/" + game.song.lines.length,
      "Status: " + game.status,
      "Giliran: " + (game.currentTurn ? "@" + game.currentTurn.split("@")[0] : "kosong"),
    ].join("\n")), { mentions: game.currentTurn ? [game.currentTurn] : [] });
    return { handled: true };
  }

  await m.reply(claraWrap("Karaoke", [
    "KARAOKE MODE",
    "",
    prefix + "karaoke start [judul] - mulai",
    prefix + "karaoke next - ambil giliran",
    prefix + "karaoke sing [lirik] - nyanyi",
    prefix + "karaoke skip - lewati baris",
    prefix + "karaoke stop (admin) - batalkan",
    prefix + "karaoke status - cek progress",
    "",
    "Lagu: " + LYRICS_DB.map(s => s.title).join(", "),
  ].join("\n")));
  return { handled: true };
}

function calcSimilarity(a, b) {
  const wordsA = a.split(/\s+/).filter(w => w.length > 1);
  const wordsB = b.split(/\s+/).filter(w => w.length > 1);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length / Math.max(wordsA.length, wordsB.length);
}

export { pluginConfig as config, handler };
