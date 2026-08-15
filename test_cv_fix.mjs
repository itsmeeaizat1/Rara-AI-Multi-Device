import { Canvas } from 'skia-canvas';
import fs from 'fs';

const FONTS = {
  helvetica: { name: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
  times: { name: 'Times Roman', css: 'Times New Roman, serif' },
  courier: { name: 'Courier', css: 'Courier New, monospace' },
};

const CV_TEMPLATES = {
  1: { name: "Professional", accent: "#000080", light: "#000050", bg: null },
  2: { name: "Modern Sidebar", accent: "#1a5276", light: "#d4e6f1", bg: "#1a5276" },
  3: { name: "Creative Header", accent: "#8e44ad", light: "#f5eef8", bg: null },
  4: { name: "Minimalist", accent: "#333333", light: "#666666", bg: null },
  5: { name: "Executive", accent: "#1c3d3a", light: "#c0c0c0", bg: null },
};

function parseColor(input) {
  if (!input) return [0, 0, 0];
  const lower = input.toLowerCase().trim();
  const COLORS = { navy: [0,0,0.5], crimson: [0.86,0.08,0.24], teal: [0,0.5,0.5], gold: [0.84,0.65,0], indigo: [0.29,0,0.51], maroon: [0.5,0,0], red: [1,0,0], blue: [0,0,1], green: [0,0.5,0] };
  if (COLORS[lower]) return COLORS[lower];
  if (/^#[0-9a-f]{6}$/i.test(lower)) return [parseInt(lower.substring(1, 3), 16) / 255, parseInt(lower.substring(3, 5), 16) / 255, parseInt(lower.substring(5, 7), 16) / 255];
  return null;
}

function cssColor(input) {
  const CSS = { navy: "#000080", crimson: "#dc143c", teal: "#008080", gold: "#d4af37", indigo: "#4b0082", maroon: "#800000", red: "#ff0000", blue: "#0000ff", green: "#008000" };
  if (!input) return "#000000";
  const lower = input.toLowerCase().trim();
  if (CSS[lower]) return CSS[lower];
  if (/^#[0-9a-f]{3,6}$/i.test(lower)) return lower;
  return "#000000";
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

async function renderCV_PNG(cv, tpl, opts, scale) {
  const scheme = CV_TEMPLATES[tpl] || CV_TEMPLATES[1];
  // Use user custom color as accent if provided (not default black)
  const accent = (opts.color && opts.color !== "black") ? cssColor(opts.color) : scheme.accent;
  // Auto-generate light variant from accent
  const accentLightHex = (() => {
    const rgb = parseColor(opts.color && opts.color !== "black" ? opts.color : scheme.accent);
    if (!rgb) return scheme.light;
    // Mix accent with 80% white for a very light tint (better contrast with accent text)
    const mix = (c) => Math.min(255, Math.round(c*255 * 0.2 + 255 * 0.8));
    return "#" + mix(rgb[0]).toString(16).padStart(2,"0") + mix(rgb[1]).toString(16).padStart(2,"0") + mix(rgb[2]).toString(16).padStart(2,"0");
  })();
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
          const subW1 = wrap("• " + item.text, Math.round(11 * scale) + "px " + font, contentW - Math.round(14 * scale));
          for (const w of subW1) { ctx.fillText(w, margin + Math.round(14 * scale), y); y += lineH; }
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
      ctx.fillStyle = accentLightHex;
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
      ctx.fillStyle = accentLightHex;
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
      ctx.fillStyle = accentLightHex;
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
      ctx.strokeStyle = accentLightHex;
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
          const subW2 = wrap("• " + item.text, Math.round(11 * scale) + "px " + font, mainW - Math.round(14 * scale));
          for (const w of subW2) { ctx.fillText(w, mainX + Math.round(14 * scale), my); my += lineH; }
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
      
      ctx.fillStyle = accentLightHex;
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
          const subWrapped = wrap("> " + item.text, Math.round(11 * scale) + "px " + font, contentW - Math.round(20 * scale));
          for (const w of subWrapped) { ctx.fillText(w, margin + Math.round(14 * scale), y); y += lineH; }
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
          ctx.fillText(">", colX, cy);
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


// === PDF CV TEMPLATE RENDERER ===

const cvText = `ANDI PRATAMA
Waiters - Jakarta
andi.pratama@email.com | 081234567890

# PROFIL
Profesional berdedikasi dengan pengalaman 2 tahun di industri kuliner.

# PENGALAMAN
- Barista & Pelayan di Kopi Senja (2022-2024)
Bertanggung jawab atas penyajian kopi dan makanan dan memastikan kepuasan tamu.
Berhasil meningkatkan retensi pelanggan sebesar 15% melalui pelayanan ramah.

# PENDIDIKAN
- SMA Negeri 1 Jakarta (2021)

# SKILL
- Memasak (masakan fusion, hidangan pembuka)
- Pelayanan Pelanggan
- Sistem POS & Kebersihan Sanitasi
- Komunikasi Efektif`;

const testData = parseCVContent(cvText);

async function testAll() {
  const cases = [
    { tpl: 3, color: 'crimson' },
    { tpl: 2, color: 'red' },
    { tpl: 1, color: 'maroon' },
  ];
  for (const c of cases) {
    const opts = { font: 'times', color: c.color, tpl: c.tpl };
    const buf = await renderCV_PNG(testData, c.tpl, opts, 2.5);
    fs.writeFileSync(`/tmp/cv_fix_tpl${c.tpl}_${c.color}.png`, buf);
    console.log(`T${c.tpl} + ${c.color}: ${(buf.length/1024).toFixed(1)} KB`);
  }
  console.log('Done!');
}

testAll().catch(e => console.error(e));
