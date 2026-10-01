// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Catur — Multiplayer Chess System (28 sub-commands)
import { getDatabase } from "../../src/lib/rara-database.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { raraWrap, raraBox, toSC } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";
import te from "../../src/lib/rara-error.js";
import fs from "fs";
import path from "path";

const pluginConfig = {
  name: "chess",
  alias: ["catur"],
  aliases: ["catur","caturterima","caturtolak","caturpapan","caturlangkah","caturmenyerah","caturselesai","caturhelp","caturrank","caturstatus","caturnilai","caturlawan","caturgiliran","caturrematch","caturafk","caturwaktu","caturreset","caturskip","caturdraw","caturhapus","caturnext","caturboard","caturtimer","caturhistory","caturskorreset","caturanalisa","caturtop10","caturnotif"],
  category: "game",
  description: "Sistem catur multiplayer lengkap (tantang, main, skor, rank)",
  usage: ".chess @tag | .caturlangkah e2 e4 | .caturhelp",
  example: ".chess @user",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 1, isEnabled: true,
};

// ═══ DB HELPERS ═══
const DB_DIR = path.join(process.cwd(), "src", "database", "game");
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
      if (mentioned.length === 0) return m.reply(raraWrap("catur", "Tag pengguna untuk ditantang!\nContoh: .chess @user", "guide"));
      const lawan = mentioned[0];
      if (lawan === sender) return m.reply(raraWrap("catur", "Kamu tidak bisa menantang dirimu sendiri.", "info"));
      if (caturData[chatId]) return m.reply(raraWrap("catur", "Masih ada game di chat ini.", "info"));
      caturData[chatId] = { player1: sender, player2: lawan, turn: "white", board: papanAwal(), status: "pending", winner: null, history: [] };
      saveCaturData(caturData);
      return m.reply(raraBox("Catur", [
        "Tantangan dikirim ke @" + lawan.split("@")[0],
        "---",
        "Balas dengan .caturterima untuk main",
        ".caturhelp untuk panduan",
      ]), { mentions: [lawan] });
    }

    // ═══ CATURTERIMA ═══
    if (command === "caturterima") {
      const game = caturData[chatId];
      if (!game || game.status !== "pending") return m.reply(raraWrap("caturterima", "Tidak ada tantangan aktif.", "info"));
      if (game.player2 !== sender) return m.reply(raraWrap("caturterima", "Kamu bukan yang ditantang.", "info"));
      game.status = "ongoing";
      saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "⚔️ *PERMAINAN DIMULAI!*", body: "Giliran: *Putih* (" + (game.player1 === sender ? "Kamu" : "@" + game.player1.split("@")[0]) + ")\n\n" + tampilkanPapan(game.board), cta: gameCTA("catur") }), { mentions: [game.player1, game.player2] });
    }

    // ═══ CATURTOLAK ═══
    if (command === "caturtolak") {
      const game = caturData[chatId];
      if (!game || game.status !== "pending") return m.reply(raraWrap("caturtolak", "Tidak ada tantangan aktif.", "info"));
      if (game.player2 !== sender) return m.reply(raraWrap("caturtolak", "Kamu bukan yang ditantang.", "info"));
      delete caturData[chatId]; saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "❌ *TANTANGAN DITOLAK!*", body: "Lawan gak jadi main. Coba tantang orang lain ya kak." }));
    }

    // ═══ CATURPAPAN ═══
    if (command === "caturpapan" || command === "caturboard") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturpapan", "Tidak ada game berjalan.", "info"));
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "Papan saat ini:\n\n" + tampilkanPapan(game.board) + "\nGiliran: *" + (game.turn === "white" ? "Putih" : "Hitam") + "*" }));
    }

    // ═══ CATURLANGKAH ═══
    if (command === "caturlangkah") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturlangkah", "Tidak ada game berjalan.", "info"));
      const [fromRaw, toRaw] = (text || "").trim().split(" ");
      if (!fromRaw || !toRaw) return m.reply(raraWrap("caturlangkah", "Gunakan: .caturlangkah e2 e4", "guide"));
      const from = fromRaw.toLowerCase(), to = toRaw.toLowerCase();
      const fx = 8 - parseInt(from[1]), fy = COLS[from[0]];
      const tx = 8 - parseInt(to[1]), ty = COLS[to[0]];
      if (fx === undefined || fy === undefined || tx === undefined || ty === undefined || isNaN(fx) || isNaN(tx)) return m.reply(raraWrap("caturlangkah", "Posisi tidak valid.", "info"));
      const isWhite = game.turn === "white";
      const currentPlayer = isWhite ? game.player1 : game.player2;
      if (sender !== currentPlayer) return m.reply(raraWrap("caturlangkah", "Bukan giliranmu.", "info"));
      const piece = game.board[fx][fy];
      if (!piece) return m.reply(raraWrap("caturlangkah", "Tidak ada bidak di posisi itu.", "info"));
      if (isWhite && !WHITE_PIECES.includes(piece)) return m.reply(raraWrap("caturlangkah", "Itu bukan bidakmu.", "info"));
      if (!isWhite && !BLACK_PIECES.includes(piece)) return m.reply(raraWrap("caturlangkah", "Itu bukan bidakmu.", "info"));
      game.board[tx][ty] = piece; game.board[fx][fy] = "";
      game.turn = isWhite ? "black" : "white";
      game.history.push(from + "-" + to);
      saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "♟️ *LANGKAH VALID!*", body: tampilkanPapan(game.board) + "\nGiliran: *" + (game.turn === "white" ? "Putih" : "Hitam") + "*" }));
    }

    // ═══ CATURMENYERAH ═══
    if (command === "caturmenyerah") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturmenyerah", "Tidak ada game berjalan.", "info"));
      if (sender !== game.player1 && sender !== game.player2) return m.reply(raraWrap("caturmenyerah", "Kamu bukan pemain di game ini.", "info"));
      const pemenang = sender === game.player1 ? game.player2 : game.player1;
      game.status = "selesai"; game.winner = pemenang;
      skorData[pemenang] = skorData[pemenang] || { menang: 0, kalah: 0, seri: 0 };
      skorData[sender] = skorData[sender] || { menang: 0, kalah: 0, seri: 0 };
      skorData[pemenang].menang++; skorData[sender].kalah++;
      saveCaturData(caturData); saveSkor(skorData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "🏳️ *MENYERAH!*", body: "🏆 Pemenang: @" + pemenang.split("@")[0], cta: gameCTA("catur") }), { mentions: [pemenang] });
    }

    // ═══ CATURSELESAI ═══
    if (command === "caturselesai") {
      if (!isOwner) return m.reply(raraWrap("caturselesai", "Hanya owner yang bisa paksa selesai.", "info"));
      if (caturData[chatId]) { delete caturData[chatId]; saveCaturData(caturData); return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "🏁 *GAME DIPAKSA SELESAI!*", body: "Admin mengakhiri pertandingan.", cta: gameCTA("catur") })); }
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "Gak ada game yang jalan di sini. Mulai dulu pakai .caturlawan" }));
    }

    // ═══ CATURHELP ═══
    if (command === "caturhelp") {
      return m.reply(raraBox("Panduan Catur", [
        "Bermain catur langsung di grup!",
        "---",
        { sub: "Memulai" },
        ".chess @tag — Tantang pemain",
        ".caturterima — Terima tantangan",
        ".caturtolak — Tolak tantangan",
        "---",
        { sub: "Kontrol" },
        ".caturlangkah e2 e4 — Pindah bidak",
        ".caturpapan — Lihat papan",
        ".caturmenyerah — Menyerah",
        ".caturdraw — Ajukan seri",
        ".caturskip — Lewati giliran",
        "---",
        { sub: "Skor" },
        ".caturnilai — Skormu",
        ".caturrank — Ranking",
        ".caturtop10 — Top 10",
        ".caturskorreset — Reset skor (owner)",
        "---",
        { sub: "Info" },
        ".caturstatus — Status game",
        ".caturgiliran — Siapa giliran",
        ".caturhistory — Riwayat langkah",
        ".caturanalisa — Langkah terakhir",
        ".caturlawan — Lihat lawan",
        "---",
        { sub: "Timer" },
        ".caturtimer — Timer giliran (3 min)",
        ".caturnotif — Notif AFK",
        ".caturafk — Batal karena AFK",
        "---",
        { sub: "Lainnya" },
        ".caturrematch — Main ulang",
        ".caturhapus — Hapus game (admin)",
        ".caturreset — Reset semua (owner)",
      ]));
    }

    // ═══ CATURRANK ═══
    if (command === "caturrank" || command === "caturtop10") {
      const entries = Object.entries(skorData);
      if (!entries.length) return m.reply(raraWrap("caturrank", "Belum ada pemain yang punya skor.", "info"));
      const urut = entries.map(([jid, d]) => ({ jid, poin: (d.menang || 0) * 3 + (d.seri || 0), ...d })).sort((a, b) => b.poin - a.poin).slice(0, 10);
      let t = "🏆 *Ranking Catur*\n";
      urut.forEach((p, i) => { t += (i + 1) + ". @" + p.jid.split("@")[0] + " | " + p.poin + " pts (W:" + (p.menang || 0) + " D:" + (p.seri || 0) + " L:" + (p.kalah || 0) + ")\n"; });
      return m.reply(t.trim(), { mentions: urut.map(p => p.jid) });
    }

    // ═══ CATURSTATUS ═══
    if (command === "caturstatus") {
      const game = caturData[chatId];
      if (!game) return m.reply(raraWrap("caturstatus", "Tidak ada game catur di chat ini.", "info"));
      const status = { pending: "🕐 Menunggu lawan menerima...", ongoing: "♟️ Sedang berlangsung", selesai: "🏁 Selesai — Pemenang: @" + (game.winner?.split("@")[0] || "Tidak diketahui") }[game.status] || "❓";
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "P1: @" + game.player1.split("@")[0] + "\nP2: @" + game.player2.split("@")[0] + "\nStatus: " + status }), { mentions: [game.player1, game.player2] });
    }

    // ═══ CATURNILAI ═══
    if (command === "caturnilai") {
      const d = skorData[sender] || { menang: 0, kalah: 0, seri: 0 };
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "🏆 Menang: " + d.menang + "\n🤝 Seri: " + (d.seri || 0) + "\n💀 Kalah: " + d.kalah }));
    }

    // ═══ CATURLAWAN ═══
    if (command === "caturlawan") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturlawan", "Tidak ada game berlangsung.", "info"));
      const lawan = sender === game.player1 ? game.player2 : (sender === game.player2 ? game.player1 : null);
      if (!lawan) return m.reply(raraWrap("caturlawan", "Kamu bukan bagian dari game ini.", "info"));
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "🎯 Tantangan terkirim ke: @" + lawan.split("@")[0] + "\nLawan balas .caturterima untuk mulai" }), { mentions: [lawan] });
    }

    // ═══ CATURGILIRAN / CATURNEXT ═══
    if (command === "caturgiliran" || command === "caturnext") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturgiliran", "Tidak ada game berjalan.", "info"));
      const isWhite = game.turn === "white";
      const giliran = isWhite ? game.player1 : game.player2;
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "🕒 *SETELAH INI GILIRANMU!*", body: "Giliran: @" + giliran.split("@")[0] + " (" + (isWhite ? "Putih" : "Hitam") + ")" }), { mentions: [giliran] });
    }

    // ═══ CATURREMATCH ═══
    if (command === "caturrematch") {
      const game = caturData[chatId];
      if (!game || game.status !== "selesai") return m.reply(raraWrap("caturrematch", "Tidak ada game selesai untuk rematch.", "info"));
      if (sender !== game.player1 && sender !== game.player2) return m.reply(raraWrap("caturrematch", "Kamu bukan bagian dari game sebelumnya.", "info"));
      const lawan = sender === game.player1 ? game.player2 : game.player1;
      caturData[chatId] = { player1: sender, player2: lawan, turn: "white", board: papanAwal(), status: "pending", winner: null, history: [] };
      saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "🔁 *REMATCH!*", body: "Tantangan ulang ke @" + lawan.split("@")[0] + "\n📌 Lawan ketik .caturterima untuk main ulang" }), { mentions: [lawan] });
    }

    // ═══ CATURAFK ═══
    if (command === "caturafk") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturafk", "Tidak ada game berjalan.", "info"));
      if (!isOwner && sender !== game.player1 && sender !== game.player2) return m.reply(raraWrap("caturafk", "Hanya pemain/owner.", "info"));
      delete caturData[chatId]; saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "💤 *AFK DETECTED!*", body: "Game dibatalkan karena lawan AFK. Nantang lagi nanti ya kak.", cta: gameCTA("catur") }));
    }

    // ═══ CATURWAKTU ═══
    if (command === "caturwaktu") {
      if (!isOwner) return m.reply(raraWrap("caturwaktu", "Hanya owner.", "info"));
      const game = caturData[chatId];
      if (!game) return m.reply(raraWrap("caturwaktu", "Tidak ada game.", "info"));
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "⏱️ Timer: " + (timers[chatId] ? "Aktif (3 min)" : "Tidak aktif") + "\n📌 .caturtimer untuk toggle" }));
    }

    // ═══ CATURRESET ═══
    if (command === "caturreset") {
      if (!isOwner) return m.reply(raraWrap("caturreset", "Hanya owner.", "info"));
      saveCaturData({}); saveSkor({});
      if (timers[chatId]) { clearTimeout(timers[chatId]); delete timers[chatId]; }
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "✅ *BERHASIL!*", body: "Semua data catur direset." }));
    }

    // ═══ CATURSKIP ═══
    if (command === "caturskip") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturskip", "Tidak ada game.", "info"));
      const isWhite = game.turn === "white";
      const current = isWhite ? game.player1 : game.player2;
      if (sender !== current) return m.reply(raraWrap("caturskip", "Bukan giliranmu.", "info"));
      game.turn = isWhite ? "black" : "white"; saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "⏩ *LANGKAH DILEWATI!*", body: "Giliran: *" + (game.turn === "white" ? "Putih" : "Hitam") + "*" }));
    }

    // ═══ CATURDRAW ═══
    if (command === "caturdraw") {
      const game = caturData[chatId];
      if (!game || game.status !== "ongoing") return m.reply(raraWrap("caturdraw", "Tidak ada game.", "info"));
      if (!game.drawRequest) { game.drawRequest = sender; saveCaturData(caturData); return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "🤝 *PENGAJUAN SERI!*", body: "Kamu mengajukan seri.\nLawan ketik .caturdraw untuk setuju." })); }
      if (game.drawRequest !== sender) {
        skorData[game.drawRequest] = skorData[game.drawRequest] || { menang: 0, kalah: 0, seri: 0 };
        skorData[sender] = skorData[sender] || { menang: 0, kalah: 0, seri: 0 };
        skorData[game.drawRequest].seri++; skorData[sender].seri++;
        delete caturData[chatId]; saveCaturData(caturData); saveSkor(skorData);
        return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "🤝 *SERI!*", body: "Pertandingan berakhir tanpa pemenang.", cta: gameCTA("catur") }));
      }
      return m.reply(raraWrap("caturdraw", "Kamu sudah mengajukan, tunggu lawan.", "info"));
    }

    // ═══ CATURHAPUS ═══
    if (command === "caturhapus") {
      if (!isOwner && !isAdmins) return m.reply(raraWrap("caturhapus", "Hanya admin/owner.", "info"));
      if (!caturData[chatId]) return m.reply(raraWrap("caturhapus", "Tidak ada game.", "info"));
      delete caturData[chatId]; saveCaturData(caturData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "✅ *BERHASIL!*", body: "Pertandingan dihapus." }));
    }

    // ═══ CATURTIMER ═══
    if (command === "caturtimer") {
      if (!isOwner && !isAdmins) return m.reply(raraWrap("caturtimer", "Hanya admin/owner.", "info"));
      const game = caturData[chatId];
      if (!game) return m.reply(raraWrap("caturtimer", "Tidak ada game.", "info"));
      if (timers[chatId]) { clearTimeout(timers[chatId]); delete timers[chatId]; return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "⏱️ Timer dimatikan." })); }
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
        sock.sendMessage(chatId, { text: smallcapsText("⏰ Waktu habis! @" + kalah.split("@")[0] + " kalah. Pemenang: @" + menang.split("@")[0]), mentions: [kalah, menang] });
      }, 3 * 60 * 1000);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "⏱️ Timer dinyalakan — 3 menit per giliran, AFK = batal." }));
    }

    // ═══ CATURHISTORY ═══
    if (command === "caturhistory") {
      const game = caturData[chatId];
      if (!game) return m.reply(raraWrap("caturhistory", "Tidak ada game.", "info"));
      if (!game.history?.length) return m.reply(raraWrap("caturhistory", "Belum ada langkah.", "info"));
      let t = "📜 *History*\n";
      game.history.forEach((mv, i) => { t += (i + 1) + ". " + mv + "\n"; });
      return m.reply(t.trim());
    }

    // ═══ CATURSKORRESET ═══
    if (command === "caturskorreset") {
      if (!isOwner) return m.reply(raraWrap("caturskorreset", "Hanya owner.", "info"));
      const target = m.mentionedJid?.[0] || sender;
      if (!skorData[target]) return m.reply(raraWrap("caturskorreset", "Belum punya skor.", "info"));
      delete skorData[target]; saveSkor(skorData);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", flavor: "✅ *BERHASIL!*", body: "Skor @" + target.split("@")[0] + " direset." }), { mentions: [target] });
    }

    // ═══ CATURANALISA ═══
    if (command === "caturanalisa") {
      const game = caturData[chatId];
      if (!game?.history?.length) return m.reply(raraWrap("caturanalisa", "Belum ada langkah.", "info"));
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "📊 Langkah terakhir: *" + game.history[game.history.length - 1] + "*" }));
    }

    // ═══ CATURNOTIF ═══
    if (command === "caturnotif") {
      if (!isOwner && !isAdmins) return m.reply(raraWrap("caturnotif", "Hanya admin/owner.", "info"));
      const game = caturData[chatId];
      if (!game) return m.reply(raraWrap("caturnotif", "Tidak ada game.", "info"));
      if (timers["notif_" + chatId]) { clearTimeout(timers["notif_" + chatId]); delete timers["notif_" + chatId]; return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "🔕 Notif giliran dimatikan." })); }
      timers["notif_" + chatId] = setTimeout(() => {
        const g = loadCatur()[chatId];
        if (!g) return;
        const curr = g.turn === "white" ? g.player1 : g.player2;
        sock.sendMessage(chatId, { text: smallcapsText("🕒 @" + curr.split("@")[0] + ", giliranmu belum dimainkan 3 menit."), mentions: [curr] });
      }, 3 * 60 * 1000);
      return m.reply(raraGameBox({ title: "catur", icon: "♟️", body: "🔔 Notif giliran dinyalakan — gak akan ada lagi yang AFK diam-diam." }));
    }
  } catch (e) {
    console.error("catur error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap(m.command || "catur", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
