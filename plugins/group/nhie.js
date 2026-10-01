// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { delay } from "../../src/lib/rara-utils.js";

const pluginConfig = {
  name: "nhiegc",
  alias: ["nhiegc", "nhie"],
  category: "group",
  description: "Never Have I Ever - Bot kasih statement, member jawab pernah/belum",
  usage: ".nhie atau .nhie start atau .nhie result atau .nhie stop",
  example: ".nhie",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// ==================== Statement Database ====================
const STATEMENTS = [
  "Tidur di kelas saat pelajaran",
  "Lupa ulang tahun sendiri",
  "Pura-pura sakit biar gak masuk sekolah/kerja",
  "Ngirim chat ke orang yang salah",
  "Tertidur saat teleponan",
  "Menangis karena film/drama",
  "Makan es krim di tengah malam",
  "Lupa di mana parkir motor/mobil",
  "Pura-pura paham pembicaraan padahal bingung",
  "Ketawa sendiri ingat meme",
  "Lupa nama teman sendiri",
  "Sengaja tidak angkat telepon",
  "Lapor sakit padahal sebenarnya sehat",
  "Mengantuk saat meeting/pelajaran penting",
  "Re-watch drama/film yang sama lebih dari 3x",
  "Terlalu overthinking sampai gak bisa tidur",
  "Makan makanan yang udah jatuh (aturan 5 detik)",
  "Lupa password akun sendiri",
  "Kirim meme ke grup keluarga yang seharusnya ke teman",
  "Tidur dengan masih pakai sepatu",
  "Mimpi buruk terus terbangun tengah malam",
  "Berkata 'saya juga' padahal gak ngerti",
  "Pura-pura sibuk biar gak diajak ngobrol",
  "Lupa matikan kompor/lampu",
  "Suka sama seseorang tapi gak pernah ngaku",
  "Maling makanan teman dari kulkas kos",
  "Tertidur di toilet",
  "Mengirim pesan ke mantan saat mabuk/sleep talk",
  "Gugup sampai bicara sendirian",
  "Lupa hari apa sekarang",
  "Scroll medsos sampai lupa waktu",
  "Pernah nangis di tempat umum",
  "Lupa ulang tahun orang tua",
  "Makan mie instan lebih dari 3x sehari",
  "Tertidur saat nonton film bioskop",
  "Pura-pura gak kenal seseorang yang menyapa",
  "Keluar rumah pakai bahanal/celana dalam keluar",
  "Menyimpan rahasia besar yang gak ada yang tahu",
  "Lupa nomor HP sendiri",
  "Mengirim uang ke nomor yang salah",
  "Marah sama benda mati (HP, kulkas, dll)",
  "Makan cokelat sampai mual",
  "Pernah ghosting seseorang",
  "Lupa jadwal penerbangan/kereta",
  "Sengaja pura-pura gak baca pesan",
  "Ketemu idol/idola favorit",
  "Tidur lebih dari 12 jam non-stop",
  "Lupa ganti baju seharian di rumah",
  "Mengantuk saat sholat/ibadah",
  "Makan nasi pakai kecap aja (gak ada lauk)",
  "Pernah lupa bawa dompet pas keluar rumah",
  "Mengunci diri di kamar lalu lupa kunci di mana",
  "Tertawa keras sendirian di tempat umum",
  "Membaca pesan mantan berulang kali",
  "Mengambil foto selfie lebih dari 50 kali sekaligus",
  "Merasa diri sendiri ganteng/cantik hari ini",
  "Mencuri hati seseorang (in the game of love)",
  "Pura-pura online padahal lagi AFK",
  "Mengirim voice note lama banget tanpa henti",
  "Menganggap diri introvert padahal bisa akrab cepat",
  "Pernah masuk grup lalu keluar lagi karena gak nyaman",
  "Mengoleksi barang lucu yang gak berguna",
  "Menonton video ASMR sampai terlelap",
  "Pernah menangis karena kucing/anjing peliharaan sakit",
  "Menganggap semuanya halusinasi karena kecapean",
  "Mengobrol dengan diri sendiri di cermin",
  "Mengirim lebih dari 10 meme sehari ke grup",
  "Pernah ketiduran sampai siang di hari kerja",
  "Mengaku sudah makan padahal belom",
  "Pura-pura paham bahasa inggris padahal pakai translate",
  "Menyukai lagu yang liriknya gak dipahami",
  "Mengubah nama WiFi jadi lucu/gaje",
  "Mengabaikan alarm HP lebih dari 5 kali",
  "Pernah lupa nama pacar sendiri",
  "Mengirim screenshot ke orang yang ada di screenshot",
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
  return "▰".repeat(filled) + "▱".repeat(20 - filled);
}

// ==================== Safe Helpers ====================
async function safeReply(m, sock, text, options = {}) {
  try {
    await sock.sendMessage(m.chat, { text, ...options }, { quoted: m });
  } catch {
    try { await sock.sendMessage(m.chat, { text }); } catch (e) { console.error('[nhie.js]:', e.message); }
  }
}

async function safeReact(m, sock, emoji) {
  try {
    const key = m.key || m?.message?.key || {};
    await sock.sendMessage(m.chat, {
      react: { text: emoji, key: { ...key, remoteJid: m.chat } },
    });
  } catch (e) { console.error('[nhie.js]:', e.message); }
}

// ==================== Global State ====================
if (!global.nhieGames) global.nhieGames = {};

function findGame(chat) {
  return Object.values(global.nhieGames).find((g) => g.chat === chat && g.state === "ACTIVE");
}

function getResults(game) {
  let pernah = 0;
  let belum = 0;
  const pernahList = [];
  const belumList = [];

  for (const [jid, ans] of Object.entries(game.answers)) {
    if (ans === "pernah") {
      pernah++;
      pernahList.push(jid);
    } else {
      belum++;
      belumList.push(jid);
    }
  }

  return { pernah, belum, total: pernah + belum, pernahList, belumList };
}

function buildResultsText(game, closed = false) {
  const { pernah, belum, total } = getResults(game);
  const pernahPct = total > 0 ? Math.round((pernah / total) * 100) : 0;
  const belumPct = total > 0 ? Math.round((belum / total) * 100) : 0;

  let lines = [
    `Statement: ${game.statement}`,
    "",
    "PERNAH",
    `${pernahPct}% (${pernah} orang)`,
    formatBar(pernah, total),
    "",
    "BELUM",
    `${belumPct}% (${belum} orang)`,
    formatBar(belum, total),
    "",
    `Total Voter: ${total}`,
  ];

  if (closed) {
    lines.push("");
    if (pernah > belum) {
      lines.push(`Mayoritas: PERNAH (${pernah} orang jujur!)`);
    } else if (belum > pernah) {
      lines.push(`Mayoritas: BELUM (${belum} orang bersih!)`);
    } else {
      lines.push("Hasil: IMBANG!");
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

  // .nhie help
  if (subCmd === "help" || subCmd === "?" || subCmd === "bantuan") {
    const helpText = [
      "CARA MAIN NEVER HAVE I EVER:",
      "",
      `1. ${prefix}nhie`,
      "   Bot kasih statement, semua member jawab pernah/belum",
      "",
      `2. ${prefix}nhie result`,
      "   Lihat hasil sementara",
      "",
      `3. ${prefix}nhie stop`,
      "   Tutup voting dan tampilkan hasil final",
      "",
      `4. ${prefix}nhie next`,
      "   Skip statement dan ganti baru",
      "",
      "Cara jawab: ketik pernah atau belum",
      "Voting otomatis 60 detik lalu hasil keluar",
    ].join("\n");
    await safeReply(m, sock, raraWrap("Never Have I Ever", helpText));
    return { handled: true };
  }

  // .nhie result
  if (subCmd === "result" || subCmd === "hasil" || subCmd === "skor") {
    const game = findGame(m.chat);
    if (!game) {
      await safeReply(m, sock, raraWrap("Never Have I Ever", "Tidak ada voting aktif.", "warn"));
      return { handled: true };
    }
    await safeReply(m, sock, raraWrap("Never Have I Ever - Live Results", buildResultsText(game)));
    return { handled: true };
  }

  // .nhie stop
  if (subCmd === "stop" || subCmd === "tutup" || subCmd === "end") {
    const game = findGame(m.chat);
    if (!game) {
      await safeReply(m, sock, raraWrap("Never Have I Ever", "Tidak ada voting aktif.", "warn"));
      return { handled: true };
    }

    if (game.timer) clearTimeout(game.timer);
    game.state = "CLOSED";

    const gameId = Object.keys(global.nhieGames).find(k => global.nhieGames[k] === game);

    await safeReply(m, sock, raraWrap("Never Have I Ever - Final", buildResultsText(game, true), "success"),
      { mentions: Object.keys(game.answers) });
    delete global.nhieGames[gameId];
    return { handled: true };
  }

  // .nhie next (skip, start new)
  if (subCmd === "next" || subCmd === "skip" || subCmd === "ganti") {
    const existing = findGame(m.chat);
    if (existing) {
      if (existing.timer) clearTimeout(existing.timer);
      const gameId = Object.keys(global.nhieGames).find(k => global.nhieGames[k] === existing);
      delete global.nhieGames[gameId];
    }
    // Fall through
  }

  // .nhie (start new)
  const existingGame = findGame(m.chat);
  if (existingGame) {
    await safeReply(m, sock, raraWrap("Never Have I Ever",
      `Masih ada voting aktif!\n\nKetik ${prefix}nhie result untuk lihat hasil\nKetik ${prefix}nhie stop untuk tutup\nKetik ${prefix}nhie next untuk ganti`,
      "warn"));
    return { handled: true };
  }

  const statement = randomPick(STATEMENTS);
  const gameId = "nhie_" + m.chat + "_" + Date.now();
  const VOTE_DURATION = 60000;

  global.nhieGames[gameId] = {
    chat: m.chat,
    statement,
    answers: {},
    state: "ACTIVE",
    createdAt: Date.now(),
    timer: null,
  };

  const game = global.nhieGames[gameId];

  await safeReact(m, sock, "🕐");

  const qText = [
    "NEVER HAVE I EVER...",
    "",
    `${statement}`,
    "",
    "Jawab dengan: pernah atau belum",
    "Voting otomatis 60 detik",
  ].join("\n");

  await safeReply(m, sock, raraWrap("Never Have I Ever", qText, "info"));

  // Auto-close timer
  game.timer = setTimeout(async () => {
    if (game.state !== "ACTIVE") return;
    game.state = "CLOSED";

    let closeText = buildResultsText(game, true);
    closeText += "\n\nVoting ditutup otomatis!";

    try {
      await sock.sendMessage(m.chat, {
        text: raraWrap("Never Have I Ever - Time Up", closeText, "success"),
        mentions: Object.keys(game.answers),
      });
    } catch (e) { console.error('[nhie.js]:', e.message); }

    const id = Object.keys(global.nhieGames).find(k => global.nhieGames[k] === game);
    if (id) delete global.nhieGames[id];
  }, VOTE_DURATION);

  return { handled: true };
}

// ==================== Answer Handler ====================
async function answerHandler(m, sock) {
  if (!m.body) return false;
  const text = m.body.trim().toLowerCase();

  // Accept various answers
  const pernahAnswers = ["pernah", "p", "sudah", "udah", "iya", "yes", "y"];
  const belumAnswers = ["belum", "b", "tidak", "gak", "nggak", "no", "n"];

  if (!pernahAnswers.includes(text) && !belumAnswers.includes(text)) return false;

  // Ignore commands
  if (/^[.!/]/.test(m.body.trim())) return false;

  const game = findGame(m.chat);
  if (!game || game.state !== "ACTIVE") return false;

  // Record answer
  game.answers[m.sender] = pernahAnswers.includes(text) ? "pernah" : "belum";

  await safeReact(m, sock, "✅");
  return true;
}

export { pluginConfig as config, handler, answerHandler };
