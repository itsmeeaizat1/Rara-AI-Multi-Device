// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Canvas } from "skia-canvas";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "txttopdf",
  alias: ["texttopdf", "txt2pdf", "topdf", "makpdf", "txttodoc", "texttodoc", "txt2doc", "todoc", "makeword"],
  category: "tools",
  description: "Convert text ke PDF/Word + AI CV/Portfolio (kasih data diri, AI yg buat) - font, warna & HD",
  usage: ".txttopdf <teks>  |  .txttopdf aicv <info>  |  .txttopdf aiporto <info>",
  example: ".txttopdf aicv buatkan cv lamaran ke restoran. Nama Andi, exp cafe 2 thn",
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
const MAX_W = PAGE_W - MARGIN * 2;

// ─── Named colors → rgb ───
const COLORS = {
  black: [0, 0, 0], white: [1, 1, 1],
  red: [0.8, 0, 0], darkred: [0.55, 0, 0],
  green: [0, 0.6, 0], darkgreen: [0, 0.4, 0],
  blue: [0, 0, 0.8], darkblue: [0, 0, 0.55], navy: [0, 0, 0.5],
  lightblue: [0.2, 0.4, 0.8], skyblue: [0.13, 0.5, 0.76],
  yellow: [0.8, 0.8, 0], orange: [0.9, 0.5, 0],
  purple: [0.5, 0, 0.5], violet: [0.4, 0.2, 0.6],
  gray: [0.4, 0.4, 0.4], grey: [0.4, 0.4, 0.4], darkgray: [0.3, 0.3, 0.3],
  brown: [0.5, 0.25, 0], teal: [0, 0.5, 0.5],
  maroon: [0.5, 0, 0], olive: [0.5, 0.5, 0],
  pink: [1, 0.5, 0.8], magenta: [0.8, 0, 0.8],
  cyan: [0, 0.8, 0.8], gold: [0.8, 0.65, 0],
  crimson: [0.86, 0.08, 0.24], indigo: [0.29, 0, 0.51],
};

// ─── CSS color strings for canvas ───
const CSS_COLORS = {
  black: "#000000", white: "#ffffff",
  red: "#cc0000", darkred: "#8c0000",
  green: "#009900", darkgreen: "#006600",
  blue: "#0000cc", darkblue: "#00008c", navy: "#000080",
  lightblue: "#3366cc", skyblue: "#2299c2",
  yellow: "#cccc00", orange: "#e68000",
  purple: "#800080", violet: "#663399",
  gray: "#666666", grey: "#666666", darkgray: "#4d4d4d",
  brown: "#804000", teal: "#008080",
  maroon: "#800000", olive: "#808000",
  pink: "#ff80cc", magenta: "#cc00cc",
  cyan: "#00cccc", gold: "#cca600",
  crimson: "#dc143c", indigo: "#4a0082",
};

// ─── Font map ───
const FONTS = {
  helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique, css: "Helvetica, Arial, sans-serif", cssBold: "bold " },
  times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic, css: "'Times New Roman', Times, serif", cssBold: "bold " },
  courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique, css: "'Courier New', Courier, monospace", cssBold: "bold " },
};

function parseColor(input) {
  if (!input) return [0, 0, 0];
  const lower = input.toLowerCase().trim();
  if (COLORS[lower]) return COLORS[lower];
  if (/^#[0-9a-f]{6}$/i.test(lower)) {
    return [parseInt(lower.substring(1, 3), 16) / 255, parseInt(lower.substring(3, 5), 16) / 255, parseInt(lower.substring(5, 7), 16) / 255];
  }
  if (/^#[0-9a-f]{3}$/i.test(lower)) {
    return [parseInt(lower[1] + lower[1], 16) / 255, parseInt(lower[2] + lower[2], 16) / 255, parseInt(lower[3] + lower[3], 16) / 255];
  }
  return null;
}

function cssColor(input) {
  if (!input) return "#000000";
  const lower = input.toLowerCase().trim();
  if (CSS_COLORS[lower]) return CSS_COLORS[lower];
  if (/^#[0-9a-f]{3,6}$/i.test(lower)) return lower;
  return "#000000";
}

// ─── Parse flags ───
function parseFlags(text) {
  const opts = { font: "helvetica", color: "black", titlecolor: null, size: 11, img: 0, imgmode: "doc", tpl: 1 };
  const flagRegex = /(font|color|titlecolor|size|img|imgmode|out|tpl)=([^\s]+)/gi;
  let match;
  const flags = [];
  while ((match = flagRegex.exec(text)) !== null) {
    flags.push({ key: match[1].toLowerCase(), value: match[2] });
  }
  for (const f of flags) {
    if (f.key === "font") {
      const fn = f.value.toLowerCase();
      if (FONTS[fn]) opts.font = fn;
    } else if (f.key === "color") {
      opts.color = f.value;
    } else if (f.key === "titlecolor") {
      opts.titlecolor = f.value;
    } else if (f.key === "size") {
      const s = parseInt(f.value);
      if (s >= 8 && s <= 24) opts.size = s;
    } else if (f.key === "img") {
      const im = parseInt(f.value);
      if (im === 4 || im === 8 || im === 16) opts.img = im;
    } else if (f.key === "imgmode" || f.key === "out") {
      const mode = f.value.toLowerCase();
      if (mode === "gambar" || mode === "img" || mode === "image") opts.imgmode = "img";
      else opts.imgmode = "doc";
    } else if (f.key === "tpl") {
      const t = parseInt(f.value);
      if (t >= 1 && t <= 5) opts.tpl = t;
    }
  }
  const cleaned = text.replace(flagRegex, "").replace(/^\s+/, "").trim();
  return { opts, cleaned };
}

// ─── Word wrap for pdf-lib ───
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

// ─── Word wrap for canvas ───
function wrapTextCanvas(ctx, text, fontStr, maxWidth) {
  const result = [];
  for (const para of text.split("\n")) {
    if (para.trim() === "") { result.push(""); continue; }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      ctx.font = fontStr;
      if (ctx.measureText(test).width > maxWidth && line) {
        result.push(line); line = word;
      } else { line = test; }
    }
    if (line) result.push(line);
  }
  return result;
}

