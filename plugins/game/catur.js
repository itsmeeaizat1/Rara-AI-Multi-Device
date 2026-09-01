// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Catur — Multiplayer Chess System (28 sub-commands)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import fs from "fs";
import path from "path";

const pluginConfig = {
  name: "catur",
  alias: ["catur"],
  aliases: ["catur","caturterima","caturtolak","caturpapan","caturlangkah","caturmenyerah","caturselesai","caturhelp","caturrank","caturstatus","caturnilai","caturlawan","caturgiliran","caturrematch","caturafk","caturwaktu","caturreset","caturskip","caturdraw","caturhapus","caturnext","caturboard","caturtimer","caturhistory","caturskorreset","caturanalisa","caturtop10","caturnotif"],
  category: "game",
  description: "Sistem catur multiplayer lengkap (tantang, main, skor, rank)",
  usage: ".catur @tag | .caturlangkah e2 e4 | .caturhelp",
  example: ".catur @user",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 1, isEnabled: true,
};

// ═══ DB HELPERS ═══
const DB_DIR = path.join(process.cwd(), "database");
const CATUR_FILE = path.join(DB_DIR, "catur.json");
const SKOR_FILE = path.join(DB_DIR, "caturSkor.json");

function loadCatur() {
  try { return JSON.parse(fs.readFileSync(CATUR_FILE, "utf-8")); } catch { return {}; }
}
function saveCaturData(data) {
  try { if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true }); fs.writeFileSync(CATUR_FILE, JSON.stringify(data, null, 2)); } catch {}
}
function loadSkor() {
  try { return JSON.parse(fs.readFileSync(SKOR_FILE, "utf-8")); } catch { return {}; }
}
function saveSkor(data) {
  try { if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true }); fs.writeFileSync(SKOR_FILE, JSON.stringify(data, null, 2)); } catch {}
}

