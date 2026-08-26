// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pdftools",
  alias: ["pdftools"],
  category: "tools",
  description: "Tools PDF: image to PDF, merge PDF, extract text, info PDF, split PDF, compress PDF",
  usage:
    ".pdftools img2pdf (reply/kirim gambar)\n.pdftools merge (reply 2+ PDF)\n.pdftools info (reply PDF)\n.pdftools split (reply PDF)\n.pdftools text (reply PDF)\n.pdftools pages (reply PDF)\n.pdftools rotate (reply PDF)\n.pdftools compress (reply PDF)",
  example: ".pdftools img2pdf",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function downloadFile(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
}

async function saveTemp(buffer, ext) {
  const tmpdir = os.tmpdir();
  const name = "nova_pdf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const filepath = path.join(tmpdir, name);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

function cleanupTemp(filepath) {
  try { if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (e) { console.error('[pdftools.js]:', e.message); }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

async function handler(m, { sock }) {
  const subCmd = (m.args?.[0] || "").toLowerCase();
  const prefix = m.prefix || ".";

  if (!subCmd) {
    let txt = "PDF TOOLS\n\n";
    txt += "1. img2pdf — Gambar ke PDF (reply/kirim gambar)\n";
    txt += "   .pdftools img2pdf\n\n";
    txt += "2. merge — Gabung 2+ PDF jadi 1 (reply PDF)\n";
    txt += "   .pdftools merge\n\n";
    txt += "3. info — Info detail PDF (reply PDF)\n";
    txt += "   .pdftools info\n\n";
    txt += "4. split — Pisah PDF per halaman (reply PDF)\n";
    txt += "   .pdftools split\n\n";
    txt += "5. text — Extract teks dari PDF (reply PDF)\n";
    txt += "   .pdftools text\n\n";
    txt += "6. pages — Jumlah halaman PDF (reply PDF)\n";
    txt += "   .pdftools pages\n\n";
    txt += "7. rotate — Rotasi PDF 90 derajat (reply PDF)\n";
    txt += "   .pdftools rotate\n\n";
    txt += "8. compress — Kompres ukuran PDF (reply PDF)\n";
    txt += "   .pdftools compress\n\n";
    txt += "Cara pakai: Reply file PDF/gambar dengan command di atas";
    return m.reply( txt, "pdftools");
  }

  // === img2pdf ===
  if (subCmd === "img2pdf" || subCmd === "image2pdf" || subCmd === "img") {
    return imgToPdf(m, sock);
  }

  // === merge ===
  if (subCmd === "merge" || subCmd === "combine" || subCmd === "gabung") {
    return mergePdf(m, sock);
  }

  // === info ===
  if (subCmd === "info" || subCmd === "detail") {
    return pdfInfo(m, sock);
  }

  // === split ===
  if (subCmd === "split" || subCmd === "pisah") {
    return splitPdf(m, sock);
  }

  // === text ===
  if (subCmd === "text" || subCmd === "extract") {
    return extractText(m, sock);
  }

  // === pages ===
  if (subCmd === "pages" || subCmd === "count") {
    return pageCount(m, sock);
  }

  // === rotate ===
  if (subCmd === "rotate" || subCmd === "putar") {
    return rotatePdf(m, sock);
  }

  // === compress ===
  if (subCmd === "compress" || subCmd === "kompres" || subCmd === "kecilin") {
    return compressPdf(m, sock);
  }

  return m.reply(claraWrap("Pdftools", "Subcommand tidak dikenal. Ketik .pdftools buat lihat daftar."));
}

// === IMAGE TO PDF ===
async function imgToPdf(m, sock) {
  let images = [];

  // Cek quoted message (gambar yang di-reply)
  if (m.quoted && (m.quoted.image || m.quoted.mimetype?.startsWith("image/"))) {
    images.push(m.quoted);
  }

  // Cek gambar di pesan sendiri
  if (m.image || m.mimetype?.startsWith("image/")) {
    images.push(m);
  }

  if (images.length === 0) {
    return m.reply(claraWrap("Pdftools", "Kirim atau reply 1+ gambar dengan caption .pdftools img2pdf"));
  }

  try {
    const pdfDoc = await PDFDocument.create();
    let processed = 0;

    for (const img of images) {
      let buffer;
      if (img.url) {
        buffer = await downloadFile(img.url);
      } else if (img.buffer) {
        buffer = img.buffer;
      } else {
        continue;
      }

      const isPng = (img.mimetype || "").includes("png");
      let pdfImage;
      if (isPng) {
        pdfImage = await pdfDoc.embedPng(buffer);
      } else {
        // Default JPEG (juga untuk jpg, webp, dll)
        try {
          pdfImage = await pdfDoc.embedJpg(buffer);
        } catch {
          // Coba PNG kalau JPEG gagal
          pdfImage = await pdfDoc.embedPng(buffer);
        }
      }

      const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
      page.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: pdfImage.width,
        height: pdfImage.height,
      });
      processed++;
    }

    if (processed === 0) {
      return m.reply(claraWrap("pdftools", "Gagal memproses gambar. Pastikan gambar valid."));
    }

    const pdfBytes = await pdfDoc.save();
    const filepath = await saveTemp(Buffer.from(pdfBytes), "pdf");

    await sock.sendMessage(m.chat, {
      document: { url: filepath },
      fileName: "images_" + Date.now() + ".pdf",
      mimetype: "application/pdf",
      caption: "Image to PDF berhasil\n\nHalaman: " + processed + "\nUkuran: " + formatSize(pdfBytes.length),
    }, { quoted: m });

    cleanupTemp(filepath);
  } catch (e) {
    console.error("[pdftools img2pdf] Error:", e.message);
    return m.reply("Gagal membuat PDF: " + e.message);
  }
}

// === MERGE PDF ===
async function mergePdf(m, sock) {
  // Untuk merge, user reply pesan yang ada PDF attachment
  // Atau kirim 2+ PDF di pesan berbeda
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF untuk digabung. Kirim minimal 2 PDF.\n\nCara: Reply PDF pertama dengan .pdftools merge, lalu reply PDF kedua dengan command yang sama."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan di pesan yang di-reply."));
    }

    const mergedPdf = await PDFDocument.create();
    const srcPdf = await PDFDocument.load(pdfBuffer);
    const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    for (const page of pages) mergedPdf.addPage(page);

    // Cek apakah ada multiple quoted (chain)
    let current = m.quoted;
    let extraCount = 0;
    while (current?.quoted) {
      try {
        const extraBuffer = current.quoted.buffer || (current.quoted.url ? await downloadFile(current.quoted.url) : null);
        if (extraBuffer) {
          const extraPdf = await PDFDocument.load(extraBuffer);
          const extraPages = await mergedPdf.copyPages(extraPdf, extraPdf.getPageIndices());
          for (const page of extraPages) mergedPdf.addPage(page);
          extraCount++;
        }
      } catch (e) { console.error('[pdftools.js]:', e.message); }
      current = current.quoted;
    }

    const pdfBytes = await mergedPdf.save();
    const filepath = await saveTemp(Buffer.from(pdfBytes), "pdf");

    await sock.sendMessage(m.chat, {
      document: { url: filepath },
      fileName: "merged_" + Date.now() + ".pdf",
      mimetype: "application/pdf",
      caption: "Merge PDF berhasil\n\nTotal halaman: " + mergedPdf.getPageCount() + "\nUkuran: " + formatSize(pdfBytes.length),
    }, { quoted: m });

    cleanupTemp(filepath);
  } catch (e) {
    console.error("[pdftools merge] Error:", e.message);
    return m.reply("Gagal merge PDF: " + e.message);
  }
}

