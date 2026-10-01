// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// styler.js — GUARD format kotak rata kiri (request owner 2026-09-07)
//
// BUG yang difix: pesan berkotak menembus border kiri karena baris lebih
// panjang dari layar — WhatsApp melipatnya sendiri TANPA prefix, jadi
// border "│" patah di tengah pesan.
//
// ATURAN GUARD: kalimat input BOLEH sepanjang apa pun (ditulis utuh di
// kode plugin — jangan dipendekkan manual), tapi SEMUA keluaran kotak
// wajib lewat 2 tahap: (1) dipotong ≤ width karakter/baris oleh
// wrapText(), (2) diawali "│ " oleh boxLeft(). Gak ada jalur lain —
// plugin yang masih nulis "│ " manual adalah pintu bocornya.
//
// GUARD SMALLCAPS TOTAL (owner 2026-09-07: "aku mau semua teksnya jadi
// smallcaps semuanya — tanpa smallcaps kayak bukan bot, dikira orang"):
// SEMUA teks keluar bot otomatis smallcaps via satu titik kunci
// (m.reply di rara-serialize). Yang DILINDUNGI (tetap persis):
// - URL (https?://...) biar link tetap bisa diklik
// - isi code block fence (fitur kode/ASCII: tocode, tocase, css, json,
//   exec, photoascii, sudoku, mindmap, fakechat, webclone)
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};

// UPDATE OWNER 1 Okt 2026: "ubah smallcaps ke teks biasa standar android
// semuanya — smallcaps gak enak dilihat bikin bosen" — toSC jadi PASSTHROUGH
// (identitas). fromSC & SC_MAP TETAP dipertahankan untuk parsing balik command
// yang user copy dari pesan bot lama yang masih smallcaps.
export const toSC = (s) => String(s);

// REVERSE smallcaps → plain: ID/command yang di-copy user dari pesan bot
// (yang udah ke-smallcaps guard global) tetap bisa di-match balik.
// q & x gak punya char smallcaps (tetap plain) → reverse lossless.
const SC_REV = Object.fromEntries(Object.entries(SC_MAP).map(([k, v]) => [v, k]));
export const fromSC = (s) =>
  String(s ?? "").replace(/[^\s]/g, (ch) => SC_REV[ch] || ch);

function scUrlSafe(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return String(text).split(urlRegex).map((p, i) => (i % 2 === 1 ? p : toSC(p))).join("");
}

/**
 * Convert seluruh teks ke smallcaps — kecuali URL & isi code fence.
 * Idempotent: teks yang sudah smallcaps tidak berubah.
 * @param {string} text
 * @returns {string}
 */
export function smallcapsText(text) {
  // PASSTHROUGH (owner 1 Okt 2026): keluaran bot kini teks biasa standar.
  // Fungsi tetap ada (dipakai rara-serialize/rara-socket) biar import gak putus.
  const str = String(text ?? "");
  return str;
  /* kode konversi lama dipertahankan di bawah untuk referensi
  if (!str) return str;
  if (!/[a-zA-Z]/.test(str)) return str;
  // pisahkan code fence — isi fence dikirim persis (kode/grid ASCII)
  const chunks = str.split(/(```[\s\S]*?```)/g);
  return chunks
    .map((chunk) => (chunk.startsWith("```") ? chunk : scUrlSafe(chunk)))
    .join("");
  */
}

// UPDATE OWNER 2026-09-07: BUNGKUS CODE BLOCK DIHAPUS — pesan berkotak
// sekarang font NORMAL (bukan monospace). Rata kiri tetap terjaga karena
// tiap baris udah di-wrap ≤ width karakter + diawali "│ ".

/**
 * Potong teks per kata, TIDAK ada baris melebihi `width` karakter.
 * Kalimat panjang TIDAK dipendekkan isinya — tampilannya saja yang
 * dipotong per baris. Kata super panjang (URL dsb) dipotong paksa.
 *
 * @param {string} text - Bebas panjang, boleh multi-baris (\n).
 * @param {number} [width=30] - Maks karakter per baris.
 * @returns {string[]} Baris-baris hasil potongan.
 */
