// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .dailywordgame — tebak kata 5 huruf 6 kesempatan (port altftool.com "Daily Word Game")
// Mode harian: kata sama untuk semua pemain per tanggal WIB. .dailywordgame acak = latihan.
// ANIMASI KHAS: kotak tile kosong terungkap jadi hijau satu per satu (beda dari game lain).
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { editFramesAnim } from "../../src/lib/nova-anim-runner.js";

const pluginConfig = {
  name: "dailywordgame", alias: ["wordle", "tebakkatalima"], category: "game",
  description: "Tebak kata 5 huruf dalam 6 kesempatan (Wordle style)",
  usage: ".dailywordgame [acak]", example: ".dailywordgame acak",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const WORDS = ["abadi","acara","aduan","agama","ajang","aktif","alami","angka","asing","bakso","balok","bantu","batik","bebek","benar","beres","besar","betul","bijak","bilik","bodoh","bonus","bosan","buaya","bubuk","bukan","bulan","bunga","capai","cemas","cepat","cerah","ceria","cinta","cukup","damai","dalam","danau","daring","debat","deret","detak","drama","dunia","elang","emosi","gajah","ganti","garis","gatal","gelap","genap","gerak","gores","hadir","hafal","harga","harum","hebat","hijau","hilir","indah","jalur","jahit","jalan","jambu","jarum","jeruk","jimat","jodoh","kacau","kaget","kakak","kadar","kalah","kamus","kanan","kapal","karun","kasur","kawah","kecil","kedai","kelam","kejar","kelas","keras","kerja","kesal","ketik","kilau","kirim","komik","lampu","lapis","lebar","lelah","lemak","lensa","lepas","lilin","lisan","lotre","mahal","malas","mandi","manis","marah","masak","masuk","medan","melon","mepet","merah","mesin","metal","minum","mirip","motor","musik","nanti","nenek","ngilu","nihil","nomor","nyala","nyata","ombak","padat","pajak","paket","panas","papan","papar","pasar","pasti","patuh","pedal","peluk","penyu","perak","pesan","petak","piara","pilar","pintu","plaza","polos","pusat","putih","racun","rajin","raket","rebat","rekor","remuk","repot","resah","retak","riset","rotan","rudal","rujak","sabar","sabun","sadar","saham","salju","salah","satru","sayur","sehat","selam","semut","sendi","senja","serat","silat","singa","sopan","suara","sulit","sumbu","suruh","susah","tabah","tabir","tahan","takut","tanah","taruh","tebal","telur","teman","tempo","tenun","tepat","tirai","tomat","tubuh","tujuh","turis","tusuk","udang","ujian","ulang","usaha","usang","walet","warna","waktu","zaman"];

const wibDateKey = () => new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
const dailyWord = () => {
  const d = wibDateKey();
  let h = 0;
  for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return WORDS[h % WORDS.length];
};

// feedback dua-tahap: hijau (posisi bener) duluan, kuning dari sisa huruf target
function feedback(guess, target) {
  const res = Array(5).fill("⬛");
  const rem = [];
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) res[i] = "🟩";
    else rem.push(target[i]);
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === "🟩") continue;
    const j = rem.indexOf(guess[i]);
    if (j > -1) { res[i] = "🟨"; rem.splice(j, 1); }
  }
  return res;
}

// sesi per user per chat — in-memory (mini game, gak butuh persist)
const sessions = new Map(); // "chat:sender" -> {word, mode, rows:[], doneToday:{}, startedAt}
const key = (m) => `${m.chat}:${m.sender}`;
const startedAt = () => Date.now();

function renderGrid(s) {
  const out = [];
  for (const r of s.rows) out.push(r.tiles.join("") + "  " + r.word);
  for (let i = s.rows.length; i < 6; i++) out.push("⬛⬛⬛⬛⬛");
  return out.join("\n");
}