// === PDF INFO ===
async function pdfInfo(m, sock) {
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF untuk lihat info."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan."));
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle() || "-";
    const author = pdfDoc.getAuthor() || "-";
    const subject = pdfDoc.getSubject() || "-";
    const creator = pdfDoc.getCreator() || "-";
    const producer = pdfDoc.getProducer() || "-";
    const creationDate = pdfDoc.getCreationDate();
    const modDate = pdfDoc.getModificationDate();

    let txt = "INFO PDF\n\n";
    txt += "Halaman: " + pageCount + "\n";
    txt += "Ukuran: " + formatSize(pdfBuffer.length) + "\n\n";
    txt += "Metadata:\n";
    txt += "Judul: " + title + "\n";
    txt += "Author: " + author + "\n";
    txt += "Subject: " + subject + "\n";
    txt += "Creator: " + creator + "\n";
    txt += "Producer: " + producer + "\n";
    if (creationDate) txt += "Dibuat: " + creationDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + "\n";
    if (modDate) txt += "Dimodifikasi: " + modDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + "\n";

    // Info halaman pertama
    if (pageCount > 0) {
      const firstPage = pdfDoc.getPage(0);
      const size = firstPage.getSize();
      txt += "\nUkuran halaman: " + Math.round(size.width) + " x " + Math.round(size.height) + " pt\n";
      txt += "Orientasi: " + (size.width > size.height ? "Landscape" : "Portrait");
    }

    return m.reply( txt, "pdftools");
  } catch (e) {
    return m.reply("Gagal membaca PDF: " + e.message);
  }
}

