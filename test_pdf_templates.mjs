import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 70;
const MAX_W = PAGE_W - MARGIN * 2;

const CV_TEMPLATES = {
  1: { name: "Professional", accent: "#000080", light: "#000050" },
  2: { name: "Modern Sidebar", accent: "#1a5276", light: "#d4e6f1" },
  3: { name: "Creative Header", accent: "#8e44ad", light: "#f5eef8" },
  4: { name: "Minimalist", accent: "#333333", light: "#666666" },
  5: { name: "Executive", accent: "#1c3d3a", light: "#c0c0c0" },
};

function parseColor(input) {
  if (!input) return [0, 0, 0];
  if (/^#[0-9a-f]{6}$/i.test(input)) {
    return [parseInt(input.substring(1, 3), 16) / 255, parseInt(input.substring(3, 5), 16) / 255, parseInt(input.substring(5, 7), 16) / 255];
  }
  if (/^#[0-9a-f]{3}$/i.test(input)) {
    return [parseInt(input[1] + input[1], 16) / 255, parseInt(input[2] + input[2], 16) / 255, parseInt(input[3] + input[3], 16) / 255];
  }
  return null;
}

function parseCVContent(rawText) {
  const lines = rawText.split("\n").map(l => l.trim());
  const cvData = { name: "", position: "", contact: "", sections: [] };
  let idx = 0;
  while (idx < lines.length && !lines[idx]) idx++;
  if (idx < lines.length) cvData.name = lines[idx++];
  while (idx < lines.length && !lines[idx]) idx++;
  if (idx < lines.length && !lines[idx].startsWith("#")) cvData.position = lines[idx++];
  while (idx < lines.length && !lines[idx]) idx++;
  if (idx < lines.length && !lines[idx].startsWith("#")) cvData.contact = lines[idx++];
  let currentSection = null;
  for (; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line) continue;
    if (line.startsWith("#")) {
      if (currentSection) cvData.sections.push(currentSection);
      currentSection = { header: line.replace(/^#\s*/, ""), items: [] };
    } else if (currentSection) {
      if (line.startsWith("- ") || line.startsWith("• ")) {
        currentSection.items.push({ type: "bullet", text: line.replace(/^[-•*]\s*/, "") });
      } else {
        const prevItem = currentSection.items[currentSection.items.length - 1];
        if (prevItem && prevItem.type === "bullet") {
          currentSection.items.push({ type: "sub", text: line });
        } else {
          currentSection.items.push({ type: "text", text: line });
        }
      }
    }
  }
  if (currentSection) cvData.sections.push(currentSection);
  return cvData;
}

function wrapText(text, font, size, maxWidth) {
  const result = [];
  for (const para of text.split("\n")) {
    if (para.trim() === "") { result.push(""); continue; }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        result.push(line); line = word;
      } else { line = test; }
    }
    if (line) result.push(line);
  }
  return result;
}

