// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wordchain",
  alias: ["wordchain", "sambungkata", "kataberantai"],
  category: "future",
  description: "Word chain - sambung kata, huruf akhir jadi huruf awal",
  usage: ".wordchain <command>",
  example: ".wordchain start",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const WORDS = [
  "makan", "nasi", "ikan", "kucing", "gajah", "harimau", "ular", "ular", "ramai",
  "indah", "hutan", "negeri", "rimba", "batu", "ular", "lebah", "harimau", "matahari",
  "halilintar", "rantai", "ikan", "nelayan", "negeri", "impian", "nanti", "tikus",
  "sate", "ember", "bakar", "roti", "tinta", "angin", "negeri", "bintang", "guru",
  "rumah", "hutan", "nasi", "indah", "hadi", "ikan", "nasional", "laut", "tikus",
];

function getLastChar(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  return clean[clean.length - 1] || "";
}

function getFirstChar(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  return clean[0] || "";
}

function isValidWord(word) {
  return word && /^[a-zA-Z]+$/.test(word.trim()) && word.trim().length >= 2;
}

function isWordKnown(word) {
  return WORDS.includes(word.toLowerCase());
}

function getConfig(db, gid) {
  const all = db.setting("wordchain") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("wordchain") || {};
  all[gid] = data;
  db.setting("wordchain", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("wordchain") || {};
  delete all[gid];
  db.setting("wordchain", all);
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
      await m.reply(claraWrap("Word Chain", "Game masih aktif. Ketik " + prefix + "wordchain stop."));
      return { handled: true };
    }
    const startWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    const data = {
      status: "active",
      lastWord: startWord,
      lastUser: null,
      chain: [startWord],
      scores: {},
      startedAt: Date.now(),
      turnCount: 0,
    };
    saveConfig(db, gid, data);
    await m.reply(claraWrap("Word Chain", [
      "GAME DIMULAI!",
      "",
      "Kata pertama: " + startWord,
      "Huruf lanjutan: " + getLastChar(startWord).toUpperCase(),
      "",
      "Ketik kata berikutnya: " + prefix + "wordchain <kata>",
      "Kata harus mulai dari huruf: " + getLastChar(startWord).toUpperCase(),
      "",
      "Aturan: kata tidak boleh berulang!",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "play" || sub === "jawab" || sub === "lanjut") {
    const word = args.slice(2).join(" ").trim().toLowerCase();
    if (!game || game.status !== "active") {
      await m.reply(claraWrap("Word Chain", "Belum ada game. Ketik " + prefix + "wordchain start."));
      return { handled: true };
    }
    if (!word) {
      await m.reply(claraWrap("Word Chain", "Ketik kata: " + prefix + "wordchain play <kata>"));
      return { handled: true };
    }
    if (!isValidWord(word)) {
      await m.reply(claraWrap("Word Chain", "Kata tidak valid! Hanya huruf, min 2 karakter."));
      return { handled: true };
    }
    if (game.lastUser === m.sender) {
      await m.reply(claraWrap("Word Chain", "Tunggu orang lain jawab dulu! Tidak boleh gantian diri sendiri."));
      return { handled: true };
    }
    const expected = getLastChar(game.lastWord);
    const actual = getFirstChar(word);
    if (actual !== expected) {
      await m.react("❌");
      await m.reply(claraWrap("Word Chain", "Salah! Kata harus mulai dari huruf " + expected.toUpperCase() + "\nKata kamu: " + word + " (mulai dari " + actual.toUpperCase() + ")"));
      return { handled: true };
    }
    if (game.chain.includes(word)) {
      await m.react("❌");
      await m.reply(claraWrap("Word Chain", "Kata \"" + word + "\" sudah dipakai sebelumnya! Carikan kata lain."));
      return { handled: true };
    }
    game.chain.push(word);
    game.lastWord = word;
    game.lastUser = m.sender;
    game.turnCount++;
    if (!game.scores[m.sender]) game.scores[m.sender] = 0;
    game.scores[m.sender]++;
    saveConfig(db, gid, game);
    await m.react("🐣");

    const nextChar = getLastChar(word).toUpperCase();
    await m.reply(claraWrap("Word Chain", [
      "Benar! +" + 1 + " poin",
      "@" + m.sender.split("@")[0] + ": " + word,
      "Chain: " + game.chain.length + " kata",
      "",
      "Giliran: kata selanjutnya mulai dari " + nextChar,
    ].join("\n")), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "scores" || sub === "skor") {
    if (!game) {
      await m.reply(claraWrap("Word Chain", "Belum ada game."));
      return { handled: true };
    }
    const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    const list = sorted.map(([jid, score], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + score + " poin").join("\n") || "(kosong)";
    await m.reply(claraWrap("Word Chain Scores", "Chain: " + game.chain.length + " kata\n\n" + list), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "history" || sub === "riwayat") {
    if (!game) {
      await m.reply(claraWrap("Word Chain", "Belum ada game."));
      return { handled: true };
    }
    const recent = game.chain.slice(-10);
    const list = recent.map((w, i) => (game.chain.length - recent.length + i + 1) + ". " + w).join("\n");
    await m.reply(claraWrap("Word Chain History", "Kata terakhir (" + game.chain.length + " total):\n" + list));
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(claraWrap("Word Chain", "Khusus admin/owner."));
      return { handled: true };
    }
    if (!game) {
      await m.reply(claraWrap("Word Chain", "Belum ada game."));
      return { handled: true };
    }
    const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0] ? "@" + sorted[0][0].split("@")[0] : "-";
    const list = sorted.map(([jid, score], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + score).join("\n") || "(kosong)";
    await m.reply(claraWrap("Word Chain Selesai", [
      "Chain terpanjang: " + game.chain.length + " kata",
      "Pemenang: " + winner,
      "",
      "Skor akhir:",
      list,
    ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
    delConfig(db, gid);
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(claraWrap("Word Chain", "Belum ada game.\n" + prefix + "wordchain start untuk mulai."));
      return { handled: true };
    }
    await m.reply(claraWrap("Word Chain", [
      "Status: " + game.status,
      "Kata terakhir: " + game.lastWord,
      "Huruf lanjutan: " + getLastChar(game.lastWord).toUpperCase(),
      "Chain: " + game.chain.length + " kata",
      "Giliran terakhir: " + (game.lastUser ? "@" + game.lastUser.split("@")[0] : "-"),
    ].join("\n")), { mentions: game.lastUser ? [game.lastUser] : [] });
    return { handled: true };
  }

  await m.reply(claraWrap("Word Chain", [
    "WORD CHAIN - SAMBUNG KATA",
    "",
    prefix + "wordchain start - mulai game",
    prefix + "wordchain play <kata> - jawab",
    prefix + "wordchain scores - lihat skor",
    prefix + "wordchain history - kata terakhir",
    prefix + "wordchain stop (admin) - akhiri game",
    prefix + "wordchain status - cek progress",
    "",
    "Aturan: huruf akhir = huruf awal kata berikutnya",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
