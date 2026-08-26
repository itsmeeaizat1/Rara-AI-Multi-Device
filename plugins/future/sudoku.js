// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sudoku",
  alias: ["sudoku"],
  category: "future",
  description: "Sudoku harian - puzzle + leaderboard solver tercepat",
  usage: ".sudoku <command>",
  example: ".sudoku play",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

function generateSudoku(difficulty) {
  // Base solved grid
  const base = [];
  for (let r = 0; r < 9; r++) {
    base.push([]);
    for (let c = 0; c < 9; c++) {
      base[r].push(((r * 3 + Math.floor(r / 3) + c) % 9) + 1);
    }
  }
  // Shuffle rows within bands
  for (let band = 0; band < 3; band++) {
    const rows = [band * 3, band * 3 + 1, band * 3 + 2];
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[rows[i]], base[rows[j]]] = [base[rows[j]], base[rows[i]]];
    }
  }
  // Shuffle columns within stacks
  for (let stack = 0; stack < 3; stack++) {
    const cols = [stack * 3, stack * 3 + 1, stack * 3 + 2];
    for (let i = cols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      for (let r = 0; r < 9; r++) {
        [base[r][cols[i]], base[r][cols[j]]] = [base[r][cols[j]], base[r][cols[i]]];
      }
    }
  }
  // Remove cells based on difficulty
  const removeCount = { easy: 35, medium: 45, hard: 55 }[difficulty] || 40;
  const puzzle = base.map(row => [...row]);
  let removed = 0;
  while (removed < removeCount) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }
  return { puzzle, solution: base };
}

function formatGrid(grid) {
  let out = "";
  for (let r = 0; r < 9; r++) {
    if (r % 3 === 0 && r > 0) out += "───────┼───────┼──────\n";
    for (let c = 0; c < 9; c++) {
      if (c % 3 === 0 && c > 0) out += "│ ";
      out += (grid[r][c] === 0 ? "·" : grid[r][c]) + " ";
    }
    out += "\n";
  }
  return out;
}

