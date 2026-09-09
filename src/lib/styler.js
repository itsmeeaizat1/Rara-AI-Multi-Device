// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
// (m.reply di nova-serialize). Yang DILINDUNGI (tetap persis):
// - URL (https?://...) biar link tetap bisa diklik
// - isi code block fence (fitur kode/ASCII: tocode, tocase, css, json,
//   exec, photoascii, sudoku, mindmap, fakechat, webclone)
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};

export const toSC = (s) => String(s).replace(/[a-zA-Z]/g, (c) => SC_MAP[c.toLowerCase()] || c);

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
  const str = String(text ?? "");
  if (!str) return str;
  if (!/[a-zA-Z]/.test(str)) return str;
  // pisahkan code fence — isi fence dikirim persis (kode/grid ASCII)
  const chunks = str.split(/(```[\s\S]*?```)/g);
  return chunks
    .map((chunk) => (chunk.startsWith("```") ? chunk : scUrlSafe(chunk)))
    .join("");
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
