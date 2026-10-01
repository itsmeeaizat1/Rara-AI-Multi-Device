// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "escape",
  alias: ["escape"],
  category: "smart",
  description: "Escape room text adventure - pecahkan teka-teki untuk keluar",
  usage: ".escape <command>",
  example: ".escape start",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const MAX_HINTS = 3;
const TIMER_SECONDS = 300;

function getConfig(db, gid) {
  const all = db.setting("escape") || {};
  return all[gid] || null;
}

function saveConfig(db, gid, data) {
  const all = db.setting("escape") || {};
  all[gid] = data;
  db.setting("escape", all);
  db.save();
}

function delConfig(db, gid) {
  const all = db.setting("escape") || {};
  delete all[gid];
  db.setting("escape", all);
  db.save();
}

const PUZZLES = [
  { id: 1, q: "Aku punya 4 sisi tapi bukan persegi. Setiap sisi berbeda. Apa aku?", a: "segitiga piramida segiempat jajaran genjang belah ketupat", hint: "Bentuk 2D dengan 4 sisi tidak sama" },
  { id: 2, q: "Semakin kamu ambil, semakin saya tinggal. Apa saya?", a: "langkah jejak foto footprint", hint: "Pikir sesuatu yang kamu tinggalkan" },
  { id: 3, q: "Aku ada depan kamu tapi kamu tidak bisa lihat aku. Apa aku?", a: "masa depan future udara", hint: "Yang akan datang tapi belum terlihat" },
  { id: 4, q: "Aku penuh kunci tapi tidak bisa buka pintu. Apa aku?", a: "keyboard piano papan ketik", hint: "Alat mengetik atau musik" },
  { id: 5, q: "Aku naik tapi tidak pernah turun. Apa aku?", a: "umur usia age", hint: "Tiap tahun bertambah" },
  { id: 6, q: "Aku ringan seperti bulu, tapi tidak ada yang bisa menahanku lama. Apa aku?", a: "napas nafas breath", hint: "Bernapas" },
  { id: 7, q: "Aku punya tangan tapi tidak bisa bertepuk. Apa aku?", a: "jam clock arloji pohon", hint: "Penunjuk waktu atau alam" },
  { id: 8, q: "Hilang di gelap, muncul di terang. Di cekurukan aku jadi pelangi. Apa aku?", a: "cahaya terang lampu light", hint: "Sumber penerangan" },
];

