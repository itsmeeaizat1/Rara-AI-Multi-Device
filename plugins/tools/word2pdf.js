// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import mammoth from "mammoth";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

function wrapText(text, font, size, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) current = test;
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

async function convertDocxToPdf(buffer) {
  // Extract raw text from docx
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value || "";

  if (!rawText || rawText.trim().length === 0) {
    throw new Error("Dokumen .docx kosong atau tidak ada teks yang bisa diekstrak.");
  }

  // Also try HTML extraction for better formatting
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value || "";

  // Parse HTML to detect bold/headings/lists
  const lines = [];
  const htmlLines = html.split("\n");

  for (const hline of htmlLines) {
    // Detect headings
    const h1Match = hline.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h2Match = hline.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const h3Match = hline.match(/<h3[^>]*>(.*?)<\/h3>/i);
    const pMatch = hline.match(/<p[^>]*>(.*?)<\/p>/i);
    const liMatch = hline.match(/<li[^>]*>(.*?)<\/li>/i);

    if (h1Match) {
      lines.push({ text: h1Match[1].replace(/<[^>]+>/g, "").trim(), type: "h1" });
    } else if (h2Match) {
      lines.push({ text: h2Match[1].replace(/<[^>]+>/g, "").trim(), type: "h2" });
    } else if (h3Match) {
      lines.push({ text: h3Match[1].replace(/<[^>]+>/g, "").trim(), type: "h3" });
    } else if (liMatch) {
      lines.push({ text: "- " + liMatch[1].replace(/<[^>]+>/g, "").trim(), type: "li" });
    } else if (pMatch) {
      const clean = pMatch[1].replace(/<[^>]+>/g, "").trim();
      if (clean) lines.push({ text: clean, type: "p" });
    }
  }

  // Fallback: if HTML parsing yielded nothing useful, use raw text
  if (lines.length === 0) {
    for (const line of rawText.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) lines.push({ text: trimmed, type: "p" });
      else lines.push({ text: "", type: "empty" });
    }
  }

  // Render to PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageW = 595.28, pageH = 841.89, margin = 56.7;
  const maxWidth = pageW - margin * 2;
  let y = pageH - margin;
  let page = pdfDoc.addPage([pageW, pageH]);

  for (const item of lines) {
    const text = item.text;
    if (text.trim() === "") { y -= 10; continue; }

    let useFont = font;
    let fontSize = 11;
    let lineHeight = 16;
    let isBold = false;

    if (item.type === "h1") { useFont = boldFont; fontSize = 16; lineHeight = 22; isBold = true; }
    else if (item.type === "h2") { useFont = boldFont; fontSize = 14; lineHeight = 19; isBold = true; }
    else if (item.type === "h3") { useFont = boldFont; fontSize = 12; lineHeight = 17; isBold = true; }
    else { useFont = font; fontSize = 11; lineHeight = 16; }

    const wrapped = wrapText(text, useFont, fontSize, maxWidth);

    for (const wl of wrapped) {
      if (y < margin + lineHeight) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
      page.drawText(wl, { x: margin, y, size: fontSize, font: useFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
    y -= 4;
  }

  const pdfBytes = await pdfDoc.save();
  return { pdfBuffer: Buffer.from(pdfBytes), textPreview: rawText };
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  const isDocx = m.isDocument || (m.quoted && m.quoted.type === "documentMessage");
  const docMime = m.quoted?.msg?.mimetype || m.msg?.mimetype || "";
  const isDocxFile = docMime.includes("word") || docMime.includes("officedocument") || docMime.includes("msword");

  if (!isDocx && !isDocxFile) {
    const help = claraWrap("Word2Pdf", [
      `  ┊  ➶ Converter .docx ke PDF`,
      ``,
      `  ┊  ➶ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  Reply file .docx, ketik:`,
      `  ${prefix}word2pdf`,
      ``,
      `  ┊  ➶ Auto-detect heading, bullet, paragraf`,
      `  ┊  ➶ Hasil: PDF siap print`,
      ``,
      `  ┊  ➶ *ꜰᴏʀᴍᴀᴛ ᴅɪᴅᴜᴋᴜɴɢ:* .docx (Word 2007+)`,
      `  ┊  ➶ .doc (Word lama) belum didukung`,
    ].join("\n"));
    return m.reply( help, "word2pdf");
  }

  await m.react("🕒");
  m.reply(claraWrap("Word2Pdf", "  ┊  ➶ Konversi .docx ke PDF..."));

  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) buffer = await m.quoted.download();
    else buffer = await m.download();

    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("Word2Pdf", "❌ Gagal download file .docx"));
    }

    const { pdfBuffer, textPreview } = await convertDocxToPdf(buffer);
    const filename = `converted_${Date.now()}.pdf`;

    await sock.sendMessage(m.chat, {
      document: pdfBuffer,
      mimetype: "application/pdf",
      fileName: filename,
    }, { quoted: m });

    // Text preview
    let preview = textPreview.trim();
    if (preview.length > 1500) preview = preview.substring(0, 1500) + "\n\n... (lihat PDF untuk lengkap)";
    await m.reply(claraWrap("Word2Pdf — Preview", preview));

    await m.react("🐣");
  } catch (error) {
    console.error("word2pdf error:", error);
    m.reply(claraWrap("Word2Pdf", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
    await m.react("🐣");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "word2pdf",
  alias: ["word2pdf", "docx2pdf", "doctopdf", "wordtopdf"],
  category: "tools",
  description: "Converter file .docx (Word) ke PDF dengan formatting",
  usage: ".word2pdf (reply file .docx)",
  example: ".word2pdf",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

export { handler, pluginConfig, pluginConfig as default };