// ─── Create PDF ───
async function createPDF(rawText, format, opts) {
  const pdfDoc = await PDFDocument.create();
  const fontSet = FONTS[opts.font] || FONTS.helvetica;
  const font = await pdfDoc.embedFont(fontSet.regular);
  const boldFont = await pdfDoc.embedFont(fontSet.bold);

  const bodyColor = parseColor(opts.color) || [0, 0, 0];
  const titleColorRaw = opts.titlecolor ? opts.titlecolor : opts.color;
  const titleColor = parseColor(titleColorRaw) || bodyColor;
  const headerColor = titleColor;

  const bodySize = opts.size || 11;
  const lineH = Math.ceil(bodySize * 1.5);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const lines = rawText.split("\n");
  let title = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { title = lines[i].trim(); bodyStart = i + 1; break; }
  }
  const body = lines.slice(bodyStart).join("\n").trim();

  if (title) {
    const titleSize = format === "cv" ? 18 : 16;
    let titleX = MARGIN;
    if (format === "cv" || format === "surat") {
      const tw = boldFont.widthOfTextAtSize(title, titleSize);
      titleX = (PAGE_W - tw) / 2;
    }
    page.drawText(title, { x: titleX, y, size: titleSize, font: boldFont, color: rgb(titleColor[0], titleColor[1], titleColor[2]) });
    y -= titleSize + 8;
    if (format === "cv") {
      const tw = boldFont.widthOfTextAtSize(title, titleSize);
      page.drawLine({
        start: { x: titleX, y: y + 4 },
        end: { x: titleX + tw, y: y + 4 },
        thickness: 1,
        color: rgb(titleColor[0] * 0.7, titleColor[1] * 0.7, titleColor[2] * 0.7),
      });
      y -= 15;
    } else { y -= 12; }
  }

  if (body) {
    for (let line of body.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "") { y -= lineH * 0.5; continue; }
      const isHeader = trimmed.startsWith("#") || (/^[A-Z][A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40);
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
      let drawText = trimmed;
      let useFont = font;
      let useSize = bodySize;
      let useColor = bodyColor;
      if (isHeader) {
        drawText = trimmed.replace(/^#\s*/, "");
        useFont = boldFont;
        useSize = bodySize + 1;
        useColor = headerColor;
        y -= 5;
      } else if (isBullet) {
        drawText = "  " + drawText.replace(/^[-•*]\s*/, "• ");
      }
      const wrapped = wrapText(drawText, useFont, useSize, MAX_W);
      for (const wl of wrapped) {
        if (y < MARGIN + 20) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          y = PAGE_H - MARGIN;
        }
        page.drawText(wl, { x: MARGIN, y, size: useSize, font: useFont, color: rgb(useColor[0], useColor[1], useColor[2]) });
        y -= lineH;
      }
      if (isHeader) y -= 3;
    }
  }

  return await pdfDoc.save();
}

