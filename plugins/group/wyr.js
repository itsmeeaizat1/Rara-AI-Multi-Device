// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { delay } from "../../src/lib/nova-utils.js";

const pluginConfig = {
  name: "wyr",
  alias: ["wouldyourather", "wyrgrup", "would"],
  category: "group",
  description: "Would You Rather - Pilih dilema A atau B, voting real-time",
  usage: ".wyr atau .wyr start atau .wyr result atau .wyr stop",
  example: ".wyr",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// ==================== Dilemma Database ====================
const DILEMMAS = [
  { a: "Bisa terbang tapi hanya 10 menit sehari", b: "Bisa menghilang tapi hanya saat tidur" },
  { a: "Selalu 30 menit terlambat untuk semua hal", b: "Selalu 30 menit terlalu awal untuk semua hal" },
  { a: "Hanya bisa makan makanan pedas selamanya", b: "Hanya bisa makan makanan manis selamanya" },
  { a: "Tidak pernah bisa lagi pakai HP", b: "Tidak pernah bisa lagi pakai internet" },
  { a: "Bisa membaca pikiran orang lain", b: "Bisa membuat orang lain lupa sesuatu" },
  { a: "Hidup 1000 tahun tapi selalu sendiri", b: "Hidup 50 tahun tapi selalu bahagia" },
  { a: "Jadi orang terkaya di dunia", b: "Jadi orang paling pintar di dunia" },
  { a: "Bisa teleportasi ke mana saja", b: "Bisa waktu travel ke masa lalu" },
  { a: "Tidak pernah sakit selamanya", b: "Tidak pernah lapar selamanya" },
  { a: "Semua orang tahu apa yang kamu pikirkan", b: "Semua orang tahu apa yang kamu lakukan" },
  { a: "Kehilangan semua foto kenangan", b: "Kehilangan semua kontak di HP" },
  { a: "Bisa berbicara dengan hewan", b: "Bisa berbicara dengan orang yang sudah meninggal" },
  { a: "Selalu dapat nilai 100 di semua ujian", b: "Selalu menang di semua undian/lucky draw" },
  { a: "Tidak bisa berbohong selamanya", b: "Tidak bisa merahasiakan apa pun" },
  { a: "Hidup tanpa musik", b: "Hidup tanpa film/drama" },
  { a: "Punya 3 tangan", b: "Punya 3 kaki" },
  { a: "Bisa bernapas di bawah air", b: "Bisa melihat dalam gelap" },
  { a: "Setiap kali bersin, tubuh bertukar dengan orang terdekat 1 jam", b: "Setiap kali ketawa, semua di sekitarmu juga ikut ketawa tanpa henti" },
  { a: "Kembali ke SD dengan ingatan sekarang", b: "Lompat ke masa depan 50 tahun tapi tanpa ingatan" },
  { a: "Tidak pernah bisa lagi tidur", b: "Tidak pernah bisa lagi bangun dengan santai" },
  { a: "Semua yang kamu makan terasa seperti nasi", b: "Semua yang kamu minum terasa seperti air putih" },
  { a: "Punya kekuatan super tapi tidak ada yang tahu", b: "Tidak ada kekuatan tapi semua mengira kamu pahlawan" },
  { a: "Hidup di dunia tanpa uang", b: "Hidup di dunia tanpa hukum" },
  { a: "Bisa menghapus 1 memori buruk", b: "Bisa menambah 1 skill instan" },
  { a: "Selalu kedinginan", b: "Selalu kepanasan" },
  { a: "Tidak bisa melihat warna, hanya hitam putih", b: "Tidak bisa mendengar musik, hanya noise" },
  { a: "Kenalan dengan semua orang tapi tidak ada sahabat", b: "Punya 1 sahabat tapi tidak kenal orang lain" },
  { a: "Semua makanan yang kamu masak selalu enak", b: "Semua yang kamu tanam selalu tumbuh sempurna" },
  { a: "Bisa pause waktu tapi tetap menua", b: "Bisa rewind waktu 5 menit tapi hanya 1x sehari" },
  { a: "Dikira ganteng/cantik oleh semua orang", b: "Dikira pintar oleh semua orang" },
  { a: "Tidak pernah bisa marah", b: "Tidak pernah bisa takut" },
  { a: "Setiap mimpi jadi kenyataan", b: "Tidak pernah bermimpi selamanya" },
  { a: "Hidup di pulau sendirian dengan wifi", b: "Hidup di kota ramai tanpa internet" },
  { a: "Bisa mengubah 1 keputusan masa lalu", b: "Bisa melihat 1 kejadian masa depan" },
  { a: "Selalu lupa nama orang", b: "Selalu lupa wajah orang" },
  { a: "Mendapat 1 miliar tapi tidak bisa beli properti", b: "Mendapat rumah gratis tapi harus tinggal di desa terpencil" },
  { a: "Bisa bicara semua bahasa", b: "Bisa main semua alat musik" },
  { a: "Tidak pernah capek", b: "Tidak pernah bosan" },
  { a: "Setiap hal yang kamu sentuh jadi emas", b: "Setiap hal yang kamu sentuh jadi es" },
  { a: "Meninggalkan jejak kaki bercahaya saat malam", b: "Mendengar suara lembut saat sendiri" },
  { a: "Hidup 200 tahun tapi tidak menua", b: "Hidup normal tapi selalu terlihat muda" },
  { a: "Bisa copy-paste skill orang lain", b: "Bisa undo kesalahan terakhir 1x sehari" },
  { a: "Punya infinite storage di kantong", b: "Punya GPS bawaan yang selalu akurat" },
  { a: "Semua lagu yang kamu dengar jadi favorite", b: "Semua film yang kamu tonton selalu ending bahagia" },
  { a: "Tidak bisa merasakan sakit fisik", b: "Tidak bisa merasakan sedih" },
  { a: "Jadi terkenal di seluruh dunia", b: "Jadi anonim tapi punya pengaruh besar" },
  { a: "Wajahmu muncul di semua iklan", b: "Suaramu muncul di semua lagu populer" },
  { a: "Bisa lihat hantu", b: "Bisa merasakan aura orang" },
  { a: "Makan tanpa pernah kenyang", b: "Tidur tanpa pernah nyenyak" },
  { a: "Punya mesin waktu tapi hanya untuk masa depan", b: "Punya mesin waktu tapi hanya untuk 1 hari ke belakang" },
];

// ==================== Helpers ====================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatBar(count, total) {
  if (total === 0) return "";
  const pct = Math.round((count / total) * 100);
  const filled = Math.round(pct / 5);
  return "█".repeat(filled) + "░".repeat(20 - filled);
}