// ═══ BOARD HELPERS ═══
function papanAwal() {
  return [
    ["♜","♞","♝","♛","♚","♝","♞","♜"],
    ["♟","♟","♟","♟","♟","♟","♟","♟"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["♙","♙","♙","♙","♙","♙","♙","♙"],
    ["♖","♘","♗","♕","♔","♗","♘","♖"],
  ];
}
function tampilkanPapan(board) {
  let str = "";
  for (let row = 0; row < 8; row++) {
    str += (8 - row) + " ";
    for (let col = 0; col < 8; col++) str += board[row][col] || "⬛";
    str += "\n";
  }
  str += "  A B C D E F G H";
  return str;
}
const COLS = { a:0,b:1,c:2,d:3,e:4,f:5,g:6,h:7 };
const WHITE_PIECES = "♙♖♘♗♕♔";
const BLACK_PIECES = "♟♜♞♝♛♚";

// Timers per chat
const timers = {};

async function handler(m, { sock, text, command, isOwner, isAdmins }) {
  try {
    const caturData = loadCatur();
    const skorData = loadSkor();
    const sender = m.sender;
    const chatId = m.chat;

    // ═══ CATUR (tantang) ═══
    if (command === "catur") {
      const mentioned = m.mentionedJid || [];
      if (mentioned.length === 0) return m.reply(claraWrap("catur", "Tag pengguna untuk ditantang!\nContoh: .catur @user", "guide"));
      const lawan = mentioned[0];
      if (lawan === sender) return m.reply(claraWrap("catur", "Kamu tidak bisa menantang dirimu sendiri.", "info"));
      if (caturData[chatId]) return m.reply(claraWrap("catur", "Masih ada game di chat ini.", "info"));
      caturData[chatId] = { player1: sender, player2: lawan, turn: "white", board: papanAwal(), status: "pending", winner: null, history: [] };
      saveCaturData(caturData);
      return m.reply("╭─「 ✦ ᴄᴀᴛᴜʀ ✦ 」\n│ ♟️ Tantangan dikirim ke @" + lawan.split("@")[0] + "!\n│\n│ 📌 Balas dengan .caturterima untuk main\n│ 📌 .caturhelp untuk panduan\n╰────  •  ────", { mentions: [lawan] });
    }

    // ═══ CATURTERIMA ═══
    if (command === "caturterima") {
      const game = caturData[chatId];
      if (!game || game.status !== "pending") return m.reply(claraWrap("caturterima", "Tidak ada tantangan aktif.", "info"));
      if (game.player2 !== sender) return m.reply(claraWrap("caturterima", "Kamu bukan yang ditantang.", "info"));
      game.status = "ongoing";
      saveCaturData(caturData);
      return m.reply("╭─「 ✦ ᴄᴀᴛᴜʀ ✦ 」\n│ ♟️ Game dimulai!\n│ Giliran: *Putih* (" + (game.player1 === sender ? "Kamu" : "@" + game.player1.split("@")[0]) + ")\n│\n│ " + tampilkanPapan(game.board).replace(/\n/g, "\n│ ") + "\n╰────  •  ────", { mentions: [game.player1, game.player2] });
    }

    // ═══ CATURTOLAK ═══
    if (command === "caturtolak") {
      const game = caturData[chatId];
      if (!game || game.status !== "pending") return m.reply(claraWrap("caturtolak", "Tidak ada tantangan aktif.", "info"));
      if (game.player2 !== sender) return m.reply(claraWrap("caturtolak", "Kamu bukan yang ditantang.", "info"));
      delete caturData[chatId]; saveCaturData(caturData);
      return m.reply("╭─「 ✦ ᴄᴀᴛᴜʀ ✦ 」\n│ ❌ Tantangan ditolak.\n╰────  •  ────");
    }

    // ═══ CATURPAPAN ═══
    if (command === "caturpapan" || command === "caturboard") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturpapan", "Tidak ada game berjalan.", "info"));
      return m.reply("╭─「 ✦ ᴄᴀᴛᴜʀ ✦ 」\n│ ♟️ Papan saat ini:\n│\n│ " + tampilkanPapan(game.board).replace(/\n/g, "\n│ ") + "\n│\n│ Giliran: *" + (game.turn === "white" ? "Putih" : "Hitam") + "*\n╰────  •  ────");
    }

    // ═══ CATURLANGKAH ═══
    if (command === "caturlangkah") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturlangkah", "Tidak ada game berjalan.", "info"));
      const [fromRaw, toRaw] = (text || "").trim().split(" ");
      if (!fromRaw || !toRaw) return m.reply(claraWrap("caturlangkah", "Gunakan: .caturlangkah e2 e4", "guide"));
      const from = fromRaw.toLowerCase(), to = toRaw.toLowerCase();
      const fx = 8 - parseInt(from[1]), fy = COLS[from[0]];
      const tx = 8 - parseInt(to[1]), ty = COLS[to[0]];
      if (fx === undefined || fy === undefined || tx === undefined || ty === undefined || isNaN(fx) || isNaN(tx)) return m.reply(claraWrap("caturlangkah", "Posisi tidak valid.", "info"));
      const isWhite = game.turn === "white";
      const currentPlayer = isWhite ? game.player1 : game.player2;
      if (sender !== currentPlayer) return m.reply(claraWrap("caturlangkah", "Bukan giliranmu.", "info"));
      const piece = game.board[fx][fy];
      if (!piece) return m.reply(claraWrap("caturlangkah", "Tidak ada bidak di posisi itu.", "info"));
      if (isWhite && !WHITE_PIECES.includes(piece)) return m.reply(claraWrap("caturlangkah", "Itu bukan bidakmu.", "info"));
      if (!isWhite && !BLACK_PIECES.includes(piece)) return m.reply(claraWrap("caturlangkah", "Itu bukan bidakmu.", "info"));
      game.board[tx][ty] = piece; game.board[fx][fy] = "";
      game.turn = isWhite ? "black" : "white";
      game.history.push(from + "-" + to);
      saveCaturData(caturData);
      return m.reply("╭─「 ✦ ᴄᴀᴛᴜʀ ✦ 」\n│ ✅ Langkah berhasil!\n│\n│ " + tampilkanPapan(game.board).replace(/\n/g, "\n│ ") + "\n│\n│ Giliran: *" + (game.turn === "white" ? "Putih" : "Hitam") + "*\n╰────  •  ────");
    }

    // ═══ CATURMENYERAH ═══
    if (command === "caturmenyerah") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturmenyerah", "Tidak ada game berjalan.", "info"));
      if (sender !== game.player1 && sender !== game.player2) return m.reply(claraWrap("caturmenyerah", "Kamu bukan pemain di game ini.", "info"));
      const pemenang = sender === game.player1 ? game.player2 : game.player1;
      game.status = "selesai"; game.winner = pemenang;
      skorData[pemenang] = skorData[pemenang] || { menang: 0, kalah: 0, seri: 0 };
      skorData[sender] = skorData[sender] || { menang: 0, kalah: 0, seri: 0 };
      skorData[pemenang].menang++; skorData[sender].kalah++;
      saveCaturData(caturData); saveSkor(skorData);
      return m.reply("╭─「 ✦ ᴄᴀᴛᴜʀ ✦ 」\n│ 🏳️ Pemain menyerah.\n│ 🏆 Pemenang: @" + pemenang.split("@")[0] + "\n╰────  •  ────", { mentions: [pemenang] });
    }

    // ═══ CATURSELESAI ═══
    if (command === "caturselesai") {
      if (!isOwner) return m.reply(claraWrap("caturselesai", "Hanya owner yang bisa paksa selesai.", "info"));
      if (caturData[chatId]) { delete caturData[chatId]; saveCaturData(caturData); return m.reply("✅ Game dipaksa selesai."); }
      return m.reply("Tidak ada game aktif.");
    }

    // ═══ CATURHELP ═══
    if (command === "caturhelp") {
      let t = "╭─「 ✦ ᴘᴀɴᴅᴜᴀɴ ᴄᴀᴛᴜʀ ✦ 」\n";
      t += "│ ♟️ Bermain catur langsung di grup!\n│\n";
      t += "│ 🎮 Memulai:\n│ ➤ .catur @tag — Tantang pemain\n│ ➤ .caturterima — Terima tantangan\n│ ➤ .caturtolak — Tolak tantangan\n│\n";
      t += "│ ⚙️ Kontrol:\n│ ➤ .caturlangkah e2 e4 — Pindah bidak\n│ ➤ .caturpapan — Lihat papan\n│ ➤ .caturmenyerah — Menyerah\n│ ➤ .caturdraw — Ajukan seri\n│ ➤ .caturskip — Lewati giliran\n│\n";
      t += "│ 📊 Skor:\n│ ➤ .caturnilai — Skormu\n│ ➤ .caturrank — Ranking\n│ ➤ .caturtop10 — Top 10\n│ ➤ .caturskorreset — Reset skor (owner)\n│\n";
      t += "│ ♟️ Info:\n│ ➤ .caturstatus — Status game\n│ ➤ .caturgiliran — Siapa giliran\n│ ➤ .caturhistory — Riwayat langkah\n│ ➤ .caturanalisa — Langkah terakhir\n│ ➤ .caturlawan — Lihat lawan\n│\n";
      t += "│ ⏱️ Timer:\n│ ➤ .caturtimer — Timer giliran (3 min)\n│ ➤ .caturnotif — Notif AFK\n│ ➤ .caturafk — Batal karena AFK\n│\n";
      t += "│ 📌 Lainnya:\n│ ➤ .caturrematch — Main ulang\n│ ➤ .caturhapus — Hapus game (admin)\n│ ➤ .caturreset — Reset semua (owner)\n";
      t += "╰────  •  ────";
      return m.reply(t);
    }

    // ═══ CATURRANK ═══
    if (command === "caturrank" || command === "caturtop10") {
      const entries = Object.entries(skorData);
      if (!entries.length) return m.reply(claraWrap("caturrank", "Belum ada pemain yang punya skor.", "info"));
      const urut = entries.map(([jid, d]) => ({ jid, poin: (d.menang || 0) * 3 + (d.seri || 0), ...d })).sort((a, b) => b.poin - a.poin).slice(0, 10);
      let t = "╭─「 ✦ ʀᴀɴᴋɪɴɢ ᴄᴀᴛᴜʀ ✦ 」\n";
      urut.forEach((p, i) => { t += "│ " + (i + 1) + ". @" + p.jid.split("@")[0] + " | " + p.poin + " pts (W:" + (p.menang || 0) + " D:" + (p.seri || 0) + " L:" + (p.kalah || 0) + ")\n"; });
      t += "╰────  •  ────";
      return m.reply(t, { mentions: urut.map(p => p.jid) });
    }

    // ═══ CATURSTATUS ═══
    if (command === "caturstatus") {
      const game = caturData[chatId];
      if (!game) return m.reply(claraWrap("caturstatus", "Tidak ada game catur di chat ini.", "info"));
      const status = { pending: "🕐 Menunggu lawan menerima...", ongoing: "♟️ Sedang berlangsung", selesai: "🏁 Selesai — Pemenang: @" + (game.winner?.split("@")[0] || "Tidak diketahui") }[game.status] || "❓";
      return m.reply("╭─「 ✦ sᴛᴀᴛᴜs ᴄᴀᴛᴜʀ ✦ 」\n│ P1: @" + game.player1.split("@")[0] + "\n│ P2: @" + game.player2.split("@")[0] + "\n│ Status: " + status + "\n╰────  •  ────", { mentions: [game.player1, game.player2] });
    }

    // ═══ CATURNILAI ═══
    if (command === "caturnilai") {
      const d = skorData[sender] || { menang: 0, kalah: 0, seri: 0 };
      return m.reply("╭─「 ✦ sᴋᴏʀ ᴄᴀᴛᴜʀ ✦ 」\n│ 🏆 Menang: " + d.menang + "\n│ 🤝 Seri: " + (d.seri || 0) + "\n│ 💀 Kalah: " + d.kalah + "\n╰────  •  ────");
    }

    // ═══ CATURLAWAN ═══
    if (command === "caturlawan") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturlawan", "Tidak ada game berlangsung.", "info"));
      const lawan = sender === game.player1 ? game.player2 : (sender === game.player2 ? game.player1 : null);
      if (!lawan) return m.reply(claraWrap("caturlawan", "Kamu bukan bagian dari game ini.", "info"));
      return m.reply("╭─「 ✦ ʟᴀᴡᴀɴ ✦ 」\n│ 🎯 Lawan: @" + lawan.split("@")[0] + "\n╰────  •  ────", { mentions: [lawan] });
    }

    // ═══ CATURGILIRAN / CATURNEXT ═══
    if (command === "caturgiliran" || command === "caturnext") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturgiliran", "Tidak ada game berjalan.", "info"));
      const isWhite = game.turn === "white";
      const giliran = isWhite ? game.player1 : game.player2;
      return m.reply("╭─「 ✦ ɢɪʟɪʀᴀɴ ✦ 」\n│ ⏳ @" + giliran.split("@")[0] + " (" + (isWhite ? "Putih" : "Hitam") + ")\n╰────  •  ────", { mentions: [giliran] });
    }

    // ═══ CATURREMATCH ═══
    if (command === "caturrematch") {
      const game = caturData[chatId];
      if (!game || game.status !== "selesai") return m.reply(claraWrap("caturrematch", "Tidak ada game selesai untuk rematch.", "info"));
      if (sender !== game.player1 && sender !== game.player2) return m.reply(claraWrap("caturrematch", "Kamu bukan bagian dari game sebelumnya.", "info"));
      const lawan = sender === game.player1 ? game.player2 : game.player1;
      caturData[chatId] = { player1: sender, player2: lawan, turn: "white", board: papanAwal(), status: "pending", winner: null, history: [] };
      saveCaturData(caturData);
      return m.reply("╭─「 ✦ ʀᴇᴍᴀᴛᴄʜ ✦ 」\n│ 🔁 Rematch ke @" + lawan.split("@")[0] + "!\n│ 📌 .caturterima untuk main ulang\n╰────  •  ────", { mentions: [lawan] });
    }

    // ═══ CATURAFK ═══
    if (command === "caturafk") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturafk", "Tidak ada game berjalan.", "info"));
      if (!isOwner && sender !== game.player1 && sender !== game.player2) return m.reply(claraWrap("caturafk", "Hanya pemain/owner.", "info"));
      delete caturData[chatId]; saveCaturData(caturData);
      return m.reply("╭─「 ✦ ᴀғᴋ ✦ 」\n│ ⚠️ Game dibatalkan karena lawan AFK.\n╰────  •  ────");
    }

    // ═══ CATURWAKTU ═══
    if (command === "caturwaktu") {
      if (!isOwner) return m.reply(claraWrap("caturwaktu", "Hanya owner.", "info"));
      const game = caturData[chatId];
      if (!game) return m.reply(claraWrap("caturwaktu", "Tidak ada game.", "info"));
      return m.reply("╭─「 ✦ ᴡᴀᴋᴛᴜ ✦ 」\n│ ⏱️ Timer: " + (timers[chatId] ? "Aktif (3 min)" : "Tidak aktif") + "\n│ 📌 .caturtimer untuk toggle\n╰────  •  ────");
    }

    // ═══ CATURRESET ═══
    if (command === "caturreset") {
      if (!isOwner) return m.reply(claraWrap("caturreset", "Hanya owner.", "info"));
      saveCaturData({}); saveSkor({});
      if (timers[chatId]) { clearTimeout(timers[chatId]); delete timers[chatId]; }
      return m.reply("✅ Semua data catur direset.");
    }

    // ═══ CATURSKIP ═══
    if (command === "caturskip") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturskip", "Tidak ada game.", "info"));
      const isWhite = game.turn === "white";
      const current = isWhite ? game.player1 : game.player2;
      if (sender !== current) return m.reply(claraWrap("caturskip", "Bukan giliranmu.", "info"));
      game.turn = isWhite ? "black" : "white"; saveCaturData(caturData);
      return m.reply("╭─「 ✦ sᴋɪᴘ ✦ 」\n│ ⏩ Giliran dilewati.\n│ Giliran: *" + (game.turn === "white" ? "Putih" : "Hitam") + "*\n╰────  •  ────");
    }

    // ═══ CATURDRAW ═══
    if (command === "caturdraw") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(claraWrap("caturdraw", "Tidak ada game.", "info"));
      if (!game.drawRequest) { game.drawRequest = sender; saveCaturData(caturData); return m.reply("╭─「 ✦ ᴅʀᴀᴡ ✦ 」\n│ 🤝 Kamu mengajukan seri.\n│ Lawan ketik .caturdraw untuk setuju.\n╰────  •  ────"); }
      if (game.drawRequest !== sender) {
        skorData[game.drawRequest] = skorData[game.drawRequest] || { menang: 0, kalah: 0, seri: 0 };
        skorData[sender] = skorData[sender] || { menang: 0, kalah: 0, seri: 0 };
        skorData[game.drawRequest].seri++; skorData[sender].seri++;
        delete caturData[chatId]; saveCaturData(caturData); saveSkor(skorData);
        return m.reply("╭─「 ✦ ᴅʀᴀᴡ ✦ 」\n│ 🤝 Pertandingan berakhir *Seri*.\n╰────  •  ────");
      }
      return m.reply(claraWrap("caturdraw", "Kamu sudah mengajukan, tunggu lawan.", "info"));
    }

    // ═══ CATURHAPUS ═══
    if (command === "caturhapus") {
      if (!isOwner && !isAdmins) return m.reply(claraWrap("caturhapus", "Hanya admin/owner.", "info"));
      if (!caturData[chatId]) return m.reply(claraWrap("caturhapus", "Tidak ada game.", "info"));
      delete caturData[chatId]; saveCaturData(caturData);
      return m.reply("✅ Pertandingan dihapus.");
    }

    // ═══ CATURTIMER ═══
    if (command === "caturtimer") {
      if (!isOwner && !isAdmins) return m.reply(claraWrap("caturtimer", "Hanya admin/owner.", "info"));
      const game = caturData[chatId];
      if (!game) return m.reply(claraWrap("caturtimer", "Tidak ada game.", "info"));
      if (timers[chatId]) { clearTimeout(timers[chatId]); delete timers[chatId]; return m.reply("⏱️ Timer *dimatikan*."); }
      timers[chatId] = setTimeout(() => {
        const g = loadCatur()[chatId];
        if (!g) return;
        const kalah = g.turn === "white" ? g.player1 : g.player2;
        const menang = g.turn === "white" ? g.player2 : g.player1;
        const sd = loadSkor();
        sd[menang] = sd[menang] || { menang: 0, kalah: 0, seri: 0 };
        sd[kalah] = sd[kalah] || { menang: 0, kalah: 0, seri: 0 };
        sd[menang].menang++; sd[kalah].kalah++;
        delete loadCatur()[chatId]; saveCaturData(loadCatur()); saveSkor(sd);
        sock.sendMessage(chatId, { text: "⏰ Waktu habis! @" + kalah.split("@")[0] + " kalah. Pemenang: @" + menang.split("@")[0], mentions: [kalah, menang] });
      }, 3 * 60 * 1000);
      return m.reply("⏱️ Timer *dinyalakan* (3 menit per giliran).");
    }

    // ═══ CATURHISTORY ═══
    if (command === "caturhistory") {
      const game = caturData[chatId];
      if (!game) return m.reply(claraWrap("caturhistory", "Tidak ada game.", "info"));
      if (!game.history?.length) return m.reply(claraWrap("caturhistory", "Belum ada langkah.", "info"));
      let t = "╭─「 ✦ ʜɪsᴛᴏʀʏ ✦ 」\n";
      game.history.forEach((mv, i) => { t += "│ " + (i + 1) + ". " + mv + "\n"; });
      t += "╰────  •  ────";
      return m.reply(t);
    }

    // ═══ CATURSKORRESET ═══
    if (command === "caturskorreset") {
      if (!isOwner) return m.reply(claraWrap("caturskorreset", "Hanya owner.", "info"));
      const target = m.mentionedJid?.[0] || sender;
      if (!skorData[target]) return m.reply(claraWrap("caturskorreset", "Belum punya skor.", "info"));
      delete skorData[target]; saveSkor(skorData);
      return m.reply("✅ Skor @" + target.split("@")[0] + " direset.", { mentions: [target] });
    }

    // ═══ CATURANALISA ═══
    if (command === "caturanalisa") {
      const game = caturData[chatId];
      if (!game?.history?.length) return m.reply(claraWrap("caturanalisa", "Belum ada langkah.", "info"));
      return m.reply("╭─「 ✦ ᴀɴᴀʟɪsᴀ ✦ 」\n│ 📊 Langkah terakhir: *" + game.history[game.history.length - 1] + "*\n╰────  •  ────");
    }

    // ═══ CATURNOTIF ═══
    if (command === "caturnotif") {
      if (!isOwner && !isAdmins) return m.reply(claraWrap("caturnotif", "Hanya admin/owner.", "info"));
      const game = caturData[chatId];
      if (!game) return m.reply(claraWrap("caturnotif", "Tidak ada game.", "info"));
      if (timers["notif_" + chatId]) { clearTimeout(timers["notif_" + chatId]); delete timers["notif_" + chatId]; return m.reply("🔕 Notif *dimatikan*."); }
      timers["notif_" + chatId] = setTimeout(() => {
        const g = loadCatur()[chatId];
        if (!g) return;
        const curr = g.turn === "white" ? g.player1 : g.player2;
        sock.sendMessage(chatId, { text: "⏳ @" + curr.split("@")[0] + ", giliranmu belum dimainkan 3 menit.", mentions: [curr] });
      }, 3 * 60 * 1000);
      return m.reply("🔔 Notif *dinyalakan* (AFK >3 min).");
    }
  } catch (e) {
    console.error("catur error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "catur", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