// === CV CONTENT PARSER ===
function parseCVContent(rawText) {
  const lines = rawText.split("\n").map(l => l.trim());
  const cv = { name: "", position: "", contact: "", sections: [] };
  
  let idx = 0;
  // Line 1: Name
  while (idx < lines.length && !lines[idx]) idx++;
  if (idx < lines.length) cv.name = lines[idx++];
  // Line 2: Position
  while (idx < lines.length && !lines[idx]) idx++;
  if (idx < lines.length && !lines[idx].startsWith("#")) cv.position = lines[idx++];
  // Line 3: Contact
  while (idx < lines.length && !lines[idx]) idx++;
  if (idx < lines.length && !lines[idx].startsWith("#")) cv.contact = lines[idx++];
  
  // Parse sections
  let currentSection = null;
  for (; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line) continue;
    
    if (line.startsWith("#")) {
      if (currentSection) cv.sections.push(currentSection);
      currentSection = { header: line.replace(/^#\s*/, ""), items: [] };
    } else if (currentSection) {
      if (line.startsWith("- ") || line.startsWith("• ")) {
        currentSection.items.push({ type: "bullet", text: line.replace(/^[-•*]\s*/, "") });
      } else {
        // Check if it's a sub-item (indented or continuation)
        const prevItem = currentSection.items[currentSection.items.length - 1];
        if (prevItem && prevItem.type === "bullet") {
          currentSection.items.push({ type: "sub", text: line });
        } else {
          currentSection.items.push({ type: "text", text: line });
        }
      }
    }
  }
  if (currentSection) cv.sections.push(currentSection);
  return cv;
}

// === TEMPLATE COLOR SCHEMES ===
const CV_TEMPLATES = {
  1: { name: "Professional", accent: "#000080", light: "#000050", bg: null },
  2: { name: "Modern Sidebar", accent: "#1a5276", light: "#d4e6f1", bg: "#1a5276" },
  3: { name: "Creative Header", accent: "#8e44ad", light: "#f5eef8", bg: null },
  4: { name: "Minimalist", accent: "#333333", light: "#666666", bg: null },
  5: { name: "Executive", accent: "#1c3d3a", light: "#c0c0c0", bg: null },
};

// === PNG TEMPLATE RENDERERS ===
async function renderCV_PNG(cv, tpl, opts, scale) {
  const scheme = CV_TEMPLATES[tpl] || CV_TEMPLATES[1];
  const accent = scheme.accent;
  const fontSet = FONTS[opts.font] || FONTS.helvetica;
  const font = fontSet.css;
  
  const baseW = 794;
  const W = Math.round(baseW * scale);
  const margin = Math.round(50 * scale);
  const fontSize = Math.round(12 * scale);
  const headerSize = Math.round(14 * scale);
  const nameSize = Math.round(24 * scale);
  const lineH = Math.round(18 * scale);
  
  // First pass: calculate height
  let totalH = Math.round(60 * scale);
  
  if (tpl === 2) {
    // Sidebar: need at least full page
    totalH = Math.round(1123 * scale);
  } else if (tpl === 3) {
    totalH += Math.round(120 * scale); // header band
    for (const sec of cv.sections) {
      totalH += Math.round(28 * scale);
      for (const item of sec.items) {
        totalH += lineH;
      }
      totalH += Math.round(15 * scale);
    }
  } else {
    totalH += Math.round(40 * scale); // name area
    for (const sec of cv.sections) {
      totalH += Math.round(28 * scale);
      for (const item of sec.items) {
        totalH += lineH;
      }
      totalH += Math.round(15 * scale);
    }
  }
  totalH = Math.max(totalH, Math.round(1123 * scale));
  const H = totalH;
  
  const canvas = new Canvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  
  function wrap(text, fontStr, maxW) {
    const words = text.split(" ");
    const out = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      ctx.font = fontStr;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  
  if (tpl === 1) {
    // === TEMPLATE 1: PROFESSIONAL (centered, underline) ===
    let y = Math.round(60 * scale);
    const contentW = W - margin * 2;
    
    // Name
    ctx.fillStyle = accent;
    ctx.font = "bold " + nameSize + "px " + font;
    ctx.textAlign = "center";
    ctx.fillText(cv.name, W / 2, y);
    const nameW = ctx.measureText(cv.name).width;
    y += Math.round(6 * scale);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.round(2 * scale);
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameW / 2, y);
    ctx.lineTo(W / 2 + nameW / 2, y);
    ctx.stroke();
    y += Math.round(24 * scale);
    
    // Position + contact
    if (cv.position) { ctx.fillStyle = "#333"; ctx.font = fontSize + "px " + font; ctx.fillText(cv.position, W / 2, y); y += Math.round(18 * scale); }
    if (cv.contact) { ctx.fillStyle = "#555"; ctx.font = Math.round(11 * scale) + "px " + font; ctx.fillText(cv.contact, W / 2, y); y += Math.round(28 * scale); }
    
    // Sections
    ctx.textAlign = "left";
    for (const sec of cv.sections) {
      ctx.fillStyle = accent;
      ctx.font = "bold " + headerSize + "px " + font;
      ctx.fillText(sec.header.toUpperCase(), margin, y);
      y += Math.round(4 * scale);
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = Math.round(0.5 * scale);
      ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
      y += Math.round(20 * scale);
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(margin + Math.round(4 * scale), y - Math.round(4 * scale), Math.round(2.5 * scale), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, contentW - Math.round(20 * scale));
          for (const w of wrapped) { ctx.fillText(w, margin + Math.round(14 * scale), y); y += lineH; }
        } else if (item.type === "sub") {
          ctx.fillStyle = "#555";
          ctx.font = Math.round(11 * scale) + "px " + font;
          ctx.fillText("• " + item.text, margin + Math.round(14 * scale), y);
          y += lineH;
        } else {
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, contentW - Math.round(10 * scale));
          for (const w of wrapped) { ctx.fillText(w, margin + Math.round(14 * scale), y); y += lineH; }
        }
      }
      y += Math.round(10 * scale);
    }
  }
  
  else if (tpl === 2) {
    // === TEMPLATE 2: MODERN SIDEBAR ===
    const sideW = Math.round(260 * scale);
    const mainX = sideW + Math.round(20 * scale);
    const mainW = W - mainX - margin;
    
    // Sidebar background
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, sideW, H);
    
    // Sidebar: Name
    let sy = Math.round(50 * scale);
    ctx.fillStyle = "#fff";
    ctx.font = "bold " + Math.round(20 * scale) + "px " + font;
    ctx.textAlign = "left";
    const sideMargin = Math.round(25 * scale);
    // Wrap name
    const nameParts = wrap(cv.name, "bold " + Math.round(20 * scale) + "px " + font, sideW - sideMargin * 2);
    for (const np of nameParts) { ctx.fillText(np, sideMargin, sy); sy += Math.round(24 * scale); }
    sy += Math.round(8 * scale);
    
    // Position
    if (cv.position) {
      ctx.fillStyle = scheme.light;
      ctx.font = Math.round(12 * scale) + "px " + font;
      ctx.fillText(cv.position, sideMargin, sy);
      sy += Math.round(30 * scale);
    }
    
    // Contact
    if (cv.contact) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.round(11 * scale) + "px " + font;
      ctx.fillText("KONTAK", sideMargin, sy);
      sy += Math.round(4 * scale);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = Math.round(1 * scale);
      ctx.beginPath(); ctx.moveTo(sideMargin, sy); ctx.lineTo(sideW - sideMargin, sy); ctx.stroke();
      sy += Math.round(18 * scale);
      ctx.fillStyle = scheme.light;
      ctx.font = Math.round(10 * scale) + "px " + font;
      const contactLines = wrap(cv.contact, Math.round(10 * scale) + "px " + font, sideW - sideMargin * 2);
      for (const cl of contactLines) { ctx.fillText(cl, sideMargin, sy); sy += Math.round(15 * scale); }
      sy += Math.round(20 * scale);
    }
    
    // Sidebar: Skills section
    const skillSec = cv.sections.find(s => s.header.toUpperCase().includes("SKILL") || s.header.toUpperCase().includes("KEAHLIAN"));
    if (skillSec) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.round(11 * scale) + "px " + font;
      ctx.fillText("SKILL", sideMargin, sy);
      sy += Math.round(4 * scale);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath(); ctx.moveTo(sideMargin, sy); ctx.lineTo(sideW - sideMargin, sy); ctx.stroke();
      sy += Math.round(18 * scale);
      ctx.fillStyle = scheme.light;
      ctx.font = Math.round(10 * scale) + "px " + font;
      for (const item of skillSec.items) {
        if (item.type === "bullet") {
          ctx.fillText("• " + item.text, sideMargin, sy);
          sy += Math.round(16 * scale);
        }
      }
    }
    
    // Main area: Profil + Pengalaman + Pendidikan
    let my = Math.round(50 * scale);
    for (const sec of cv.sections) {
      if (sec.header.toUpperCase().includes("SKILL") || sec.header.toUpperCase().includes("KEAHLIAN")) continue;
      
      ctx.fillStyle = accent;
      ctx.font = "bold " + headerSize + "px " + font;
      ctx.textAlign = "left";
      ctx.fillText(sec.header.toUpperCase(), mainX, my);
      my += Math.round(4 * scale);
      ctx.strokeStyle = scheme.light;
      ctx.lineWidth = Math.round(1 * scale);
      ctx.beginPath(); ctx.moveTo(mainX, my); ctx.lineTo(mainX + mainW, my); ctx.stroke();
      my += Math.round(20 * scale);
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(mainX + Math.round(4 * scale), my - Math.round(4 * scale), Math.round(2.5 * scale), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, mainW - Math.round(20 * scale));
          for (const w of wrapped) { ctx.fillText(w, mainX + Math.round(14 * scale), my); my += lineH; }
        } else if (item.type === "sub") {
          ctx.fillStyle = "#555";
          ctx.font = Math.round(11 * scale) + "px " + font;
          ctx.fillText("• " + item.text, mainX + Math.round(14 * scale), my);
          my += lineH;
        } else {
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, mainW - Math.round(10 * scale));
          for (const w of wrapped) { ctx.fillText(w, mainX + Math.round(14 * scale), my); my += lineH; }
        }
      }
      my += Math.round(15 * scale);
    }
  }
  
  else if (tpl === 3) {
    // === TEMPLATE 3: CREATIVE HEADER ===
    const headerH = Math.round(130 * scale);
    const contentW = W - margin * 2;
    
    // Header band
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, headerH);
    
    // Name in header
    ctx.fillStyle = "#fff";
    ctx.font = "bold " + nameSize + "px " + font;
    ctx.textAlign = "center";
    ctx.fillText(cv.name, W / 2, Math.round(55 * scale));
    
    // Position
    if (cv.position) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = Math.round(13 * scale) + "px " + font;
      ctx.fillText(cv.position, W / 2, Math.round(85 * scale));
    }
    
    // Contact
    if (cv.contact) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = Math.round(11 * scale) + "px " + font;
      ctx.fillText(cv.contact, W / 2, Math.round(108 * scale));
    }
    
    // Body
    let y = headerH + Math.round(35 * scale);
    ctx.textAlign = "left";
    
    for (const sec of cv.sections) {
      // Section header with colored pill background
      const headerStr = sec.header.toUpperCase();
      ctx.font = "bold " + headerSize + "px " + font;
      const pillW = ctx.measureText(headerStr).width + Math.round(20 * scale);
      const pillH = Math.round(24 * scale);
      
      ctx.fillStyle = scheme.light;
      ctx.fillRect(margin, y - Math.round(18 * scale), pillW, pillH);
      ctx.fillStyle = accent;
      ctx.fillText(headerStr, margin + Math.round(10 * scale), y);
      y += Math.round(22 * scale);
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          // Colored square bullet
          ctx.fillStyle = accent;
          ctx.fillRect(margin, y - Math.round(12 * scale), Math.round(5 * scale), Math.round(5 * scale));
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, contentW - Math.round(20 * scale));
          for (const w of wrapped) { ctx.fillText(w, margin + Math.round(14 * scale), y); y += lineH; }
        } else if (item.type === "sub") {
          ctx.fillStyle = "#666";
          ctx.font = Math.round(11 * scale) + "px " + font;
          ctx.fillText("▸ " + item.text, margin + Math.round(14 * scale), y);
          y += lineH;
        } else {
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, contentW - Math.round(10 * scale));
          for (const w of wrapped) { ctx.fillText(w, margin + Math.round(14 * scale), y); y += lineH; }
        }
      }
      y += Math.round(18 * scale);
    }
  }
  
  else if (tpl === 4) {
    // === TEMPLATE 4: MINIMALIST ===
    let y = Math.round(70 * scale);
    const contentW = W - margin * 2;
    
    // Name (left-aligned, bold, no underline)
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold " + Math.round(22 * scale) + "px " + font;
    ctx.textAlign = "left";
    ctx.fillText(cv.name, margin, y);
    y += Math.round(28 * scale);
    
    // Position
    if (cv.position) {
      ctx.fillStyle = "#555";
      ctx.font = Math.round(13 * scale) + "px " + font;
      ctx.fillText(cv.position, margin, y);
      y += Math.round(18 * scale);
    }
    
    // Contact
    if (cv.contact) {
      ctx.fillStyle = "#888";
      ctx.font = Math.round(11 * scale) + "px " + font;
      ctx.fillText(cv.contact, margin, y);
      y += Math.round(24 * scale);
    }
    
    // Thin separator
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = Math.round(0.5 * scale);
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
    y += Math.round(25 * scale);
    
    for (const sec of cv.sections) {
      // Section header (caps, no color, just letter spacing)
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold " + Math.round(11 * scale) + "px " + font;
      ctx.fillText(sec.header.toUpperCase(), margin, y);
      y += Math.round(18 * scale);
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          ctx.fillStyle = "#999";
          ctx.font = fontSize + "px " + font;
          ctx.fillText("—", margin, y);
          ctx.fillStyle = "#333";
          const wrapped = wrap(item.text, fontSize + "px " + font, contentW - Math.round(20 * scale));
          for (const w of wrapped) { ctx.fillText(w, margin + Math.round(16 * scale), y); y += lineH; }
        } else if (item.type === "sub") {
          ctx.fillStyle = "#777";
          ctx.font = Math.round(11 * scale) + "px " + font;
          ctx.fillText(item.text, margin + Math.round(16 * scale), y);
          y += lineH;
        } else {
          ctx.fillStyle = "#333";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, contentW - Math.round(10 * scale));
          for (const w of wrapped) { ctx.fillText(w, margin + Math.round(16 * scale), y); y += lineH; }
        }
      }
      y += Math.round(18 * scale);
    }
  }
  
  else if (tpl === 5) {
    // === TEMPLATE 5: EXECUTIVE ===
    let y = Math.round(55 * scale);
    const contentW = W - margin * 2;
    
    // Name (left-aligned, bold, large)
    ctx.fillStyle = accent;
    ctx.font = "bold " + Math.round(26 * scale) + "px " + font;
    ctx.textAlign = "left";
    ctx.fillText(cv.name, margin, y);
    y += Math.round(8 * scale);
    
    // Gold/silver accent line (full width, thick)
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.round(3 * scale);
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W - margin, y); ctx.stroke();
    y += Math.round(22 * scale);
    
    // Position + contact on same line
    if (cv.position) {
      ctx.fillStyle = "#333";
      ctx.font = "bold " + Math.round(13 * scale) + "px " + font;
      ctx.fillText(cv.position, margin, y);
      y += Math.round(18 * scale);
    }
    if (cv.contact) {
      ctx.fillStyle = "#666";
      ctx.font = Math.round(11 * scale) + "px " + font;
      ctx.fillText(cv.contact, margin, y);
      y += Math.round(30 * scale);
    }
    
    // Two-column layout: left = profil + skill, right = pengalaman + pendidikan
    const colW = Math.round((contentW - Math.round(30 * scale)) / 2);
    const rightX = margin + colW + Math.round(30 * scale);
    
    // Left column sections
    let leftY = y;
    let rightY = y;
    
    for (const sec of cv.sections) {
      const isLeftCol = sec.header.toUpperCase().includes("PROFIL") || sec.header.toUpperCase().includes("SKILL") || sec.header.toUpperCase().includes("KEAHLIAN");
      const colX = isLeftCol ? margin : rightX;
      const colWidth = colW;
      let cy = isLeftCol ? leftY : rightY;
      
      // Section header with left border accent
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.round(3 * scale);
      ctx.beginPath(); ctx.moveTo(colX, cy - Math.round(14 * scale)); ctx.lineTo(colX, cy); ctx.stroke();
      
      ctx.fillStyle = accent;
      ctx.font = "bold " + Math.round(12 * scale) + "px " + font;
      ctx.fillText(sec.header.toUpperCase(), colX + Math.round(10 * scale), cy);
      cy += Math.round(18 * scale);
      
      for (const item of sec.items) {
        if (item.type === "bullet") {
          ctx.fillStyle = accent;
          ctx.font = fontSize + "px " + font;
          ctx.fillText("▸", colX, cy);
          ctx.fillStyle = "#000";
          const wrapped = wrap(item.text, fontSize + "px " + font, colWidth - Math.round(16 * scale));
          for (const w of wrapped) { ctx.fillText(w, colX + Math.round(14 * scale), cy); cy += lineH; }
        } else if (item.type === "sub") {
          ctx.fillStyle = "#666";
          ctx.font = Math.round(11 * scale) + "px " + font;
          ctx.fillText("  " + item.text, colX + Math.round(14 * scale), cy);
          cy += lineH;
        } else {
          ctx.fillStyle = "#000";
          ctx.font = fontSize + "px " + font;
          const wrapped = wrap(item.text, fontSize + "px " + font, colWidth - Math.round(16 * scale));
          for (const w of wrapped) { ctx.fillText(w, colX + Math.round(14 * scale), cy); cy += lineH; }
        }
      }
      cy += Math.round(20 * scale);
      
      if (isLeftCol) leftY = cy;
      else rightY = cy;
    }
  }
  
  return await canvas.toBuffer("png");
}


