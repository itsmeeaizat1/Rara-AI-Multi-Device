// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "chord",
  alias: ["chord"],
  category: "smart",
  description: "Cari chord & lirik lagu, support transpose key",
  usage: ".chord <judul lagu>",
  example: ".chord diam diam rindu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const CHORD_DB = [
  { title: "Diam Diam Rindu", artist: "SManiak", key: "C", chords: "C G Am Em F C G C\nC G Am Em F C G C\n[Reff] F G Em Am Dm G C", lyrics: "Diam diam aku rindu kamu\nDiam diam ingin peluk kamu\nReff: Oh sayangku, datanglah padaku" },
  { title: "Buku Ini", artist: "Yura Yunita", key: "G", chords: "G D Em Bm C G Am D\nG D Em Bm C G Am D\n[Reff] C D G Bm Em C D G", lyrics: "Buku ini terbuka di halaman pertama\nCerita kita berawal dari sini\nReff: Dan bila nanti ku tak lagi di sini" },
  { title: "Lathi", artist: "Weird Genius", key: "Am", chords: "Am F C G\nAm F C G\n[Reff] F G Am C Dm E Am", lyrics: "Wes ono kadung tresno tresno\nKang dudu miliho wes kari peson\nReff: Tak selak aku mundur" },
  { title: "Tetap Dalam Jiwa", artist: "Judika", key: "D", chords: "D A Bm F#m G D A D\nD A Bm F#m G D A A7\n[Reff] G A D Bm G A D", lyrics: "Ku tetap dalam jiwa\nKisah kita berdua\nReff: Tak akan pernah hilang" },
  { title: "Sunset di Tanah Antri", artist: "Kunto Aji", key: "E", chords: "E B C#m G#m A E B B\nE B C#m G#m A E B B\n[Reff] A B E G#m C#m A B E", lyrics: "Sunset di tanah antri\nKita masih menunggu\nReff: Kapan pasti kita pulang" },
];

const SHARP_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CHORD_RE = /\b(C#|D#|F#|G#|A#|C|D|E|F|G|A|B|Db|Eb|Gb|Ab|Bb)(m|maj7|m7|7|sus2|sus4|dim|aug|add9|6|9)?\b/g;

function transposeChord(chord, semitones) {
  const idx = SHARP_KEYS.indexOf(chord);
  if (idx === -1) return chord;
  const newIdx = (idx + semitones + 12) % 12;
  return SHARP_KEYS[newIdx];
}

function transposeLine(line, semitones) {
  if (semitones === 0) return line;
  return line.replace(CHORD_RE, (match) => transposeChord(match, semitones));
}

function transposeText(text, semitones) {
  return text.split("\n").map(line => transposeLine(line, semitones)).join("\n");
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const query = args.slice(2).join(" ").trim().toLowerCase();

  if (sub === "transpose" || sub === "naik" || sub === "turun") {
    const song = CHORD_DB.find(s => s.title.toLowerCase().includes(query));
    if (!song) {
      await m.reply(novaWrap("Chord", "Lagu tidak ditemukan.\nKetik " + prefix + "chord list untuk daftar lagu."));
      return { handled: true };
    }
    const semitones = parseInt(args[args.length - 1] || "0", 10);
    if (isNaN(semitones) || semitones < -6 || semitones > 6) {
      await m.reply(novaWrap("Chord", "Semitones: -6 sampai +6\n💡 *Contoh:* " + prefix + "chord transpose " + song.title.toLowerCase().split(" ")[0] + " 2"));
      return { handled: true };
    }
    const transposedChords = transposeText(song.chords, semitones);
    await m.reply(novaWrap("Chord: " + song.title, [
      "Artist: " + song.artist,
      "Original Key: " + song.key,
      "Transpose: " + (semitones >= 0 ? "+" : "") + semitones,
      "",
      "Chords:",
      transposedChords,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar") {
    const list = CHORD_DB.map((s, i) => (i + 1) + ". " + s.title + " - " + s.artist + " (Key: " + s.key + ")").join("\n");
    await m.reply(novaWrap("Chord List", "Lagu tersedia:\n" + list));
    return { handled: true };
  }

  // Search by title
  const search = (sub + " " + query).trim().toLowerCase();
  const song = CHORD_DB.find(s => s.title.toLowerCase().includes(search) || s.title.toLowerCase().includes(query)) || CHORD_DB.find(s => s.title.toLowerCase().includes(sub));
  if (song) {
    await m.reply(novaWrap("Chord: " + song.title, [
      "Artist: " + song.artist,
      "Key: " + song.key,
      "",
      "Lirik:",
      song.lyrics,
      "",
      "Chords:",
      song.chords,
      "",
      "Transpose: " + prefix + "chord transpose " + song.title.toLowerCase().split(" ").slice(0, 2).join(" ") + " <semitone -6 s/d +6>",
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(novaWrap("Chord", [
    "CHORD & LIRIK LAGU",
    "",
    "Cara pakai:",
    prefix + "chord <judul lagu> - cari chord",
    prefix + "chord list - daftar lagu",
    prefix + "chord transpose <judul> <semitone> - pindah key",
    "",
    "Transpose: -6 sampai +6 semitone",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