// ==================== Safe Helpers ====================
async function safeReply(m, sock, text, options = {}) {
  try {
    await sock.sendMessage(m.chat, { text, ...options }, { quoted: m });
  } catch {
    try { await sock.sendMessage(m.chat, { text }); } catch (e) { console.error('[wyr.js]:', e.message); }
  }
}

async function safeReact(m, sock, emoji) {
  try {
    const key = m.key || m?.message?.key || {};
    await sock.sendMessage(m.chat, {
      react: { text: emoji, key: { ...key, remoteJid: m.chat } },
    });
  } catch (e) { console.error('[wyr.js]:', e.message); }
}

// ==================== Global State ====================
if (!global.wyrGames) global.wyrGames = {};

function findGame(chat) {
  return Object.values(global.wyrGames).find((g) => g.chat === chat && g.state === "ACTIVE");
}

function getVoterCount(game) {
  return Object.keys(game.votes).length;
}

function getResults(game) {
  const aCount = Object.values(game.votes).filter(v => v === "A").length;
  const bCount = Object.values(game.votes).filter(v => v === "B").length;
  return { aCount, bCount, total: aCount + bCount };
}

function buildResultsText(game, closed = false) {
  const { aCount, bCount, total } = getResults(game);
  const aPct = total > 0 ? Math.round((aCount / total) * 100) : 0;
  const bPct = total > 0 ? Math.round((bCount / total) * 100) : 0;

  let lines = [
    game.dilemma.a,
    "",
    `A: ${aPct}% (${aCount} suara)`,
    formatBar(aCount, total),
    "",
    game.dilemma.b,
    "",
    `B: ${bPct}% (${bCount} suara)`,
    formatBar(bCount, total),
    "",
    `Total Voter: ${total}`,
  ];

  if (closed) {
    lines.push("");
    if (aCount > bCount) {
      lines.push("Pemenang: PILIHAN A");
    } else if (bCount > aCount) {
      lines.push("Pemenang: PILIHAN B");
    } else {
      lines.push("Hasil: SERI!");
    }
  }

  return lines.join("\n");
}