export function wrapText(text, width = 30) {
  const out = [];
  for (const raw of String(text).split("\n")) {
    let line = "";
    for (const word of raw.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (w.length > width) {
        // kata super panjang (URL dll) → potong paksa
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(w.slice(0, width));
        w = w.slice(width);
      }
      if ((line + " " + w).trim().length > width) {
        out.push(line.trim());
        line = w;
      } else {
        line = line ? line + " " + w : w;
      }
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}

/**
 * Kotak rata kiri TERJAMIN: header "┌─「 title 」", SEMUA baris hasil
 * wrapText diawali "│ ", footer "└─「 • 」".
 *
 * @param {string} title - Judul kotak.
 * @param {string} content - Isi bebas panjang (multi-baris via \n).
 * @param {number} [width=30] - Maks karakter per baris.
 * @returns {string} Kotak siap dikirim (font normal, tanpa code block).
 */
export function boxLeft(title, content, width = 30) {
  // REWORK 2026-09-07 (owner: "hapus juga di menu usage semua fitur dan
  // replynya hapus garisnya") — TANPA garis: header 「 title 」, isi polos
  // tanpa prefix │, tanpa footer └─, tanpa wrap 30-char (gak ada border
  // yang bisa putus, WhatsApp wrap natural). Semua plugin yang berkotak
  // via boxLeft/boxMessage otomatis ke format baru tanpa diedit satu-satu.
  return [`「 ${title} 」`, ...String(content ?? "").split("\n")].join("\n");
}

/**
 * Pesan berkotak siap kirim — boxLeft TANPA code block (font normal,
 * bukan monospace — request owner 2026-09-07). Border tetap aman karena
 * wrapText udah motong tiap baris ≤ width karakter. INI SATU-SATUNYA
 * cara resmi ngirim pesan berkotak dari plugin.
 *
 * @param {string} title
 * @param {string} content
 * @param {number} [width=30]
 * @returns {string} "┌─「 ... 」\n│ ...\n└─「 • 」"
 */
export function boxMessage(title, content, width = 30) {
  return boxLeft(title, content, width);
}

/**
 * SANITIZER FORMAT PERMANEN (fix 18 Sep 2026 — report owner: pesan
 * ".bot on" muncul literal "\n" sebagai TEKS, bukan baris baru — akar:
 * salah satu plugin nge-join pakai dua-backslash-n). Ini kelas bug yang
 * gampang kejadian lagi di plugin lain (typo backslash, JSON round-trip,
 * dsb) — dipasang SEKALI di titik terakhir sebelum kirim (m.reply +
 * sock.sendMessage terpusat) biar SEMUA pesan bot, siapa pun yang nulis
 * kodenya, otomatis bersih:
 * - kombinasi backslash+r+backslash+n / backslash+n / backslash+t LITERAL
 *   (karakter backslash+huruf, bukan whitespace sungguhan) → dikembalikan
 *   jadi baris baru / spasi asli
 * - spasi nyangkut di ujung baris → dibuang
 * - 3+ baris kosong berurutan → dirapatkan jadi maks 1 baris kosong
 * - trim di awal/akhir
 * - ISI CODE FENCE (```...```) DIKIRIM PERSIS — fitur kode (tocode, json,
 *   exec, dll) yang memang menampilkan literal backslash-n sebagai materi
 *   belajar tidak rusak. Konsisten dengan proteksi smallcapsText.
 * Aman dipanggil berulang (idempotent) — teks yang udah bersih gak kena
 * efek apa pun.
 * @param {*} text
 * @returns {*} teks sudah bersih (non-string dibalikin apa adanya)
 */
export function formatGuard(text) {
  if (typeof text !== "string" || !text) return text;
  const BS = String.fromCharCode(92); // backslash literal
  // pola regex untuk TEKS literal "backslash+r backslash+n" dst —
  // BUKAN CR/LF asli: di sumber regex, backslash ganda = backslash literal
  const reCRLF = new RegExp(BS + BS + "r" + BS + BS + "n", "g");
  const reNL = new RegExp(BS + BS + "n", "g");
  const reTab = new RegExp(BS + BS + "t", "g");

  const NL = String.fromCharCode(10); // newline sungguhan sebagai hasil replace
  // RATA KIRI (owner 20 Sep 2026: "cek fitur lain yang gak rata kiri, di
  // awalnya malah ada spasi"): buang spasi/tab di AWAL tiap baris biar semua
  // reply flush-left. PENGECUALIAN: baris yang mengandung karakter ART
  // (box-drawing ╭│═ dst, contoh hangman) butuh indentasi visual — dilewati.
  // Isi code fence sudah terproteksi lewat split chunks di bawah.
  const ART_CHARS = /[\u2500-\u257F\u2580-\u259F\u256D-\u2570\u02C2\u02C3\u02C5\/\\^]/;
  const dedentLine = (line) => (ART_CHARS.test(line) ? line : line.replace(/^[ \t]+/, ""));
  const cleanChunk = (chunk) =>
    chunk
      .replace(reCRLF, NL)
      .replace(reNL, NL)
      .replace(reTab, "  ")
      .replace(/[ \t]+\n/g, NL)
      .split(NL)
      .map(dedentLine)
      .join(NL)
      .replace(/\n{3,}/g, NL + NL);

  // isi code fence dikirim persis — sama kayak proteksi smallcapsText
  const chunks = text.split(/(```[\s\S]*?```)/g);
  return chunks
    .map((chunk) => (chunk.startsWith("```") ? chunk : cleanChunk(chunk)))
    .join("")
    // trim TANPA makan indent baris pertama (art hangman dll butuh spasi
    // awal baris 1) — cukup buang newline kosong di awal & semua spasi ekor.
    .replace(/^\n+/, "")
    .replace(/[ \t\n]+$/, "");
}
