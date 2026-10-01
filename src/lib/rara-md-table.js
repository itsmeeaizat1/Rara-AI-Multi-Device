// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ─────────────────────────────────────────────────────────────────
// rara-md-table.js — parser pembersih markdown TABLE dari jawaban AI
//
// FIX OWNER 20 Sep 2026: "ketika minta carikan informasi ke AI, kadang
// muncul garis | atau |- di kiri sebagian baris paragraf. Coba bikin garis
// itu gak muncul di awal kalimat kiri, pakai parse biar garisnya gak kebuat."
//
// AKAR: model AI kadang jawab pakai markdown table:
//   | Judul | Sumber | Tanggal |
//   |-------|--------|---------|
//   | Tsunami | Kompas | 20 Sep |
// WhatsApp gak render markdown → baris itu muncul MENTAH dengan garis |
// dan |- di awal tiap baris (keliatan acak-acakan di kiri paragraf).
//
// FIX: stripMarkdownTables(text) —
//   1. Blok table asli (ada baris separator |---|) → tiap row jadi
//      bullet rapi: "• Judul — Sumber — Tanggal"
//   2. Baris table tanpa separator → cukup buang pipe kiri/kanan
//   3. Baris sampah pipe-only (| atau |- atau |---| sendirian) → dibuang
//   4. Aman buat kode: di dalam code fence ``` gak disentuh, dan pipe
//      di TENGAH baris (contoh shell `ls | grep`) gak pernah diubah.
// ─────────────────────────────────────────────────────────────────

/** baris yang mulai dengan pipe & punya >=2 pipe = kandidat row table */
function isPipeRow(line) {
  const t = String(line).trim();
  return t.startsWith("|") && (t.match(/\|/g) || []).length >= 2;
}

/** baris yang cuma berisi pipe/dash/colon/spasi = sampah separator (|, |-, |---|) */
function isPipeJunk(line) {
  return /^\s*\|[\s|:\-]*$/.test(String(line));
}

/** baris separator table beneran: semua isi cuma - dan : */
function isSepRow(line) {
  const t = String(line).trim();
  if (!t.includes("-") || !t.includes("|")) return false;
  const cells = splitCells(t);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

/** potong baris jadi sel, buang pipe tepi */
function splitCells(row) {
  return String(row)
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
}

/**
 * Pembersih markdown table dari teks jawaban AI.
 * @param {string} text - jawaban AI mentah
 * @returns {string} teks tanpa baris pipe-table
 */
export function stripMarkdownTables(text) {
  if (typeof text !== "string" || !text.includes("|")) return text;
  const lines = text.split("\n");
  const out = [];
  let inFence = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // code fence ``` ... ``` → verbatim, jangan disentuh
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      i++;
      continue;
    }
    if (inFence) {
      out.push(line);
      i++;
      continue;
    }

    // sampah pipe sendirian (| atau |- atau |---|) → buang
    if (isPipeJunk(line)) {
      i++;
      continue;
    }

    if (!isPipeRow(line)) {
      // baris mulai pipe SATU (| teks...) — buang pipe tepinya doang,
      // isi paragraf tetap utuh (gak ada garis di kiri lagi)
      const t = line.trim();
      if (t.startsWith("|") && t.length > 1) {
        const cleaned = t.replace(/^\|\s*/, "").replace(/\s*\|$/, "").trim();
        out.push(cleaned);
        i++;
        continue;
      }
      out.push(line);
      i++;
      continue;
    }

    // kumpulkan blok baris-pipe berurutan
    const block = [];
    let j = i;
    while (j < lines.length && isPipeRow(lines[j])) {
      block.push(lines[j]);
      j++;
    }

    const hasSep = block.some(isSepRow);
    if (hasSep) {
      // table beneran → tiap row jadi bullet "• sel1 — sel2 — sel3"
      for (const row of block) {
        if (isSepRow(row) || isPipeJunk(row)) continue;
        const cells = splitCells(row);
        if (cells.length) out.push("• " + cells.join(" — "));
      }
    } else {
      // bukan table utuh → cukup buang pipe tepi kiri/kanan
      for (const row of block) {
        const cleaned = String(row)
          .trim()
          .replace(/^\|\s*/, "")
          .replace(/\s*\|$/, "")
          .trim();
        if (cleaned) out.push(cleaned);
      }
    }
    i = j;
  }

  return out.join("\n");
}

export default stripMarkdownTables;