// ─── Render HD image with skia-canvas ───
async function renderImage(rawText, format, opts, upscale) {
  // CV Template routing
  if (format === "cv" && opts.tpl && opts.tpl >= 1 && opts.tpl <= 5) {
    const cv = parseCVContent(rawText);
    const scaleMap = { 4: 1.56, 8: 3.12, 16: 6.0 };
    const scale = scaleMap[upscale] || 1;
    return await renderCV_PNG(cv, opts.tpl, opts, scale);
  }
  const fontSet = FONTS[opts.font] || FONTS.helvetica;
  const bodyHex = cssColor(opts.color);
  const titleHex = cssColor(opts.titlecolor ? opts.titlecolor : opts.color);
  const headerHex = titleHex;
  const bodySize = opts.size || 11;

  // Base dimensions per upscale level
  const baseW = 794;
  const scaleMap = { 4: 1.56, 8: 3.12, 16: 6.0 };
  const scale = scaleMap[upscale] || 1;
  const W = Math.round(baseW * scale);
  const margin = Math.round(50 * scale);
  const maxTextW = W - margin * 2;

  const fontSize = Math.round(13 * scale);
  const titleFontSize = Math.round((format === "cv" ? 22 : 20) * scale);
  const headerFontSize = Math.round(14 * scale);
  const lineH = Math.round(19 * scale);
  const titleLineH = Math.round(28 * scale);

  // Parse content
  const lines = rawText.split("\n");
  let title = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { title = lines[i].trim(); bodyStart = i + 1; break; }
  }
  const body = lines.slice(bodyStart).join("\n").trim();

  // First pass: calculate total height
  let totalH = Math.round(60 * scale); // top margin
  if (title) {
    totalH += titleLineH;
    if (format === "cv") totalH += Math.round(20 * scale);
    else totalH += Math.round(15 * scale);
  }

  if (body) {
    for (let line of body.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "") { totalH += Math.round(lineH * 0.5); continue; }
      const isHeader = trimmed.startsWith("#") || (/^[A-Z][A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40);
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
      let drawText = trimmed;
      let useFontStr = fontSize + "px " + fontSet.css;
      let useFontSize = fontSize;
      if (isHeader) {
        drawText = trimmed.replace(/^#\s*/, "");
        useFontStr = "bold " + headerFontSize + "px " + fontSet.css;
        useFontSize = headerFontSize;
        totalH += Math.round(5 * scale);
      } else if (isBullet) {
        drawText = "  " + drawText.replace(/^[-•*]\s*/, "• ");
      }
      const wrapped = wrapTextCanvas({ measureText: (t) => ({ width: 0 }) }, drawText, useFontStr, maxTextW);
      // We need a real context for measureText, so use a temp canvas
      const tmpCanvas = new Canvas(10, 10);
      const tmpCtx = tmpCanvas.getContext("2d");
      tmpCtx.font = useFontStr;
      const wrappedReal = wrapTextCanvas(tmpCtx, drawText, useFontStr, maxTextW);
      totalH += wrappedReal.length * lineH;
      if (isHeader) totalH += Math.round(3 * scale);
    }
  }
  totalH += Math.round(50 * scale); // bottom padding
  // Minimum one page height
  const minH = Math.round(1123 * scale);
  const H = Math.max(totalH, minH);

  // Second pass: render
  const canvas = new Canvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  let y = Math.round(60 * scale);

  // Title
  if (title) {
    ctx.fillStyle = titleHex;
    ctx.font = "bold " + titleFontSize + "px " + fontSet.css;
    if (format === "cv" || format === "surat") {
      ctx.textAlign = "center";
      ctx.fillText(title, W / 2, y);
      y += Math.round(8 * scale);
      const titleW = ctx.measureText(title).width;
      ctx.strokeStyle = titleHex;
      ctx.lineWidth = Math.round(1.5 * scale);
      if (format === "cv") {
        ctx.beginPath();
        ctx.moveTo(W / 2 - titleW / 2, y);
        ctx.lineTo(W / 2 + titleW / 2, y);
        ctx.stroke();
        y += Math.round(20 * scale);
      } else {
        y += Math.round(15 * scale);
      }
    } else {
      ctx.textAlign = "left";
      ctx.fillText(title, margin, y);
      y += titleLineH;
    }
  }

  // Body
  if (body) {
    for (let line of body.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "") { y += Math.round(lineH * 0.5); continue; }
      const isHeader = trimmed.startsWith("#") || (/^[A-Z][A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40);
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
      let drawText = trimmed;
      let useFontStr = fontSize + "px " + fontSet.css;
      let useFontSize = fontSize;
      let useColor = bodyHex;
      if (isHeader) {
        drawText = trimmed.replace(/^#\s*/, "");
        useFontStr = "bold " + headerFontSize + "px " + fontSet.css;
        useColor = headerHex;
        y += Math.round(5 * scale);
      } else if (isBullet) {
        drawText = "  " + drawText.replace(/^[-•*]\s*/, "• ");
      }
      ctx.font = useFontStr;
      const wrapped = wrapTextCanvas(ctx, drawText, useFontStr, maxTextW);
      for (const wl of wrapped) {
        ctx.fillStyle = useColor;
        ctx.font = useFontStr;
        ctx.textAlign = "left";
        ctx.fillText(wl, margin, y);
        y += lineH;
      }
      if (isHeader) y += Math.round(3 * scale);
    }
  }

  const buf = await canvas.toBuffer("png");
  return buf;
}

// ─── Create Word .doc ───
function createDoc(rawText, format, opts) {
  const fontSet = FONTS[opts.font] || FONTS.helvetica;
  const bodyColor = opts.color || "black";
  const titleColor = opts.titlecolor ? opts.titlecolor : opts.color;
  const bodySize = (opts.size || 11) + "pt";

  const lines = rawText.split("\n");
  let title = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { title = lines[i].trim(); bodyStart = i + 1; break; }
  }
  const body = lines.slice(bodyStart).join("\n").trim();

  function colorToHex(c) {
    const rgb = parseColor(c);
    if (!rgb) return "#000000";
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    return "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
  }

  const bodyHex = /^#[0-9a-f]{3,6}$/i.test(bodyColor) ? bodyColor : colorToHex(bodyColor);
  const titleHex = /^#[0-9a-f]{3,6}$/i.test(titleColor) ? titleColor : colorToHex(titleColor);

  let bodyHtml = "";
  for (let line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") { bodyHtml += "<br/>"; continue; }
    const isHeader = trimmed.startsWith("#") || (/^[A-Z][A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40);
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
    if (isHeader) {
      bodyHtml += '<h3 style="margin:12px 0 4px 0;color:' + titleHex + ';">' + escapeHtml(trimmed.replace(/^#\s*/, "")) + "</h3>";
    } else if (isBullet) {
      bodyHtml += '<p style="margin:2px 0 2px 20px;font-size:' + bodySize + ';color:' + bodyHex + ';font-family:' + fontSet.css + ';">• ' + escapeHtml(trimmed.replace(/^[-•*]\s*/, "")) + "</p>";
    } else {
      bodyHtml += '<p style="margin:2px 0;font-size:' + bodySize + ';color:' + bodyHex + ';font-family:' + fontSet.css + ';">' + escapeHtml(trimmed) + "</p>";
    }
  }

  const titleAlign = (format === "cv" || format === "surat") ? "center" : "left";
  const titleBorder = format === "cv" ? "border-bottom:2px solid " + titleHex + ";padding-bottom:8px;" : "";
  const titleSize = format === "cv" ? "18pt" : "16pt";

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2.54cm; }
body { font-family: ${fontSet.css}; font-size: ${bodySize}; color: ${bodyHex}; }
h1 { font-size: ${titleSize}; margin: 0 0 12px 0; text-align: ${titleAlign}; color: ${titleHex}; ${titleBorder} }
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
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


// ─── AI CV & Portfolio Generator ───
const CV_PROMPT = `Kamu adalah JOKI CV profesional. Tugas kamu bantu user buat CV lengkap dan rapi dari info seadanya. User mungkin cuma kasih konteks minim (ex: "buat cv lamaran ke restoran, nama Andi, bisa masak"). Kamu LENGKAPIN sendiri semua bagian yang kurang biar CV keliatan profesional dan siap pakai.

FORMAT OUTPUT WAJIB (LANGSUNG output CV, jangan ada intro/penjelasan/nanya balik):

Baris 1: NAMA (dari user, atau buat nama yang cocok)
Baris 2: Posisi yang dilamar - Kota (dari user atau kosongin)
Baris 3: Email (dari user atau buat email masuk akal) | Telepon (dari user atau buat 08xx)

# PROFIL
2-3 kalimat promosi diri yang sesuai posisi yang dilamar. Buat yang menarik dan profesional.

# PENGALAMAN
- Posisi di Tempat Kerja (tahun) - apa yang dikerjain dan pencapaian
- Posisi di Tempat Kerja (tahun) - apa yang dikerjain dan pencapaian
(Buat pengalaman yang masuk akal dan relevan. Kalau user udah kasih pengalaman, pakai itu. Kalau belum, buat yang realistis.)

# PENDIDIKAN
- Jenjang - Nama Sekolah/Kampus (tahun)
(Buat yang masuk akal sesuai posisi. SMK untuk restoran, S1 untuk tech, dll.)

# SKILL
- Skill teknis utama yang relevan
- Skill soft dan penunjang

PERMINTAAN USER: __INPUT__

ATURAN JOKI:
1. OUTPUT LANGSUNG CV-nya. JANGAN nanya balik, jangan bilang "berikut CV-nya" atau penjelasan apapun
2. Pakai format: # untuk section header, - untuk bullet point
3. Lengkapin SEMUA bagian. User kasih nama doyan? Tetap buat full CV lengkap
4. Sesuaikan tone dengan posisi (restoran = kasar vs sopan, tech = technical, dll)
5. Buat CV yang bikin user keliatan berpengalaman dan profesional
6. Bahasa Indonesia natural
7. Maksimal 1 halaman A4`;

const PORTO_PROMPT = `Kamu adalah JOKI portofolio profesional. Tugas kamu bantu user buat portofolio lengkap dan rapi dari info seadanya. User mungkin cuma kasih konteks minim (ex: "buat portofolio web dev, nama Sari, pernah bikin website company"). Kamu LENGKAPIN sendiri semua bagian yang kurang biar portofolio keliatan profesional dan siap pakai.

FORMAT OUTPUT WAJIB (LANGSUNG output, jangan ada intro/penjelasan/nanya balik):

Baris 1: NAMA (dari user, atau buat nama yang cocok)
Baris 2: Profesi/Bidang - Kota (dari user atau kosongin)
Baris 3: Email (dari user atau buat masuk akal) | Telepon (dari user atau buat 08xx)

# TENTANG SAYA
2-3 kalimat deskripsi profesional yang menarik sesuai bidang user.

# PROYEK UNGGULAN
- Nama Proyek: Deskripsi singkat, peran user, dan hasil/impact
- Nama Proyek: Deskripsi singkat, peran user, dan hasil/impact
- Nama Proyek: Deskripsi singkat, peran user, dan hasil/impact
(Buat proyek yang masuk akal dan relevan. Kalau user udah sebut, pakai itu. Kalau belum, buat yang realistis.)

# KEAHLIAN
- Skill teknis utama
- Tools dan teknologi yang relevan

# PENGALAMAN
- Posisi di Tempat Kerja (tahun) - deskripsi singkat

# PENDIDIKAN
- Jenjang - Institusi (tahun)

PERMINTAAN USER: __INPUT__

ATURAN JOKI:
1. OUTPUT LANGSUNG portofolio-nya. JANGAN nanya balik atau kasih penjelasan
2. Pakai format: # untuk section header, - untuk bullet point
3. Lengkapin SEMUA bagian. User kasih nama doyan? Tetap buat full portofolio
4. Sesuaikan dengan bidang (web dev, design, photography, videographer, dll)
5. Buat yang bikin user keliatan berpengalaman dan profesional
6. Bahasa Indonesia natural
7. Maksimal 1 halaman A4`;

function cleanAIOutput(text) {
  return text
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .replace(/^Here is.*?:/i, "")
    .replace(/^Berikut.*?:/i, "")
    .replace(/^Ini.*?:/i, "")
    .trim();
}

// ─── Handler ───
async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

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
        "cv = PDF template CV\n" +
        "  tpl=1 Professional (default)\n" +
        "  tpl=2 Modern Sidebar\n" +
        "  tpl=3 Creative Header\n" +
        "  tpl=4 Minimalist\n" +
        "  tpl=5 Executive\n" +
        "surat = PDF template surat (judul center)\n" +
        "word = Word .doc format\n" +
        "aicv = AI buat CV otomatis\n" +
        "aiporto = AI buat portofolio\n\n" +
        "Custom font & warna:\n" +
        "font=helvetica (default)\n" +
        "font=times (serif formal)\n" +
        "font=courier (monospace)\n" +
        "color=navy (judul + isi)\n" +
        "color=#336699 (hex color)\n" +
        "titlecolor=red (judul aja)\n" +
        "size=12 (ukuran font 8-24)\n\n" +
        "Upscale HD image:\n" +
        "img=4 (150dpi HD)\n" +
        "img=8 (300dpi Full HD)\n" +
        "img=16 (600dpi Ultra HD)\n" +
        "out=document (default, no compress)\n" +
        "out=gambar (inline, WA compress)\n" +
        "Bot kirim PDF + PNG HD\n\n" +
        "Warna: navy crimson teal gold indigo\n" +
        "brown maroon olive orange purple\n" +
        "atau hex #RRGGBB\n\n" +
        "Contoh CV manual:\n" +
        prefix + "txttopdf font=times color=navy img=8 cv\n" +
        "Budi Santoso\nSoftware Engineer\n\n" +
        "Contoh AI CV:\n" +
        prefix + "txttopdf aicv buatkan cv lamaran kerja ke restoran. Nama Andi, pengalaman cafe 2 tahun\n" +
        prefix + "txttopdf tpl=2 aicv buatkan cv lamaran ke kantor. Nama Budi, admin, bisa excel\n\n" +
        "Contoh AI Portofolio:\n" +
        prefix + "txttopdf aiporto buatkan portofolio web developer. Nama Sari, proyek: website company, app laundry\n\n" +
        "Bisa juga reply pesan yg berisi teks",
        { title: "Text to PDF/Word Converter" }
      );
    }

    // Parse flags
    const { opts, cleaned: afterFlags } = parseFlags(inputText);

    // Parse mode
    let format = "plain";
    let outputType = "pdf";
    let content = afterFlags;
    let aiGenerated = false;

    const lowerInput = afterFlags.toLowerCase();
    if (lowerInput.startsWith("cv ") || lowerInput.startsWith("cv\n")) {
      format = "cv";
      content = afterFlags.substring(2).trim();
    } else if (lowerInput.startsWith("surat ") || lowerInput.startsWith("surat\n")) {
      format = "surat";
      content = afterFlags.substring(5).trim();
    } else if (lowerInput.startsWith("aicv ") || lowerInput.startsWith("aicv\n") ||
               lowerInput.startsWith("cvai ") || lowerInput.startsWith("cvai\n")) {
      // AI-generated CV
      const userInput = afterFlags.replace(/^aicv\s+|^cvai\s+/i, "").trim();
      if (!userInput || userInput.length < 3) {
        await m.react("❌");
        return m.reply(claraWrap("TxtToPDF AI", "Kasih info buat CV!\nContoh: .txttopdf aicv buatkan cv lamaran ke restoran. Nama Andi, pengalaman cafe 2 thn, skill: masak, pelayanan pelanggan"));
      }
      await m.react("🕐");
      await m.reply(claraWrap("Joki CV AI", "AI lagi nulis CV kamu...\n\nInfo: " + userInput.substring(0, 100) + "..."));
      try {
        const aiResult = await UnlimitedAI(CV_PROMPT.replace("__INPUT__", userInput), "nova-ai");
        if (!aiResult || aiResult.status === false) {
          await m.react("❌");
          return m.reply(claraWrap("TxtToPDF AI", "AI gagal generate CV. Coba lagi nanti."));
        }
        const aiText = typeof aiResult === "string" ? aiResult : (aiResult.answer || "");
        content = cleanAIOutput(aiText);
        format = "cv";
        aiGenerated = true;
      } catch (aiErr) {
        await m.react("❌");
        return m.reply(claraWrap("TxtToPDF AI", "Error AI: " + aiErr.message));
      }
    } else if (lowerInput.startsWith("aiporto ") || lowerInput.startsWith("aiporto\n") ||
               lowerInput.startsWith("portoai ") || lowerInput.startsWith("portoai\n") ||
               lowerInput.startsWith("aiportofolio ") || lowerInput.startsWith("aiportofolio\n")) {
      // AI-generated Portfolio
      const userInput = afterFlags.replace(/^aiporto\s+|^portoai\s+|^aiportofolio\s+/i, "").trim();
      if (!userInput || userInput.length < 3) {
        await m.react("❌");
        return m.reply(claraWrap("TxtToPDF AI", "Kasih info buat portofolio!\nContoh: .txttopdf aiporto buatkan portofolio web dev. Nama Sari, proyek: website company, app laundry, design poster"));
      }
      await m.react("🕐");
      await m.reply(claraWrap("Joki Portofolio AI", "AI lagi nulis portofolio kamu...\n\nInfo: " + userInput.substring(0, 100) + "..."));
      try {
        const aiResult = await UnlimitedAI(PORTO_PROMPT.replace("__INPUT__", userInput), "nova-ai");
        if (!aiResult || aiResult.status === false) {
          await m.react("❌");
          return m.reply(claraWrap("TxtToPDF AI", "AI gagal generate portofolio. Coba lagi nanti."));
        }
        const aiText = typeof aiResult === "string" ? aiResult : (aiResult.answer || "");
        content = cleanAIOutput(aiText);
        format = "cv";
        aiGenerated = true;
      } catch (aiErr) {
        await m.react("❌");
        return m.reply(claraWrap("TxtToPDF AI", "Error AI: " + aiErr.message));
      }
    } else if (lowerInput.startsWith("word ") || lowerInput.startsWith("word\n") ||
               lowerInput.startsWith("doc ") || lowerInput.startsWith("doc\n")) {
      outputType = "doc";
      content = afterFlags.replace(/^word\s+|^doc\s+/i, "").trim();
    }

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

    const timestamp = Date.now();
    const tmpDir = "/tmp";

    const fontName = opts.font.charAt(0).toUpperCase() + opts.font.slice(1);
    const colorDisplay = opts.color || "black";
    const titleColorDisplay = opts.titlecolor ? opts.titlecolor : "(same)";

    if (outputType === "pdf") {
      const pdfBytes = await createPDF(content, format, opts);
      const fileName = "nova_" + timestamp + ".pdf";
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, pdfBytes);

      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      const pdfDoc2 = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc2.getPageCount();
      const wordCount = content.split(/\s+/).length;

      const tplName = format === "cv" && opts.tpl ? " (" + (CV_TEMPLATES[opts.tpl] ? CV_TEMPLATES[opts.tpl].name : "Professional") + ")" : "";
      const formatLabel = (aiGenerated ? "AI Generated " : "") + (format === "cv" ? "CV Template" + tplName : format === "surat" ? "Surat Template" : "Standard PDF");
      const imgLabel = opts.img > 0 ? "\nUpscale: " + opts.img + "x HD image" : "";

      await m.react("✅");
      await sock.sendMessage(m.chat, {
        document: { url: filePath },
        fileName: "dokumen_" + timestamp + ".pdf",
        mimetype: "application/pdf",
        caption: claraWrap("TxtToPDF Berhasil", [
          "Format: " + formatLabel,
          "Font: " + fontName,
          "Warna: " + colorDisplay,
          "Title color: " + titleColorDisplay,
          "Size: " + opts.size + "pt",
          "Halaman: " + pageCount,
          "Kata: " + wordCount,
          "Ukuran: " + sizeKB + " KB" + imgLabel,
        ].join("\n")),
      });

      // Send HD image if requested
      if (opts.img > 0) {
        try {
          const imgBuf = await renderImage(content, format, opts, opts.img);
          const imgPath = path.join(tmpDir, "nova_img_" + timestamp + ".png");
          fs.writeFileSync(imgPath, imgBuf);
          const imgKB = (imgBuf.length / 1024).toFixed(1);
          const resLabel = opts.img === 4 ? "150dpi" : opts.img === 8 ? "300dpi" : "600dpi";

          if (opts.imgmode === "doc") {
            // Send as document — no WA compression, full HD quality
            await sock.sendMessage(m.chat, {
              document: { url: imgPath },
              fileName: "hd_" + opts.img + "x_" + timestamp + ".png",
              mimetype: "image/png",
              caption: claraWrap("HD " + opts.img + "x (Document)", [
                "Resolusi: " + resLabel,
                "Ukuran: " + imgKB + " KB",
                "Mode: Document (no compression)",
              ].join("\n")),
            });
          } else {
            // Send as image — WA compresses but inline preview
            await sock.sendMessage(m.chat, {
              image: { url: imgPath },
              caption: claraWrap("HD Preview " + opts.img + "x", [
                "Resolusi: " + resLabel,
                "Ukuran: " + imgKB + " KB",
                "Mode: Gambar (WA compressed)",
              ].join("\n")),
            });
          }

          setTimeout(() => { try { fs.unlinkSync(imgPath); } catch (e) {} }, 60000);
        } catch (imgErr) {
          console.error("Image render error:", imgErr);
        }
      }

      setTimeout(() => { try { fs.unlinkSync(filePath); } catch (e) {} }, 60000);

    } else {
      const html = createDoc(content, format, opts);
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
          "Font: " + fontName,
          "Warna: " + colorDisplay,
          "Title color: " + titleColorDisplay,
          "Size: " + opts.size + "pt",
          "Kata: " + wordCount,
          "Ukuran: " + sizeKB + " KB",
        ].join("\n")),
      });

      // Send HD image for Word too
      if (opts.img > 0) {
        try {
          const imgBuf = await renderImage(content, format, opts, opts.img);
          const imgPath = path.join(tmpDir, "nova_img_" + timestamp + ".png");
          fs.writeFileSync(imgPath, imgBuf);
          const imgKB = (imgBuf.length / 1024).toFixed(1);
          const resLabel = opts.img === 4 ? "150dpi" : opts.img === 8 ? "300dpi" : "600dpi";

          if (opts.imgmode === "doc") {
            // Send as document — no WA compression, full HD quality
            await sock.sendMessage(m.chat, {
              document: { url: imgPath },
              fileName: "hd_" + opts.img + "x_" + timestamp + ".png",
              mimetype: "image/png",
              caption: claraWrap("HD " + opts.img + "x (Document)", [
                "Resolusi: " + resLabel,
                "Ukuran: " + imgKB + " KB",
                "Mode: Document (no compression)",
              ].join("\n")),
            });
          } else {
            // Send as image — WA compresses but inline preview
            await sock.sendMessage(m.chat, {
              image: { url: imgPath },
              caption: claraWrap("HD Preview " + opts.img + "x", [
                "Resolusi: " + resLabel,
                "Ukuran: " + imgKB + " KB",
                "Mode: Gambar (WA compressed)",
              ].join("\n")),
            });
          }

          setTimeout(() => { try { fs.unlinkSync(imgPath); } catch (e) {} }, 60000);
        } catch (imgErr) {
          console.error("Image render error:", imgErr);
        }
      }

      setTimeout(() => { try { fs.unlinkSync(filePath); } catch (e) {} }, 60000);
    }
  } catch (e) {
    console.error("txttopdf error:", e);
    await m.react("❌");
    return m.reply(claraWrap("TxtToPDF", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
