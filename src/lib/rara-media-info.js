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
//   → *Rara Sticker*\n\n📥 *Input:* Video\n🎨 *Filter:* crop, circle

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
 * Bangun caption info hasil pemrosesan media.
 * @param {object} p — { header, fields: [{icon, label, value}] }
 * @returns {string} — field kosong (null/undefined/"") dilewati.
 */
export function mediaInfoCaption({ header = "Rara", fields = [] } = {}) {
  const body = (fields || [])
    .filter((f) => f && f.value !== null && f.value !== undefined && String(f.value).trim() !== "")
    .map((f) => `${f.icon || "▪️"} *${f.label}:* ${String(f.value).trim()}`);
  const head = `*${String(header).trim() || "Rara"}*`;
  if (!body.length) return head;
  return `${head}\n\n${body.join("\n")}`;
}