async function renderCV_PDF(rawText, tpl, opts, pdfDoc, font, boldFont) {
  const cv = parseCVContent(rawText);
  const scheme = CV_TEMPLATES[tpl] || CV_TEMPLATES[1];
  const accent = parseColor(scheme.accent) || [0, 0, 0.5];
  const accentLight = parseColor(scheme.light) || [0.8, 0.8, 0.9];
  
  const bodySize = 10;
  const headerSize = 11;
  const nameSize = 20;
  const lineH = 15;
  
  function newPage() {
    const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
    return p;
  }
  
  function drawText(page, text, x, y, size, f, color) {
    const wrapped = wrapText(text, f, size, PAGE_W - MARGIN * 2);
    for (const w of wrapped) {
      page.drawText(w, { x, y, size, font: f, color: rgb(color[0], color[1], color[2]) });
      y -= lineH;
    }
    return y;
  }
  
  function drawWrapped(page, text, x, y, size, f, color, maxW) {
    const wrapped = wrapText(text, f, size, maxW);
    for (const w of wrapped) {
      if (y < MARGIN + 20) { page = newPage(); y = PAGE_H - MARGIN; }
      page.drawText(w, { x, y, size, font: f, color: rgb(color[0], color[1], color[2]) });
      y -= lineH;
    }
    return { page, y };
  }
  
  const black = [0, 0, 0];
  const gray = [0.3, 0.3, 0.3];
  const grayLight = [0.5, 0.5, 0.5];
  const white = [1, 1, 1];
  
  if (tpl === 1) {
    // === TEMPLATE 1: PROFESSIONAL ===
    let page = newPage();
    let y = PAGE_H - MARGIN;
    const contentW = MAX_W;
    
    // Name centered + underline
    if (cv.name) {
      const tw = boldFont.widthOfTextAtSize(cv.name, nameSize);
      const x = (PAGE_W - tw) / 2;
      page.drawText(cv.name, { x, y, size: nameSize, font: boldFont, color: rgb(accent[0], accent[1], accent[2]) });
      y -= nameSize + 4;
      page.drawLine({ start: { x, y: y + 2 }, end: { x: x + tw, y: y + 2 }, thickness: 1.5, color: rgb(accent[0], accent[1], accent[2]) });
      y -= 18;
    }
    if (cv.position) { const tw = font.widthOfTextAtSize(cv.position, bodySize); page.drawText(cv.position, { x: (PAGE_W - tw) / 2, y, size: bodySize, font, color: rgb(gray[0], gray[1], gray[2]) }); y -= 16; }
    if (cv.contact) { const tw = font.widthOfTextAtSize(cv.contact, bodySize - 1); page.drawText(cv.contact, { x: (PAGE_W - tw) / 2, y, size: bodySize - 1, font, color: rgb(grayLight[0], grayLight[1], grayLight[2]) }); y -= 25; }
    
    for (const sec of cv.sections) {
      page.drawText(sec.header.toUpperCase(), { x: MARGIN, y, size: headerSize, font: boldFont, color: rgb(accent[0], accent[1], accent[2]) });
      y -= 3;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= 18;
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          // Draw dot
          page.drawCircle({ x: MARGIN + 3, y: y - 2, size: 1.5, color: rgb(accent[0], accent[1], accent[2]) });
          let res = drawWrapped(page, item.text, MARGIN + 12, y, bodySize, font, black, contentW - 12);
          page = res.page; y = res.y;
        } else if (item.type === "sub") {
          let res = drawWrapped(page, "• " + item.text, MARGIN + 12, y, bodySize - 1, font, grayLight, contentW - 12);
          page = res.page; y = res.y;
        } else {
          let res = drawWrapped(page, item.text, MARGIN + 12, y, bodySize, font, black, contentW - 12);
          page = res.page; y = res.y;
        }
      }
      y -= 8;
    }
  }
  
  else if (tpl === 2) {
    // === TEMPLATE 2: MODERN SIDEBAR ===
    let page = newPage();
    const sideW = 180;
    const mainX = sideW + 15;
    const mainW = PAGE_W - mainX - MARGIN;
    
    // Sidebar background (draw on all pages - but we start with 1 page)
    page.drawRectangle({ x: 0, y: 0, width: sideW, height: PAGE_H, color: rgb(accent[0], accent[1], accent[2]) });
    
    let sy = PAGE_H - MARGIN;
    const sideMargin = 15;
    
    // Name
    if (cv.name) {
      page.drawText(cv.name, { x: sideMargin, y: sy, size: 14, font: boldFont, color: rgb(1, 1, 1) });
      sy -= 20;
    }
    if (cv.position) {
      page.drawText(cv.position, { x: sideMargin, y: sy, size: 9, font, color: rgb(accentLight[0], accentLight[1], accentLight[2]) });
      sy -= 25;
    }
    
    // Contact
    if (cv.contact) {
      page.drawText("KONTAK", { x: sideMargin, y: sy, size: 8, font: boldFont, color: rgb(1, 1, 1) });
      sy -= 3;
      page.drawLine({ start: { x: sideMargin, y: sy }, end: { x: sideW - sideMargin, y: sy }, thickness: 0.5, color: rgb(0.6, 0.6, 0.8) });
      sy -= 14;
      let res = drawWrapped(page, cv.contact, sideMargin, sy, 8, font, accentLight, sideW - sideMargin * 2);
      page = res.page; sy = res.y;
      sy -= 15;
    }
    
    // Skills in sidebar
    const skillSec = cv.sections.find(s => s.header.toUpperCase().includes("SKILL") || s.header.toUpperCase().includes("KEAHLIAN"));
    if (skillSec) {
      // Re-draw sidebar on new page if needed
      if (sy < MARGIN + 50) { page = newPage(); page.drawRectangle({ x: 0, y: 0, width: sideW, height: PAGE_H, color: rgb(accent[0], accent[1], accent[2]) }); sy = PAGE_H - MARGIN; }
      page.drawText("SKILL", { x: sideMargin, y: sy, size: 8, font: boldFont, color: rgb(1, 1, 1) });
      sy -= 3;
      page.drawLine({ start: { x: sideMargin, y: sy }, end: { x: sideW - sideMargin, y: sy }, thickness: 0.5, color: rgb(0.6, 0.6, 0.8) });
      sy -= 14;
      for (const item of skillSec.items) {
        if (item.type === "bullet") {
          page.drawText("• " + item.text, { x: sideMargin, y: sy, size: 8, font, color: rgb(accentLight[0], accentLight[1], accentLight[2]) });
          sy -= 13;
        }
      }
    }
    
    // Main area
    let my = PAGE_H - MARGIN;
    for (const sec of cv.sections) {
      if (sec.header.toUpperCase().includes("SKILL") || sec.header.toUpperCase().includes("KEAHLIAN")) continue;
      
      page.drawText(sec.header.toUpperCase(), { x: mainX, y: my, size: headerSize, font: boldFont, color: rgb(accent[0], accent[1], accent[2]) });
      my -= 3;
      page.drawLine({ start: { x: mainX, y: my }, end: { x: mainX + mainW, y: my }, thickness: 0.5, color: rgb(accentLight[0], accentLight[1], accentLight[2]) });
      my -= 18;
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          page.drawCircle({ x: mainX + 3, y: my - 2, size: 1.5, color: rgb(accent[0], accent[1], accent[2]) });
          let res = drawWrapped(page, item.text, mainX + 12, my, bodySize, font, black, mainW - 12);
          page = res.page; 
          if (res.page !== page) { page = res.page; page.drawRectangle({ x: 0, y: 0, width: sideW, height: PAGE_H, color: rgb(accent[0], accent[1], accent[2]) }); }
          my = res.y;
        } else if (item.type === "sub") {
          let res = drawWrapped(page, "• " + item.text, mainX + 12, my, bodySize - 1, font, grayLight, mainW - 12);
          page = res.page;
          if (res.page !== page) { page = res.page; page.drawRectangle({ x: 0, y: 0, width: sideW, height: PAGE_H, color: rgb(accent[0], accent[1], accent[2]) }); }
          my = res.y;
        } else {
          let res = drawWrapped(page, item.text, mainX + 12, my, bodySize, font, black, mainW - 12);
          page = res.page;
          if (res.page !== page) { page = res.page; page.drawRectangle({ x: 0, y: 0, width: sideW, height: PAGE_H, color: rgb(accent[0], accent[1], accent[2]) }); }
          my = res.y;
        }
      }
      my -= 12;
    }
  }
  
  else if (tpl === 3) {
    // === TEMPLATE 3: CREATIVE HEADER ===
    let page = newPage();
    const headerH = 110;
    
    // Header band
    page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: rgb(accent[0], accent[1], accent[2]) });
    
    let hy = PAGE_H - 35;
    if (cv.name) { const tw = boldFont.widthOfTextAtSize(cv.name, nameSize); page.drawText(cv.name, { x: (PAGE_W - tw) / 2, y: hy, size: nameSize, font: boldFont, color: rgb(1, 1, 1) }); hy -= 22; }
    if (cv.position) { const tw = font.widthOfTextAtSize(cv.position, bodySize); page.drawText(cv.position, { x: (PAGE_W - tw) / 2, y: hy, size: bodySize, font, color: rgb(0.9, 0.9, 0.9) }); hy -= 15; }
    if (cv.contact) { const tw = font.widthOfTextAtSize(cv.contact, bodySize - 1); page.drawText(cv.contact, { x: (PAGE_W - tw) / 2, y: hy, size: bodySize - 1, font, color: rgb(0.8, 0.8, 0.8) }); }
    
    let y = PAGE_H - headerH - 25;
    for (const sec of cv.sections) {
      // Pill background
      const headerStr = sec.header.toUpperCase();
      const pillW = boldFont.widthOfTextAtSize(headerStr, headerSize) + 15;
      page.drawRectangle({ x: MARGIN, y: y - 12, width: pillW, height: 18, color: rgb(accentLight[0], accentLight[1], accentLight[2]) });
      page.drawText(headerStr, { x: MARGIN + 7, y: y - 4, size: headerSize, font: boldFont, color: rgb(accent[0], accent[1], accent[2]) });
      y -= 20;
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          page.drawSquare({ x: MARGIN, y: y - 8, size: 4, color: rgb(accent[0], accent[1], accent[2]) });
          let res = drawWrapped(page, item.text, MARGIN + 12, y, bodySize, font, black, MAX_W - 12);
          page = res.page; y = res.y;
        } else if (item.type === "sub") {
          let res = drawWrapped(page, "> " + item.text, MARGIN + 12, y, bodySize - 1, font, grayLight, MAX_W - 12);
          page = res.page; y = res.y;
        } else {
          let res = drawWrapped(page, item.text, MARGIN + 12, y, bodySize, font, black, MAX_W - 12);
          page = res.page; y = res.y;
        }
      }
      y -= 12;
    }
  }
  
  else if (tpl === 4) {
    // === TEMPLATE 4: MINIMALIST ===
    let page = newPage();
    let y = PAGE_H - MARGIN;
    
    // Name left-aligned
    if (cv.name) { page.drawText(cv.name, { x: MARGIN, y, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.1) }); y -= 24; }
    if (cv.position) { page.drawText(cv.position, { x: MARGIN, y, size: bodySize, font, color: rgb(0.4, 0.4, 0.4) }); y -= 15; }
    if (cv.contact) { page.drawText(cv.contact, { x: MARGIN, y, size: bodySize - 1, font, color: rgb(0.5, 0.5, 0.5) }); y -= 20; }
    
    // Thin separator
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 22;
    
    for (const sec of cv.sections) {
      page.drawText(sec.header.toUpperCase(), { x: MARGIN, y, size: 9, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          page.drawText("—", { x: MARGIN, y, size: bodySize, font, color: rgb(0.6, 0.6, 0.6) });
          let res = drawWrapped(page, item.text, MARGIN + 14, y, bodySize, font, [0.2, 0.2, 0.2], MAX_W - 14);
          page = res.page; y = res.y;
        } else if (item.type === "sub") {
          let res = drawWrapped(page, item.text, MARGIN + 14, y, bodySize - 1, font, grayLight, MAX_W - 14);
          page = res.page; y = res.y;
        } else {
          let res = drawWrapped(page, item.text, MARGIN + 14, y, bodySize, font, [0.2, 0.2, 0.2], MAX_W - 14);
          page = res.page; y = res.y;
        }
      }
      y -= 14;
    }
  }
  
  else if (tpl === 5) {
    // === TEMPLATE 5: EXECUTIVE ===
    let page = newPage();
    let y = PAGE_H - MARGIN;
    
    // Name left-aligned bold
    if (cv.name) { page.drawText(cv.name, { x: MARGIN, y, size: 22, font: boldFont, color: rgb(accent[0], accent[1], accent[2]) }); y -= 6; }
    // Thick accent line
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 2.5, color: rgb(accent[0], accent[1], accent[2]) });
    y -= 20;
    if (cv.position) { page.drawText(cv.position, { x: MARGIN, y, size: bodySize, font: boldFont, color: rgb(0.2, 0.2, 0.2) }); y -= 16; }
    if (cv.contact) { page.drawText(cv.contact, { x: MARGIN, y, size: bodySize - 1, font, color: rgb(0.4, 0.4, 0.4) }); y -= 28; }
    
    // Two-column layout
    const colW = (MAX_W - 25) / 2;
    const rightX = MARGIN + colW + 25;
    let leftY = y;
    let rightY = y;
    
    for (const sec of cv.sections) {
      const isLeftCol = sec.header.toUpperCase().includes("PROFIL") || sec.header.toUpperCase().includes("SKILL") || sec.header.toUpperCase().includes("KEAHLIAN");
      const colX = isLeftCol ? MARGIN : rightX;
      let cy = isLeftCol ? leftY : rightY;
      
      // Left border accent
      page.drawLine({ start: { x: colX, y: cy - 14 }, end: { x: colX, y: cy + 2 }, thickness: 2.5, color: rgb(accent[0], accent[1], accent[2]) });
      page.drawText(sec.header.toUpperCase(), { x: colX + 8, y: cy, size: 10, font: boldFont, color: rgb(accent[0], accent[1], accent[2]) });
      cy -= 16;
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          page.drawText(">", { x: colX, y: cy, size: bodySize, font, color: rgb(accent[0], accent[1], accent[2]) });
          let res = drawWrapped(page, item.text, colX + 12, cy, bodySize, font, black, colW - 12);
          page = res.page; cy = res.y;
        } else if (item.type === "sub") {
          let res = drawWrapped(page, "  " + item.text, colX + 12, cy, bodySize - 1, font, grayLight, colW - 12);
          page = res.page; cy = res.y;
        } else {
          let res = drawWrapped(page, item.text, colX + 12, cy, bodySize, font, black, colW - 12);
          page = res.page; cy = res.y;
        }
      }
      cy += 15;
      if (isLeftCol) leftY = cy; else rightY = cy;
    }
  }
  
  return await pdfDoc.save();
}

const cvText = `ANDI PRATAMA
Waiters - Jakarta
andi.pratama@email.com | 081234567890

# PROFIL
Profesional berdedikasi dengan pengalaman 2 tahun di industri kuliner.

# PENGALAMAN
- Barista & Pelayan di Kopi Senja (2022-2024)
Bertanggung jawab atas penyajian kopi dan makanan.
Berhasil meningkatkan retensi pelanggan 15%.

# PENDIDIKAN
- SMA Negeri 1 Jakarta (2021)

# SKILL
- Memasak (masakan fusion, hidangan pembuka)
- Pelayanan Pelanggan
- Sistem POS & Kebersihan Sanitasi
- Komunikasi Efektif`;

async function testAll() {
  for (let tpl = 1; tpl <= 5; tpl++) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const opts = { font: 'times', tpl };
    const buf = await renderCV_PDF(cvText, tpl, opts, pdfDoc, font, boldFont);
    fs.writeFileSync(`/tmp/cv_tpl${tpl}.pdf`, Buffer.from(buf));
    console.log(`PDF Template ${tpl} (${CV_TEMPLATES[tpl].name}): ${(buf.length/1024).toFixed(1)} KB`);
  }
  console.log('All done!');
}

testAll().catch(e => console.error(e));
