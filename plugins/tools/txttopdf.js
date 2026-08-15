// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "txttopdf",
  alias: ["texttopdf", "txt2pdf", "topdf", "makpdf", "txttodoc", "texttodoc", "txt2doc", "todoc", "makeword"],
  category: "tools",
  description: "Convert text ke PDF atau Word (.doc) - auto format rapih",
  usage: ".txttopdf <teks>  |  .txttopdf cv <teks>  |  .txttopdf surat <teks>  |  .txttopdf word <teks>",
  example: ".txttopdf John Doe\nSoftware Engineer\n08123456789",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// ─── PDF Config ───
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 70;
const BODY_SIZE = 11;
const LINE_H = 17;
const MAX_W = PAGE_W - MARGIN * 2;

// ─── Word wrap for pdf-lib ───
function wrapText(text, font, size, maxWidth) {
  const result = [];
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para.trim() === "") {
      result.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

// ─── Create PDF ───
async function createPDF(rawText, format) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Parse: first line = title, rest = body
  const lines = rawText.split("\n");
  let title = "";
  let bodyStart = 0;

  // Find first non-empty line as title
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      title = lines[i].trim();
      bodyStart = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStart).join("\n").trim();

  // ─── Draw title ───
  if (title) {
    const titleSize = format === "cv" ? 18 : 16;
    let titleX = MARGIN;
    if (format === "cv" || format === "surat") {
      const tw = boldFont.widthOfTextAtSize(title, titleSize);
      titleX = (PAGE_W - tw) / 2;
    }
    page.drawText(title, { x: titleX, y, size: titleSize, font: boldFont, color: rgb(0, 0, 0) });
    y -= titleSize + 8;

    // Underline for CV
    if (format === "cv") {
      const tw = boldFont.widthOfTextAtSize(title, titleSize);
      page.drawLine({
        start: { x: titleX, y: y + 4 },
        end: { x: titleX + tw, y: y + 4 },
        thickness: 1,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 15;
    } else {
      y -= 12;
    }
  }

  // ─── Draw body ───
  if (body) {
    const bodyLines = body.split("\n");
    for (let i = 0; i < bodyLines.length; i++) {
      let line = bodyLines[i];
      const trimmed = line.trim();

      // Empty line = spacing
      if (trimmed === "") {
        y -= LINE_H * 0.5;
        continue;
      }

      // Section header (starts with # or all caps short line)
      const isHeader = trimmed.startsWith("#") || (/^[A-Z][A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40);
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");

      let drawText = trimmed;
      let useFont = font;
      let useSize = BODY_SIZE;

      if (isHeader) {
        drawText = trimmed.replace(/^#\s*/, "");
        useFont = boldFont;
        useSize = 12;
        y -= 5; // extra space before header
      } else if (isBullet) {
        drawText = "  " + drawText.replace(/^[-•*]\s*/, "• ");
      }

      // Word wrap
      const wrapped = wrapText(drawText, useFont, useSize, MAX_W);

      for (const wl of wrapped) {
        // Page break check
        if (y < MARGIN + 20) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          y = PAGE_H - MARGIN;
        }

        page.drawText(wl, {
          x: MARGIN,
          y,
          size: useSize,
          font: useFont,
          color: rgb(0, 0, 0),
        });
        y -= LINE_H;
      }

      if (isHeader) y -= 3;
    }
  }

  // Footer: page numbers
  const pages = pdfDoc.getPageCount();
  for (let p = 0; p < pages; p++) {
    const pg = pdfDoc.getPages()[p];
    const footerText = "Halaman " + (p + 1) + " / " + pages;
    const fw = font.widthOfTextAtSize(footerText, 8);
    pg.drawText(footerText, {
      x: (PAGE_W - fw) / 2,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return await pdfDoc.save();
}

// ─── Create Word .doc (HTML based) ───
function createDoc(rawText, format) {
  const lines = rawText.split("\n");
  let title = "";
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      title = lines[i].trim();
      bodyStart = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  const bodyLines = body.split("\n");

  let bodyHtml = "";
  for (let line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      bodyHtml += "<br/>";
      continue;
    }

    const isHeader = trimmed.startsWith("#") || (/^[A-Z][A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40);
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");

    if (isHeader) {
      const h = trimmed.replace(/^#\s*/, "");
      bodyHtml += '<h3 style="margin:12px 0 4px 0;color:#333;">' + escapeHtml(h) + "</h3>";
    } else if (isBullet) {
      const item = escapeHtml(trimmed.replace(/^[-•*]\s*/, ""));
      bodyHtml += '<p style="margin:2px 0 2px 20px;font-size:11pt;">• ' + item + "</p>";
    } else {
      bodyHtml += '<p style="margin:2px 0;font-size:11pt;">' + escapeHtml(trimmed) + "</p>";
    }
  }

  const titleAlign = (format === "cv" || format === "surat") ? "center" : "left";
  const titleBorder = format === "cv" ? "border-bottom:2px solid #333;padding-bottom:8px;" : "";

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2.54cm; }
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #000; }
h1 { font-size: 16pt; margin: 0 0 12px 0; text-align: ${titleAlign}; ${titleBorder} }
</style>
</head>
<body>
${title ? "<h1>" + escapeHtml(title) + "</h1>" : ""}
${bodyHtml}
</body>
</html>`;

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Handler ───
async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    // Get text from quoted message if no text
    let inputText = text;
    if (!inputText && m.quoted?.text) {
      inputText = m.quoted.text.trim();
    }

    if (!inputText) {
      return sendReplyWithNav(sock, m,
        prefix + "txttopdf <teks>\n" +
        prefix + "txttopdf cv <teks>\n" +
        prefix + "txttopdf surat <teks>\n" +
        prefix + "txttopdf word <teks>\n\n" +
        "Convert text ke PDF atau Word (.doc)\n" +
        "Auto format: baris 1 = judul, sisanya = isi\n" +
        "Baris # atau ALL CAPS = section header\n" +
        "Baris - atau * = bullet point\n\n" +
        "Mode:\n" +
        "default = PDF biasa\n" +
        "cv = PDF template CV (judul center + garis)\n" +
        "surat = PDF template surat (judul center)\n" +
        "word = Word .doc format\n\n" +
        "Bisa juga reply pesan yg berisi teks\n\n" +
        "Contoh CV:\n" +
        prefix + "txttopdf cv\n" +
        "Budi Santoso\n" +
        "Software Engineer - Jakarta\n" +
        "Email: budi@email.com | 08123456789\n" +
        "\n" +
        "# PENGALAMAN\n" +
        "- Senior Dev di PT ABC (2020-2024)\n" +
        "- Junior Dev di PT XYZ (2018-2020)\n" +
        "\n" +
        "# PENDIDIKAN\n" +
        "- S1 Teknik Informatika UI (2014-2018)",
        { title: "Text to PDF/Word Converter" }
      );
    }

    // Parse mode
    let format = "plain";
    let outputType = "pdf";
    let content = inputText;

    const lowerInput = inputText.toLowerCase();
    if (lowerInput.startsWith("cv ") || lowerInput.startsWith("cv\n")) {
      format = "cv";
      content = inputText.substring(2).trim();
    } else if (lowerInput.startsWith("surat ") || lowerInput.startsWith("surat\n")) {
      format = "surat";
      content = inputText.substring(5).trim();
    } else if (lowerInput.startsWith("word ") || lowerInput.startsWith("word\n") ||
               lowerInput.startsWith("doc ") || lowerInput.startsWith("doc\n")) {
      outputType = "doc";
      content = inputText.replace(/^word\s+|^doc\s+/i, "").trim();
    }

    // Check if triggered via .txttodoc alias
    const cmdName = (m.body || "").split(/\s+/)[0].replace(prefix, "").toLowerCase();
    if (["txttodoc", "texttodoc", "txt2doc", "todoc", "makeword"].includes(cmdName)) {
      outputType = "doc";
    }

    if (!content || content.length < 2) {
      return m.reply(claraWrap("TxtToPDF", "Teks terlalu pendek!\nMinimal 2 karakter."));
    }

    if (content.length > 8000) {
      return m.reply(claraWrap("TxtToPDF", "Teks terlalu panjang!\nMaksimal 8000 karakter."));
    }

    await m.react("🕐");

    // ─── Generate file ───
    const timestamp = Date.now();
    const tmpDir = "/tmp";

    if (outputType === "pdf") {
      const pdfBytes = await createPDF(content, format);
      const fileName = "nova_" + timestamp + ".pdf";
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, pdfBytes);

      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);

      // Count pages
      const pdfDoc2 = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc2.getPageCount();

      // Count words
      const wordCount = content.split(/\s+/).length;

      await m.react("✅");
      await sock.sendMessage(m.chat, {
        document: { url: filePath },
        fileName: "dokumen_" + timestamp + ".pdf",
        mimetype: "application/pdf",
        caption: claraWrap("TxtToPDF Berhasil", [
          "Format: " + (format === "cv" ? "CV Template" : format === "surat" ? "Surat Template" : "Standard PDF"),
          "Halaman: " + pageCount,
          "Kata: " + wordCount,
          "Ukuran: " + sizeKB + " KB",
        ].join("\n")),
      });

      // Cleanup
      setTimeout(() => {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }, 60000);

    } else {
      // Word .doc
      const html = createDoc(content, format);
      const fileName = "nova_" + timestamp + ".doc";
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, html, "utf-8");

      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      const wordCount = content.split(/\s+/).length;

      await m.react("✅");
      await sock.sendMessage(m.chat, {
        document: { url: filePath },
        fileName: "dokumen_" + timestamp + ".doc",
        mimetype: "application/msword",
        caption: claraWrap("TxtToWord Berhasil", [
          "Format: Word .doc",
          "Kata: " + wordCount,
          "Ukuran: " + sizeKB + " KB",
        ].join("\n")),
      });

      // Cleanup
      setTimeout(() => {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }, 60000);
    }
  } catch (e) {
    console.error("txttopdf error:", e);
    await m.react("❌");
    return m.reply(claraWrap("TxtToPDF", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