// ==================== Handler ====================
async function handler(m, { sock }) {
  const prefix = m.prefix || ".";
  const text = m.text || "";
  const args = text.trim().split(/\s+/);
  const subCmd = (args.slice(1).join(" ") || "").toLowerCase().trim();

  // .wyr help
  if (subCmd === "help" || subCmd === "?" || subCmd === "bantuan") {
    const helpText = [
      "CARA MAIN WOULD YOU RATHER:",
      "",
      `1. ${prefix}wyr`,
      "   Mulai dilema baru, semua member vote A atau B",
      "",
      `2. ${prefix}wyr result`,
      "   Lihat hasil voting sementara",
      "",
      `3. ${prefix}wyr stop`,
      "   Tutup voting dan tampilkan hasil final",
      "",
      `4. ${prefix}wyr next`,
      "   Skip dilema dan ganti baru",
      "",
      "Cara vote: ketik A atau B langsung di chat",
      "Voting otomatis 60 detik lalu hasil keluar",
    ].join("\n");
    await safeReply(m, sock, claraWrap("Would You Rather", helpText));
    return { handled: true };
  }

  // .wyr result
  if (subCmd === "result" || subCmd === "hasil" || subCmd === "skor") {
    const game = findGame(m.chat);
    if (!game) {
      await safeReply(m, sock, claraWrap("Would You Rather", "Tidak ada voting aktif.", "warn"));
      return { handled: true };
    }
    await safeReply(m, sock, claraWrap("Would You Rather - Live Results", buildResultsText(game)));
    return { handled: true };
  }

  // .wyr stop
  if (subCmd === "stop" || subCmd === "tutup" || subCmd === "end") {
    const game = findGame(m.chat);
    if (!game) {
      await safeReply(m, sock, claraWrap("Would You Rather", "Tidak ada voting aktif.", "warn"));
      return { handled: true };
    }

    if (game.timer) clearTimeout(game.timer);
    game.state = "CLOSED";

    const gameId = Object.keys(global.wyrGames).find(k => global.wyrGames[k] === game);
    const voters = Object.keys(game.votes).map(j => "@" + j.split("@")[0]);

    await safeReply(m, sock, claraWrap("Would You Rather - Final", buildResultsText(game, true), "success"),
      { mentions: Object.keys(game.votes) });
    delete global.wyrGames[gameId];
    return { handled: true };
  }

  // .wyr next (skip current, start new)
  if (subCmd === "next" || subCmd === "skip" || subCmd === "ganti") {
    const existing = findGame(m.chat);
    if (existing) {
      if (existing.timer) clearTimeout(existing.timer);
      const gameId = Object.keys(global.wyrGames).find(k => global.wyrGames[k] === existing);
      delete global.wyrGames[gameId];
    }
    // Fall through to start new
  }

  // .wyr (start new)
  const existingGame = findGame(m.chat);
  if (existingGame) {
    await safeReply(m, sock, claraWrap("Would You Rather",
      `Masih ada voting aktif!\n\nKetik ${prefix}wyr result untuk lihat skor\nKetik ${prefix}wyr stop untuk tutup\nKetik ${prefix}wyr next untuk ganti dilema`,
      "warn"));
    return { handled: true };
  }

  const dilemma = randomPick(DILEMMAS);
  const gameId = "wyr_" + m.chat + "_" + Date.now();
  const VOTE_DURATION = 60000; // 60 seconds

  global.wyrGames[gameId] = {
    chat: m.chat,
    dilemma,
    votes: {},
    state: "ACTIVE",
    createdAt: Date.now(),
    timer: null,
  };

  const game = global.wyrGames[gameId];

  await safeReact(m, sock, "🕐");

  const qText = [
    "PILIH SALAH SATU:",
    "",
    `A: ${dilemma.a}`,
    "",
    `B: ${dilemma.b}`,
    "",
    "Ketik A atau B untuk vote",
    `Voting otomatis 60 detik`,
  ].join("\n");

  await safeReply(m, sock, claraWrap("Would You Rather", qText, "info"));

  // Auto-close timer
  game.timer = setTimeout(async () => {
    if (game.state !== "ACTIVE") return;
    game.state = "CLOSED";

    const voters = Object.keys(game.votes);
    let closeText = buildResultsText(game, true);
    closeText += "\n\nVoting ditutup otomatis!";

    try {
      await sock.sendMessage(m.chat, {
        text: claraWrap("Would You Rather - Time Up", closeText, "success"),
        mentions: voters,
      });
    } catch (e) { console.error('[wyr.js]:', e.message); }

    const id = Object.keys(global.wyrGames).find(k => global.wyrGames[k] === game);
    if (id) delete global.wyrGames[id];
  }, VOTE_DURATION);

  return { handled: true };
}

// ==================== Answer Handler ====================
async function answerHandler(m, sock) {
  if (!m.body) return false;
  const text = m.body.trim().toLowerCase();

  // Only accept A or B
  if (text !== "a" && text !== "b") return false;

  // Ignore if it's a command
  if (/^[.!/]/.test(m.body.trim())) return false;

  const game = findGame(m.chat);
  if (!game || game.state !== "ACTIVE") return false;

  // Record vote
  game.votes[m.sender] = text.toUpperCase();

  await safeReact(m, sock, "✅");
  return true;
}

export { pluginConfig as config, handler, answerHandler };
