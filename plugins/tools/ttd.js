// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { PDFDocument, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

async function saveTemp(buffer, ext) {
  const tmpdir = os.tmpdir();
  const name = `nova_ttd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filepath = path.join(tmpdir, name);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}
function cleanup(filepath) {
  try { if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (e) { console.error('[ttd.js]:', e.message); }
}

// ── PNG signature → transparent background overlay ──────────────
async function stampSignatureOnPDF(pdfBuffer, sigBuffer, opts = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const sigImage = await pdfDoc.embedPng(sigBuffer);

  const posX = opts.x !== undefined ? opts.x : 50;
  const posY = opts.y !== undefined ? opts.y : 80;
  const scale = opts.scale || 0.3;

  const sigW = sigImage.width * scale;
  const sigH = sigImage.height * scale;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const targetPage = opts.page ? opts.page - 1 : pages.length - 1;
    if (i === targetPage) {
      page.drawImage(sigImage, {
        x: posX,
        y: posY,
        width: sigW,
        height: sigH,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── Add text signature (handwritten style) ──────────────────────
async function addTextSignaturePDF(pdfBuffer, name, opts = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont("Times-Italic");
  const pages = pdfDoc.getPages();

  const posX = opts.x !== undefined ? opts.x : 50;
  const posY = opts.y !== undefined ? opts.y : 80;
  const fontSize = opts.size || 28;

  for (let i = 0; i < pages.length; i++) {
    const targetPage = opts.page ? opts.page - 1 : pages.length - 1;
    if (i === targetPage) {
      pages[i].drawText(name, {
        x: posX,
        y: posY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0.2),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";
  const parsed = (args || "").trim();

  // Parse options: page=N, x=N, y=N, size=N, scale=N
  const optMatch = (key) => {
    const r = new RegExp(`${key}=(\\d+(?:\\.\\d+)?)`, "i").exec(parsed);
    return r ? parseFloat(r[1]) : undefined;
  };
  const opts = {};
  const page = optMatch("page");
  const x = optMatch("x");
  const y = optMatch("y");
  const size = optMatch("size");
  const scale = optMatch("scale");
  if (page) opts.page = page;
  if (x !== undefined) opts.x = x;
  if (y !== undefined) opts.y = y;
  if (size) opts.size = size;
  if (scale) opts.scale = scale;

  // Clean args (remove opt params)
  const cleanArgs = parsed.replace(/\b(page|x|y|size|scale)=\d+(?:\.\d+)?\b/gi, "").trim();

  // Check mode
  const isImageMode = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
  const isPdfReplied = m.quoted && m.quoted.type === "documentMessage";
  const pdfMime = m.quoted?.msg?.mimetype || "";

  // Mode 1: Image signature (reply PDF, then reply signature image)
  // User sends signature image with caption .ttd, replying to a PDF message
  // Mode 2: Text signature - .ttd Nama Lengkap replying to PDF
  // Mode 3: Help

  // Check: is user replying to a PDF?
  if (!isPdfReplied && !pdfMime.includes("pdf")) {
    const help = claraWrap("Ttd", [
      `Tanda Tangan Digital di PDF`,
      ``,
      `*Mode Gambar (ttd gambar):*`,
      `  1. Reply pesan PDF`,
      `  2. Kirim gambar tanda tangan dengan caption:`,
      `     ${prefix}ttd`,
      ``,
      `*Mode Teks (ttd nama):*`,
      `  1. Reply pesan PDF`,
      `  2. Ketik: ${prefix}ttd Nama Lengkap`,
      ``,
      `*ᴏᴘꜱɪ:*`,
      `  page=N (halaman ke-N, default: halaman terakhir)`,
      `  x=N y=N (posisi ttd, default: 50, 80)`,
      `  scale=N (ukuran gambar, default: 0.3)`,
      `  size=N (ukuran font, default: 28)`,
      ``,
      `💡 Contoh:`,
      `  ${prefix}ttd Budi Santoso`,
      `  ${prefix}ttd Budi Santoso page=1 x=100 y=150`,
    ].join("\n"));
    return m.reply(help);
  }
  try {
    await m.react("🕒");
    // Download the PDF from replied message
    const pdfBuffer = await m.quoted.download();
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return m.reply(claraWrap("Ttd", "❌ Gagal download PDF."));
    }

    let resultBuffer;

    if (isImageMode) {
      // Image signature mode
      m.reply(claraWrap("Ttd", "Stamp tanda tangan gambar ke PDF..."));
      let sigBuffer;
      if (m.quoted && m.quoted.isMedia && m.quoted.type === "imageMessage") {
        // Signature is the quoted image, PDF is the quoted-of-quoted (not possible in WA)
        // Actually, user should send image with caption .ttd, replying to PDF
        sigBuffer = await m.quoted.download();
      } else {
        sigBuffer = await m.download();
      }

      if (!sigBuffer || sigBuffer.length === 0) {
        return m.reply(claraWrap("Ttd", "❌ Gagal download gambar tanda tangan."));
      }

      // Convert to PNG if needed (pdf-lib needs PNG for transparency)
      // If it's already PNG, use directly. If JPEG, embed as jpg (no transparency)
      try {
        resultBuffer = await stampSignatureOnPDF(pdfBuffer, sigBuffer, opts);
      } catch {
        // Try embedding as JPG
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const jpgImage = await pdfDoc.embedJpg(sigBuffer);
        const targetPage = opts.page ? opts.page - 1 : pages.length - 1;
        const sc = opts.scale || 0.3;
        pages[targetPage].drawImage(jpgImage, {
          x: opts.x !== undefined ? opts.x : 50,
          y: opts.y !== undefined ? opts.y : 80,
          width: jpgImage.width * sc,
          height: jpgImage.height * sc,
        });
        const pdfBytes = await pdfDoc.save();
        resultBuffer = Buffer.from(pdfBytes);
      }
    } else if (cleanArgs.length > 0) {
      // Text signature mode
      m.reply(claraWrap("Ttd", "Tambah tanda tangan teks ke PDF..."));
      resultBuffer = await addTextSignaturePDF(pdfBuffer, cleanArgs, opts);
    } else {
      return m.reply(claraWrap("Ttd", `❌ Kirim gambar ttd atau ketik nama. Contoh: ${prefix}ttd Budi Santoso`));
    }

    if (!resultBuffer) {
      return m.reply(claraWrap("Ttd", "❌ Gagal menambahkan tanda tangan."));
    }

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      document: resultBuffer,
      mimetype: "application/pdf",
      fileName: `ttd_${Date.now()}.pdf`,
    }, { quoted: m });
  } catch (error) {
    await m.react("❌");
    console.error("ttd error:", error);
    m.reply(claraWrap("Ttd", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "ttd",
  alias: ["ttd"],
  category: "tools",
  description: "Tanda tangan digital di PDF (gambar atau teks nama)",
  usage: ".ttd Nama Lengkap (reply PDF)\n.ttd (kirim gambar ttd, reply PDF)",
  example: ".ttd Budi Santoso",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
