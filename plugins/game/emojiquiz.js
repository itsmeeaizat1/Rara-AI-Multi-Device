// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .emojiquiz — tebak film/lagu/benda dari emoji (port altftool.com "Emoji Quiz")
// Sesi per CHAT (siapa pun boleh jawab — mode grup seru). Nyawa 3, 10 soal per ronde.
// ANIMASI KHAS: kaca pembesar 🔍 mendekati emoji.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { editFramesAnim } from "../../src/lib/nova-anim-runner.js";

const pluginConfig = {
  name: "emojiquiz", alias: ["tebakemoji", "emojitebak"], category: "game",
  description: "Tebak film/lagu/benda dari rangkaian emoji",
  usage: ".emojiquiz [skip]", example: ".emojiquiz",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const BANK = [
  { e: "🍚🔥", a: "nasi goreng", k: "makanan" },
  { e: "🌊⭐", a: "bintang laut", k: "hewan" },
  { e: "🐝💛", a: "madu", k: "makanan" },
  { e: "☕🥛", a: "kopi susu", k: "minuman" },
  { e: "🕷️🧵", a: "spiderman", k: "film" },
  { e: "🦇👤", a: "batman", k: "film" },
  { e: "🧙‍♂️💍", a: "lord of the rings", k: "film" },
  { e: "🦁👑", a: "lion king", k: "film" },
  { e: "❄️⛄👩", a: "frozen", k: "film" },
  { e: "🐠🔍", a: "finding nemo", k: "film" },
  { e: "🤖❤️", a: "wall-e", k: "film" },
  { e: "🐭🏰", a: "mickey mouse", k: "kartun" },
  { e: "🚗⚡", a: "cars", k: "film" },
  { e: "🏠👴🎈", a: "up", k: "film" },
  { e: "🧸🤠", a: "toy story", k: "film" },
  { e: "🦈🎶", a: "jaws", k: "film" },
  { e: "🦖🦕🏞️", a: "jurassic park", k: "film" },
  { e: "🐧💃", a: "happy feet", k: "film" },
  { e: "🐼🥋", a: "kung fu panda", k: "film" },
  { e: "🐢🍕", a: "ninja turtles", k: "kartun" },
  { e: "🦈👶", a: "baby shark", k: "lagu" },
  { e: "🌋🔥", a: "gunung berapi", k: "alam" },
  { e: "🐄🥛", a: "susu sapi", k: "minuman" },
  { e: "☂️☔", a: "payung", k: "benda" },
  { e: "⌚⏰", a: "jam tangan", k: "benda" },
  { e: "🌧️🌈", a: "pelangi", k: "alam" },
  { e: "🌕🐺", a: "werewolf", k: "mitos" },
  { e: "🧛‍♂️🦇", a: "vampir", k: "mitos" },
  { e: "👻🚫", a: "pocong", k: "mitos" },
  { e: "🇮🇩🔥", a: "indonesia", k: "negara" },
  { e: "🗼🇫🇷", a: "menara eiffel", k: "tempat" },
  { e: "🗿🇮🇩", a: "borobudur", k: "tempat" },
  { e: "⛩️🇯🇵", a: "jepang", k: "negara" },
  { e: "🐼🇨🇳", a: "panda", k: "hewan" },
  { e: "⚽🐐", a: "messi", k: "bola" },
  { e: "🐐⚽5", a: "ronaldo", k: "bola" },
  { e: "🏀🐍", a: "kobe bryant", k: "olahraga" },
  { e: "🥅🇧🇷", a: "brazil", k: "bola" },
  { e: "🎬🍿", a: "nonton film", k: "kegiatan" },
  { e: "📚🎓", a: "sekolah", k: "tempat" },
  { e: "🏥🩺", a: "rumah sakit", k: "tempat" },
  { e: "✈️🌍", a: "keliling dunia", k: "kegiatan" },
  { e: "🎹🎤", a: "nyanyi", k: "kegiatan" },
  { e: "🍳👨‍🍳", a: "masak", k: "kegiatan" },
  { e: "🌧️☕", a: "hujan", k: "alam" },
  { e: "🌞🏖️", a: "musim panas", k: "alam" },
  { e: "❄️🥶", a: "musim dingin", k: "alam" },
  { e: "🍃🍂", a: "musim gugur", k: "alam" },
  { e: "🌸🌷", a: "musim semi", k: "alam" },
  { e: "🐘⛩️", a: "gajah", k: "hewan" },
];

const RONDE = 10, LIVES = 3;
const sessions = new Map(); // chat -> {order[], idx, score, lives, timer}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

function soalCard(s, m) {
  const q = BANK[s.order[s.idx]];
  return claraWrap("Emoji Quiz", [`SOAL ${s.idx + 1}/${s.order.length} · SKOR: ${s.score} · NYAWA: ${"❤️".repeat(s.lives)}${"🖤".repeat(LIVES - s.lives)}`,
    "",
    "```" + q.e + "```",
    "",
    `Kategori: ${q.k}`,
    "Ketik jawabanmu · .emojiquiz skip buat lompat (-1 nyawa)"].join("\n"));
}

async function animasiMulai(sock, jid) {
  const frames = [
    "🎭 EMOJI QUIZ\n\n🔍 · · · ·",
    "🎭 EMOJI QUIZ\n\n· 🔍 · ·",
    "🎭 EMOJI QUIZ\n\n· · 🔍 😮 MULAI!",
  ];
  return editFramesAnim(sock, jid, frames, { frameMs: process.env.EMOQUIZ_ANIM_MS !== undefined ? Number(process.env.EMOQUIZ_ANIM_MS) : 450 });
}

async function handler(m, { sock, config }) {
  const chat = m.chat;
  const sub = (m.text || "").trim().toLowerCase();
  if (sessions.has(chat)) {
    if (sub === "stop") {
      clearTimeout(sessions.get(chat).timer);
      sessions.delete(chat);
      return m.reply(claraWrap("Emoji Quiz", ["Kuis diakhiri."].join("\n")));
    }
    if (sub === "skip") return skipSoal(m, sock);
    return m.reply(claraWrap("Emoji Quiz", ["KUIS SEDANG BERLANGSUNG — BALAS SOALNYA",
      "",
      "Ketik jawabanmu langsung · .emojiquiz skip buat lompat · .emojiquiz stop buat keluar"].join("\n")));
  }
  const order = [...BANK.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const s = { order: order.slice(0, RONDE), idx: 0, score: 0, lives: LIVES, timer: null };
  resetT(s, chat);
  sessions.set(chat, s);
  await animasiMulai(sock, chat);
  return m.reply(soalCard(s, m));
}

function resetT(s, chat) { clearTimeout(s.timer); s.timer = setTimeout(() => sessions.delete(chat), 300000); }

async function skipSoal(m, sock) {
  const s = sessions.get(m.chat);
  if (!s) return false;
  const q = BANK[s.order[s.idx]];
  s.lives--;
  clearTimeout(s.timer);
  if (s.lives <= 0) {
    sessions.delete(m.chat);
    await m.reply(claraWrap("Emoji Quiz", ["💔 NYAWA HABIS — GAME OVER",
      "",
      `Jawaban terakhir: ${q.a}`,
      `Skor akhir: ${s.score}/${s.order.length}`,
      "",
      `Main lagi: ${m.prefix}emojiquiz`].join("\n")));
    return true;
  }
  s.idx++;
  if (s.idx >= s.order.length) return hasilAkhir(m, s);
  resetT(s, m.chat);
  await m.reply(claraWrap("Emoji Quiz", [`⏭️ Skip! Jawabannya: ${q.a}`,
    "",
    `Nyawa sisa: ${"❤️".repeat(s.lives)}${"🖤".repeat(LIVES - s.lives)}`,
    "",
    "— SOAL BERIKUTNYA —"].join("\n")));
  await m.reply(soalCard(s, m));
  return true;
}

async function hasilAkhir(m, s) {
  sessions.delete(m.chat);
  await m.reply(claraWrap("Emoji Quiz", ["🏁 RONDE SELESAI!",
    "",
    `Skor: ${s.score}/${s.order.length}`,
    s.score === s.order.length ? "SEMPURNA! 🏆" : s.score >= 7 ? "Hebat! 🔥" : "Lumayan! Coba lagi ya 💪",
    "",
    `Main lagi: ${m.prefix}emojiquiz`].join("\n")));
  return true;
}

export async function answerHandler(m, sock) {
  const s = sessions.get(m.chat);
  if (!s || m.isCommand) return false;
  const text = (m.text || "").trim().toLowerCase();
  if (text === "skip" || text === "stop") return false; // lewat command saja
  const q = BANK[s.order[s.idx]];
  const guess = norm(text);
  if (!guess) return false;
  if (guess === norm(q.a)) {
    s.score++;
    s.idx++;
    clearTimeout(s.timer);
    if (s.idx >= s.order.length) return hasilAkhir(m, s);
    resetT(s, m.chat);
    await m.reply(claraWrap("Emoji Quiz", ["✅ BENAR! Jawabannya: " + q.a,
      "",
      `Skor: ${s.score} · Sisa soal: ${s.order.length - s.idx}`,
      "",
      "— SOAL BERIKUTNYA —"].join("\n")));
    await m.reply(soalCard(s, m));
    return true;
  }
  s.lives--;
  clearTimeout(s.timer);
  if (s.lives <= 0) {
    sessions.delete(m.chat);
    await m.reply(claraWrap("Emoji Quiz", ["💔 SALAH — NYAWA HABIS, GAME OVER",
      "",
      `Jawabannya: ${q.a}`,
      `Skor akhir: ${s.score}/${s.order.length}`,
      "",
      `Main lagi: ${m.prefix}emojiquiz`].join("\n")));
    return true;
  }
  resetT(s, m.chat);
  await m.reply(claraWrap("Emoji Quiz", ["❌ Belum tepat. Nyawa: " + "❤️".repeat(s.lives) + "🖤".repeat(LIVES - s.lives),
    "",
    "```" + q.e + "```",
    "",
    "Coba lagi! Ketik jawabanmu · .emojiquiz skip (-1 nyawa)"].join("\n")));
  return true;
}

export { pluginConfig as config, handler };
