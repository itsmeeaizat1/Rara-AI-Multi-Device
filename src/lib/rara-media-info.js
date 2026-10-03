// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-media-info.js — SATU PINTU caption hasil fitur pemroses media
// (stiker / converter / maker AI / tools), request owner 19-20 Sep 2026:
// "apakah fitur lain bisa dibuat field juga kyk stiker, convert fitur kyk
// tools dan makes sesuai field yang sesuai".
// Pola sama kayak downloader (rara-tiktok-format): *Header* → baris berlabel
// emoji → field kosong otomatis dilewati.
//
//   mediaInfoCaption({ header: "Rara Sticker", fields: [
//     { icon: "📥", label: "Input",  value: "Video" },
//     { icon: "🎨", label: "Filter", value: "crop, circle" },
//   ] })
//   → 「 ✦ STICKER ✦ 」 / • Input  : Video / • Filter : crop, circle

/**
 * Bytes → "345.2 KB" / "1.2 MB" / "2.4 GB" (1 desimal, KB ke bawah).
 */
export function fmtBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Satu baris info ringkas untuk DITEMPEL ke caption yang sudah ada (mis. GIF reaksi anime), tanpa pesan kedua.
 * Request owner 3 Okt 2026: GIF reaksi cukup "jenis gambar/gif + ukuran". Field kosong dilewati.
 * @param {object} p — { kind: "GIF"|"Gambar"|..., bytes?: number, extra?: string }
 * @returns {string} contoh "GIF · 240.5 KB" (kosong bila tak ada data)
 */
export function mediaInfoLine({ kind = "", bytes = 0, extra = "" } = {}) {
  return [kind, fmtBytes(bytes), extra]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" · ");
}

/**
 * Bangun caption info hasil pemrosesan media.
 * REVISI OWNER 3 Okt 2026: balik desain lama + field lengkap per fitur — judul 「 ✦ HEADER ✦ 」,
 * baris "• Label : nilai" rata (teks biasa, TANPA *bold* / emoji ikon). Parameter `icon` tetap
 * DITERIMA (kompat 20 pemanggil) tapi diabaikan. Header "Rara X" -> "X" (brand sudah di footer bot).
 * Field kosong (null/undefined/"") dilewati; semua kosong -> hanya judul.
 * @param {object} p — { header, fields: [{label, value}], groups?: [{title, fields}] }
 *   `groups` (opsional) = beberapa kelompok berjudul; `fields` = kelompok tunggal "Detail".
 * @returns {string}
 */
export function mediaInfoCaption({ header = "Rara", fields = [], groups = null } = {}) {
  const clean = (list) => (list || [])
    .filter((f) => f && f.value !== null && f.value !== undefined && String(f.value).trim() !== "")
    .map((f) => [String(f.label || "").trim(), String(f.value).trim()])
    .filter(([l]) => l);
  const block = (title, rows) => {
    if (!rows.length) return "";
    const w = Math.max(...rows.map(([l]) => l.length));
    return (title ? `「 ✦ ${title} ✦ 」\n` : "") + rows.map(([l, v]) => `• ${l.padEnd(w)} : ${v}`).join("\n");
  };
  const name = String(header).trim().replace(/^rara\s+/i, "") || "Rara";
  const head = `「 ✦ ${name.toUpperCase()} ✦ 」`;
  const blocks = Array.isArray(groups) && groups.length
    ? groups.map((g) => block(g.title, clean(g.fields)))
    : [block("", clean(fields))]; // satu kelompok -> tanpa judul tambahan, langsung di bawah header
  const body = blocks.filter(Boolean);
  return body.length ? `${head}\n\n${body.join("\n\n")}` : head;
}
