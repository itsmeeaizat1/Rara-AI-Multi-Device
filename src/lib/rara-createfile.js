// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-createfile.js — helper bikin file untuk TOOLS.createfile .raraagent
// (request owner 12 Sep 2026: "bisa buatkan file kyk txt, doc, xls, ja, html
// dll" — .raraagent serba bisa layaknya superagent sungguhan).
//   * parseCsvContent — parsing content CSV dari AI (baris = record, kolom
//     dipisah koma, kutip ganda buat koma dalam teks) → array rows
//   * buildWorkbook(rows, baseName) — rows jadi workbook Excel ASLI via exceljs
//   * buildWordHtml(content) — teks/HTML jadi dokumen Word word-compatible
//     (HTML bertipe .doc — Word lancar buka, pola umum bot WA)

// ── CSV parser mini (AI dikasih instruksi: baris CSV, koma dalam teks pakai
// kutip ganda "..."). Robust: kutip ganda, kutip di dalam kutip ("") escape. ──
export function parseCsvContent(content) {
  const text = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const rows = [];
  let cur = [];          // baris aktif (array cell)
  let cell = "";         // cell aktif
  let inQuotes = false;  // sedang dalam kutip ganda?
  const pushCell = () => { cur.push(cell.trim()); cell = ""; };
  const pushRow = () => { pushCell(); if (cur.some((c) => c !== "")) rows.push(cur); cur = []; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } // escape "" → "
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushCell();
    } else if (ch === "\n") {
      pushRow();
    } else {
      cell += ch;
    }
  }
  pushRow();
  return rows.filter((r) => r.length > 0);
}

// ── rows → workbook Excel ASLI (.xlsx via exceljs) ──
export async function buildWorkbook(rows, baseName = "file") {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet 1");
  ws.addRows(rows.map((r) => r.map((c) => {
    const n = Number(String(c).replace(/\./g, "").replace(",", "."));
    return /^-?\d+(\.\d+)?$/.test(String(c).replace(/\s/g, "")) && Number.isFinite(n) ? n : c;
  })));
  // header bold + freeze biar rapi
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // auto-width kolom (cap biar gak kelebaran)
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (c) => { max = Math.min(Math.max(max, String(c.value ?? "").length + 2), 40); });
    col.width = max;
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── teks → dokumen Word word-compatible (HTML bertipe .doc) ──
// Content dari AI boleh plain text (baris \n → <p>) atau HTML langsung.
export function buildWordHtml(content) {
  let raw = String(content || "").trim();
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const body = looksHtml ? raw : raw
    .split(/\n{2,}/)
    .map((p) => "<p>" + p.replace(/\n/g, "<br/>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") + "</p>")
    .join("\n");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Dokumen</title>
<style>body{font-family:Calibri,sans-serif;font-size:11pt}p{margin:0 0 8pt 0}h1,h2,h3{margin:12pt 0 6pt 0}</style></head>
<body>${body}</body></html>`;
}