async function animasiMulai(sock, jid) {
  const frames = [
    "🟩 WORDLE HARI INI\n\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛",
    "🟩 WORDLE HARI INI\n\n🟩⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛",
    "🟩 WORDLE HARI INI\n\n🟩🟩⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛",
    "🟩 WORDLE HARI INI\n\n🟩🟩🟩🟩🟩\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛",
  ];
  return editFramesAnim(sock, jid, frames, { frameMs: process.env.WORDLE_ANIM_MS !== undefined ? Number(process.env.WORDLE_ANIM_MS) : 500 });
}

async function handler(m, { sock, config }) {
  const k = key(m);
  const mode = (m.text || "").trim().toLowerCase() === "acak" ? "acak" : "harian";
  const prev = sessions.get(k);
  if (prev) {
    if ((m.text || "").trim().toLowerCase() === "stop") {
      sessions.delete(k);
      return m.reply(novaWrap("Daily Word", ["Sesi diakhiri. Sampai jumpa besok~"].join("\n")));
    }
    return m.reply(novaWrap("Daily Word", ["MASIH ADA SESI AKTIF",
      "",
      "```" + renderGrid(prev) + "```",
      "",
      `Ketik 5 huruf (a-z) buat nebak · ${m.prefix}dailywordgame stop buat keluar`].join("\n")));
  }
  const word = mode === "acak" ? WORDS[Math.floor(Math.random() * WORDS.length)] : dailyWord();
  const s = { word, mode, rows: [], startedAt: startedAt(), timer: setTimeout(() => sessions.delete(k), 600000) };
  sessions.set(k, s);
  await animasiMulai(sock, m.chat); // fallback senyap kalau channel gak dukung edit
  return m.reply(novaWrap("Daily Word", [`${mode === "harian" ? "KATA HARI INI" : "MODE LATIHAN"} — 6 KESEMPATAN`,
    "",
    "```" + renderGrid(s) + "```",
    "",
    "🟩 posisi bener · 🟨 ada tapi salah posisi · ⬛ gak ada",
    "Ketik kata 5 huruf (a-z) buat nebak",
    mode === "harian" ? `Kata sama untuk semua pemain hari ini (${wibDateKey()})` : "Kata acak, boleh main berulang"].join("\n")));
}

export async function answerHandler(m, sock) {
  const k = key(m);
  const s = sessions.get(k);
  if (!s || m.isCommand) return false;
  const guess = (m.text || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!/^[a-z]{5}$/.test(guess)) return false; // bukan tebakan → gak dikonsumsi
  clearTimeout(s.timer);
  const tiles = feedback(guess, s.word);
  s.rows.push({ word: guess, tiles });
  if (guess === s.word) {
    sessions.delete(k);
    await m.reply(novaWrap("Daily Word", ["🎉 BENAR!",
      "",
      "```" + renderGrid({ ...s }) + "```",
      "",
      `Kata: ${s.word.toUpperCase()} · Percobaan: ${s.rows.length}/6`,
      s.mode === "harian" ? "Kembali besok buat kata baru!" : `Main lagi: ${m.prefix}dailywordgame acak`].join("\n")));
    return true;
  }
  if (s.rows.length >= 6) {
    const word = s.word;
    sessions.delete(k);
    await m.reply(novaWrap("Daily Word", ["😢 KESEMPATAN HABIS",
      "",
      "```" + renderGrid({ ...s }) + "```",
      "",
      `Jawaban: ${word.toUpperCase()}`,
      s.mode === "harian" ? `Coba lagi besok, atau ${m.prefix}dailywordgame acak sekarang` : `Main lagi: ${m.prefix}dailywordgame acak`].join("\n")));
    return true;
  }
  s.timer = setTimeout(() => sessions.delete(k), 600000);
  await m.reply(novaWrap("Daily Word", [`Percobaan ${s.rows.length}/6`,
    "",
    "```" + renderGrid(s) + "```",
    "",
    "🟩 bener posisi · 🟨 salah posisi · ⬛ gak ada"].join("\n")));
  return true;
}

export { pluginConfig as config, handler };