function checkAnswer(userInput, answer) {
  const input = userInput.toLowerCase().trim();
  return answer.toLowerCase().split(" ").some(a => input.includes(a));
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const game = getConfig(db, gid);

  if (sub === "start" || sub === "mulai") {
    if (game && game.status === "active") {
      await m.reply(raraWrap("Escape Room", "Game masih aktif. Ketik " + prefix + "escape stop."));
      return { handled: true };
    }
    // Pick 3 random puzzles
    const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, 3);
    const data = {
      status: "active",
      puzzles: shuffled.map(p => ({ ...p, solved: false })),
      current: 0,
      hintsLeft: MAX_HINTS,
      startedAt: Date.now(),
      hintUsed: 0,
      players: {},
    };
    saveConfig(db, gid, data);
    await m.reply(raraWrap("Escape Room", [
      "GAME DIMULAI!",
      "",
      "Kamu terjebak di ruangan misterius.",
      "Pecahkan " + shuffled.length + " teka-teki untuk keluar!",
      "",
      "Teka-teki 1/" + shuffled.length + ":",
      shuffled[0].q,
      "",
      "Jawab: " + prefix + "escape answer <jawaban>",
      "Hint: " + prefix + "escape hint (sisa " + MAX_HINTS + ")",
      "Stop: " + prefix + "escape stop",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "answer" || sub === "jawab") {
    if (!game || game.status !== "active") {
      await m.reply(raraWrap("Escape Room", "Belum ada game. Ketik " + prefix + "escape start."));
      return { handled: true };
    }
    const answer = args.slice(2).join(" ").trim();
    if (!answer) {
      await m.reply(raraWrap("Escape Room", "Ketik jawaban: " + prefix + "escape answer <jawaban>"));
      return { handled: true };
    }
    const puzzle = game.puzzles[game.current];
    if (checkAnswer(answer, puzzle.a)) {
      puzzle.solved = true;
      if (!game.players[m.sender]) game.players[m.sender] = 0;
      game.players[m.sender]++;
      if (game.current + 1 >= game.puzzles.length) {
        // Game complete
        const time = Math.floor((Date.now() - game.startedAt) / 1000);
        game.status = "completed";
        saveConfig(db, gid, game);
        const topPlayers = Object.entries(game.players).sort((a, b) => b[1] - a[1]).map(([jid, count], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + count + " solved").join("\n");
        await m.reply(raraWrap("Escape Room - SELESAI!", [
          "Kamu berhasil keluar dari ruangan!",
          "Waktu: " + Math.floor(time / 60) + "m " + (time % 60) + "s",
          "Hints used: " + game.hintUsed + "/" + MAX_HINTS,
          "",
          "Contributors:",
          topPlayers,
        ].join("\n")), { mentions: Object.keys(game.players) });
        delConfig(db, gid);
      } else {
        game.current++;
        saveConfig(db, gid, game);
        const next = game.puzzles[game.current];
        await m.reply(raraWrap("Escape Room", [
          "Teka-teki " + (game.current) + " SELESAI!",
          "",
          "Teka-teki " + (game.current + 1) + "/" + game.puzzles.length + ":",
          next.q,
          "",
          "Jawab: " + prefix + "escape answer <jawaban>",
          "Hint: " + prefix + "escape hint (sisa " + game.hintsLeft + ")",
        ].join("\n")));
      }
    } else {
      await m.reply(raraWrap("Escape Room", "Salah! Coba lagi.\nTeka-teki " + (game.current + 1) + ": " + puzzle.q));
    }
    saveConfig(db, gid, game);
    return { handled: true };
  }

  if (sub === "hint") {
    if (!game || game.status !== "active") {
      await m.reply(raraWrap("Escape Room", "Belum ada game."));
      return { handled: true };
    }
    if (game.hintsLeft <= 0) {
      await m.reply(raraWrap("Escape Room", "Hint habis!"));
      return { handled: true };
    }
    game.hintsLeft--;
    game.hintUsed++;
    saveConfig(db, gid, game);
    const puzzle = game.puzzles[game.current];
    await m.reply(raraWrap("Escape Room Hint", "Hint (" + game.hintsLeft + " tersisa):\n" + puzzle.hint));
    return { handled: true };
  }

  if (sub === "stop" || sub === "batal") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(raraWrap("Escape Room", "Khusus admin/owner."));
      return { handled: true };
    }
    delConfig(db, gid);
    await m.reply(raraWrap("Escape Room", "Game dibatalkan."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    if (!game) {
      await m.reply(raraWrap("Escape Room", "Belum ada game.\n\n" + prefix + "escape start - mulai game"));
      return { handled: true };
    }
    if (game.status !== "active") {
      await m.reply(raraWrap("Escape Room", "Game selesai."));
      return { handled: true };
    }
    const time = Math.floor((Date.now() - game.startedAt) / 1000);
    const puzzle = game.puzzles[game.current];
    await m.reply(raraWrap("Escape Room", [
      "Status: " + game.status,
      "Teka-teki: " + (game.current + 1) + "/" + game.puzzles.length,
      "Hints tersisa: " + game.hintsLeft,
      "Waktu: " + Math.floor(time / 60) + "m " + (time % 60) + "s",
      "",
      "Teka-teki saat ini:",
      puzzle.q,
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(raraWrap("Escape Room", [
    "ESCAPE ROOM TEXT ADVENTURE",
    "",
    prefix + "escape start - mulai game",
    prefix + "escape answer <jawaban> - jawab teka-teki",
    prefix + "escape hint - minta hint (max " + MAX_HINTS + ")",
    prefix + "escape status - cek progress",
    prefix + "escape stop (admin) - batalkan",
    "",
    "3 teka-teki, kerja sama selesaikan semua!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
