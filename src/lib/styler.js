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
  return [
    `┌─「 ${title} 」`,
    ...wrapText(content, width).map((l) => "│ " + l), // ← guard: SEMUA baris wajib lewat sini
    `└─「 • 」`,
  ].join("\n");
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