// === SPLIT PDF ===
async function splitPdf(m, sock) {
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF untuk di-split per halaman."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan."));
    }

    const srcPdf = await PDFDocument.load(pdfBuffer);
    const pageCount = srcPdf.getPageCount();

    if (pageCount > 20) {
      return m.reply("PDF terlalu banyak halaman (" + pageCount + "). Maksimal 20 halaman untuk split.\n\nGunakan .pdftools compress untuk kompres saja.");
    }

    await m.react("🕒");
    let sent = 0;
    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      const filepath = await saveTemp(Buffer.from(pdfBytes), "pdf");

      await sock.sendMessage(m.chat, {
        document: { url: filepath },
        fileName: "page_" + (i + 1) + ".pdf",
        mimetype: "application/pdf",
      }, { quoted: m });

      cleanupTemp(filepath);
      sent++;
      // Delay biar gak spam
      if (i < pageCount - 1) await new Promise(r => setTimeout(r, 500));
    }

    await m.reply("Split selesai. " + sent + " file PDF terkirim (1 halaman per file).");
  } catch (e) {
    return m.reply("Gagal split PDF: " + e.message);
  }
}

// === EXTRACT TEXT (basic) ===
async function extractText(m, sock) {
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF untuk extract teks."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan."));
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    let extracted = "";

    for (let i = 0; i < pageCount && i < 10; i++) {
      const page = pdfDoc.getPage(i);
      const text = await page.getTextContent?.();
      if (text) {
        extracted += "=== Halaman " + (i + 1) + " ===\n";
        extracted += text.items.map(item => item.str).join(" ") + "\n\n";
      }
    }

    if (!extracted) {
      // pdf-lib tidak support text extraction dengan baik
      return m.reply("Extract teks tidak didukung penuh oleh pdf-lib.\n\nPDF ini punya " + pageCount + " halaman.\n\nUntuk extract teks, gunakan .pdftools info untuk metadata saja.\n\nAlternatif: gunakan .ocr untuk scan gambar dari PDF.");
    }

    if (extracted.length > 3000) extracted = extracted.slice(0, 3000) + "\n\n... (dipotong, terlalu panjang)";

    return m.reply("EXTRACT TEKS PDF\n\n" + extracted);
  } catch (e) {
    return m.reply("Gagal extract teks: " + e.message);
  }
}

// === PAGE COUNT ===
async function pageCount(m, sock) {
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan."));
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const count = pdfDoc.getPageCount();

    let txt = "JUMLAH HALAMAN PDF\n\n";
    txt += "Halaman: " + count + "\n";
    txt += "Ukuran file: " + formatSize(pdfBuffer.length);

    return m.reply(claraWrap("pdftools", txt));
  } catch (e) {
    return m.reply("Gagal membaca PDF: " + e.message);
  }
}

// === ROTATE PDF ===
async function rotatePdf(m, sock) {
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF untuk dirotasi."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan."));
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + 90));
    }

    const pdfBytes = await pdfDoc.save();
    const filepath = await saveTemp(Buffer.from(pdfBytes), "pdf");

    await sock.sendMessage(m.chat, {
      document: { url: filepath },
      fileName: "rotated_" + Date.now() + ".pdf",
      mimetype: "application/pdf",
      caption: "Rotasi PDF berhasil (+90 derajat)\n\nHalaman: " + pages.length + "\nUkuran: " + formatSize(pdfBytes.length),
    }, { quoted: m });

    cleanupTemp(filepath);
  } catch (e) {
    return m.reply("Gagal rotasi PDF: " + e.message);
  }
}

// === COMPRESS PDF ===
async function compressPdf(m, sock) {
  if (!m.quoted) {
    return m.reply(claraWrap("Pdftools", "Reply pesan yang mengandung file PDF untuk dikompres."));
  }

  try {
    const pdfBuffer = m.quoted.buffer || (m.quoted.url ? await downloadFile(m.quoted.url) : null);
    if (!pdfBuffer) {
      return m.reply(claraWrap("pdftools", "File PDF tidak ditemukan."));
    }

    const originalSize = pdfBuffer.length;
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Kompres dengan opsi: hapus metadata, gunakan object streams
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedSize = pdfBytes.length;
    const reduction = Math.round((1 - compressedSize / originalSize) * 100);
    const filepath = await saveTemp(Buffer.from(pdfBytes), "pdf");

    let caption = "Kompres PDF selesai\n\n";
    caption += "Sebelum: " + formatSize(originalSize) + "\n";
    caption += "Sesudah: " + formatSize(compressedSize) + "\n";
    caption += "Pengurangan: " + (reduction > 0 ? reduction + "%" : "0% (sudah optimal)");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      document: { url: filepath },
      fileName: "compressed_" + Date.now() + ".pdf",
      mimetype: "application/pdf",
      caption: caption,
    }, { quoted: m });

    cleanupTemp(filepath);
  } catch (e) {
    return m.reply("Gagal kompres PDF: " + e.message);
  }
}

export { pluginConfig as config, handler };