function getConfig(db, gid) {
  const all = db.setting("sudoku") || {};
  if (!all[gid]) {
    all[gid] = { current: null, leaderboard: {}, dailyDate: "", solvedBy: null, solvedAt: 0 };
    db.setting("sudoku", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("sudoku") || {};
  all[gid] = data;
  db.setting("sudoku", all);
  db.save();
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "play" || sub === "main" || sub === "baru") {
    const difficulty = (args[2] || "medium").toLowerCase();
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      await m.reply(claraWrap("Sudoku", "Level: easy, medium, hard\nContoh: " + prefix + "sudoku play medium"));
      return { handled: true };
    }
    const gen = generateSudoku(difficulty);
    cfg.current = { puzzle: gen.puzzle, solution: gen.solution, difficulty, startedAt: Date.now(), solvedBy: null };
    cfg.dailyDate = todayDate();
    cfg.solvedBy = null;
    saveConfig(db, gid, cfg);

    await m.reply(claraWrap("Sudoku " + difficulty, [
      "Isi angka 1-9, tiap baris/kolom/box tidak boleh ada angka sama.",
      "Kosong (·) = isi kamu.",
      "",
      "```" + formatGrid(gen.puzzle) + "```",
      "",
      "Jawab: " + prefix + "sudoku answer <baris> <kolom> <angka>",
      "Contoh: " + prefix + "sudoku answer 1 3 7",
      "Cek: " + prefix + "sudoku check",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "answer" || sub === "isi") {
    if (!cfg.current) {
      await m.reply(claraWrap("Sudoku", "Belum ada puzzle. Ketik " + prefix + "sudoku play."));
      return { handled: true };
    }
    if (cfg.current.solvedBy) {
      await m.reply(claraWrap("Sudoku", "Sudoku sudah diselesaikan oleh @" + cfg.current.solvedBy.split("@")[0] + "!"), { mentions: [cfg.current.solvedBy] });
      return { handled: true };
    }
    const row = parseInt(args[2] || "0", 10) - 1;
    const col = parseInt(args[3] || "0", 10) - 1;
    const num = parseInt(args[4] || "0", 10);
    if (isNaN(row) || isNaN(col) || isNaN(num) || row < 0 || row > 8 || col < 0 || col > 8 || num < 1 || num > 9) {
      await m.reply(claraWrap("Sudoku", "Format: " + prefix + "sudoku answer <baris 1-9> <kolom 1-9> <angka 1-9>"));
      return { handled: true };
    }
    if (cfg.current.puzzle[row][col] !== 0) {
      await m.reply(claraWrap("Sudoku", "Posisi (" + (row + 1) + "," + (col + 1) + ") sudah terisi."));
      return { handled: true };
    }
    if (num !== cfg.current.solution[row][col]) {
      await m.react("❌");
      await m.reply(claraWrap("Sudoku", "Salah! Angka untuk (" + (row + 1) + "," + (col + 1) + ") bukan " + num + "."));
      return { handled: true };
    }
    cfg.current.puzzle[row][col] = num;
    saveConfig(db, gid, cfg);
    await m.react("🐣");

    // Check if solved
    let solved = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cfg.current.puzzle[r][c] !== cfg.current.solution[r][c]) { solved = false; break; }
      }
      if (!solved) break;
    }
    if (solved) {
      const time = Math.floor((Date.now() - cfg.current.startedAt) / 1000);
      cfg.current.solvedBy = m.sender;
      cfg.solvedBy = m.sender;
      cfg.solvedAt = Date.now();
      if (!cfg.leaderboard[m.sender]) cfg.leaderboard[m.sender] = { wins: 0, bestTime: Infinity };
      cfg.leaderboard[m.sender].wins++;
      if (time < cfg.leaderboard[m.sender].bestTime) cfg.leaderboard[m.sender].bestTime = time;
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("Sudoku SELESAI!", [
        "Solver: @" + m.sender.split("@")[0],
        "Waktu: " + Math.floor(time / 60) + "m " + (time % 60) + "s",
        "Total menang: " + cfg.leaderboard[m.sender].wins,
      ].join("\n")), { mentions: [m.sender] });
    } else {
      const remaining = cfg.current.puzzle.flat().filter(v => v === 0).length;
      await m.reply(claraWrap("Sudoku", "Benar! Sisa: " + remaining + " kotak kosong."));
    }
    return { handled: true };
  }

  if (sub === "check" || sub === "cek") {
    if (!cfg.current) {
      await m.reply(claraWrap("Sudoku", "Belum ada puzzle."));
      return { handled: true };
    }
    await m.reply(claraWrap("Sudoku " + cfg.current.difficulty, "```" + formatGrid(cfg.current.puzzle) + "```"));
    return { handled: true };
  }

  if (sub === "leaderboard" || sub === "top") {
    const sorted = Object.entries(cfg.leaderboard).sort((a, b) => a[1].bestTime - b[1].bestTime).slice(0, 5);
    const list = sorted.map(([jid, data], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + data.wins + " win, " + Math.floor(data.bestTime / 60) + "m" + (data.bestTime % 60) + "s").join("\n") || "(kosong)";
    await m.reply(claraWrap("Sudoku Leaderboard", [
      "Solver tercepat:",
      list,
    ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "hint" || sub === "bantuan") {
    if (!cfg.current) {
      await m.reply(claraWrap("Sudoku", "Belum ada puzzle."));
      return { handled: true };
    }
    if (cfg.current.solvedBy) {
      await m.reply(claraWrap("Sudoku", "Sudah selesai."));
      return { handled: true };
    }
    // Find an empty cell and reveal answer
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cfg.current.puzzle[r][c] === 0) {
          cfg.current.puzzle[r][c] = cfg.current.solution[r][c];
          saveConfig(db, gid, cfg);
          await m.reply(claraWrap("Sudoku Hint", "Baris " + (r + 1) + ", Kolom " + (c + 1) + " = " + cfg.current.solution[r][c]));
          return { handled: true };
        }
      }
    }
    await m.reply(claraWrap("Sudoku", "Tidak ada kotak kosong."));
    return { handled: true };
  }

  await m.reply(claraWrap("Sudoku", [
    "SUDOKU HARIAN",
    "",
    prefix + "sudoku play [easy/medium/hard]",
    prefix + "sudoku answer <baris> <kolom> <angka>",
    prefix + "sudoku check - lihat grid",
    prefix + "sudoku hint - reveal 1 jawaban",
    prefix + "sudoku leaderboard - top solver",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
