// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

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

// ── Add kop surat to existing PDF ────────────────────────────────
async function addKopToPDF(pdfBuffer, kopData, opts = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const instansi = kopData.instansi || "[NAMA INSTANSI]";
  const alamat = kopData.alamat || "[ALAMAT]";
  const telepon = kopData.telepon || "[TELEPON]";
  const email = kopData.email || "[EMAIL]";
  const website = kopData.website || "";

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width: pageW } = page.getSize();
    const margin = 50;
    const kopWidth = pageW - margin * 2;

    // Draw top border line
    page.drawLine({
      start: { x: margin, y: 800 },
      end: { x: pageW - margin, y: 800 },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
    // Draw second line (double border)
    page.drawLine({
      start: { x: margin, y: 797 },
      end: { x: pageW - margin, y: 797 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    let y = 820;

    // Instansi name (centered, bold, large)
    const instansiSize = 14;
    const instansiWidth = boldFont.widthOfTextAtSize(instansi.toUpperCase(), instansiSize);
    page.drawText(instansi.toUpperCase(), {
      x: (pageW - instansiWidth) / 2,
      y,
      size: instansiSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    // Alamat (centered)
    const addrSize = 10;
    const addrLines = wrapText(alamat, font, addrSize, kopWidth);
    for (const line of addrLines) {
      const lineW = font.widthOfTextAtSize(line, addrSize);
      page.drawText(line, {
        x: (pageW - lineW) / 2,
        y,
        size: addrSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 14;
    }

    // Telepon, email, website (centered, comma-separated)
    const contactParts = [telepon, email, website].filter(Boolean).join(" | ");
    if (contactParts) {
      const contactW = font.widthOfTextAtSize(contactParts, addrSize);
      page.drawText(contactParts, {
        x: (pageW - contactW) / 2,
        y,
        size: addrSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── Parse kop data from args ─────────────────────────────────────
function parseKopArgs(args) {
  const result = {};
  const regexMap = {
    instansi: /instansi[:=]\s*([^\|]+?)(?=\s+(?:alamat|telepon|email|website)[:=]|$)/i,
    alamat: /alamat[:=]\s*([^\|]+?)(?=\s+(?:instansi|telepon|email|website)[:=]|$)/i,
    telepon: /telepon[:=]\s*([^\|]+?)(?=\s+(?:instansi|alamat|email|website)[:=]|$)/i,
    email: /email[:=]\s*([^\|]+?)(?=\s+(?:instansi|alamat|telepon|website)[:=]|$)/i,
    website: /website[:=]\s*([^\|]+?)(?=\s+(?:instansi|alamat|telepon|email)[:=]|$)/i,
  };

  for (const [key, regex] of Object.entries(regexMap)) {
    const match = args.match(regex);
    if (match) result[key] = match[1].trim();
  }

  return result;
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  // Check: user must reply to a PDF
  const isPdf = m.quoted && m.quoted.type === "documentMessage";
  const pdfMime = m.quoted?.msg?.mimetype || "";

  if (!isPdf && !pdfMime.includes("pdf")) {
    const help = raraWrap("Kop", [
      `Tambah Kop Surat ke PDF`,
      ``,
      `📌 Format:`,
      `  Reply PDF, ketik:`,
      `  ${prefix}kop instansi=PT Maju Jaya alamat=Jl. Merdeka 1 Jakarta telepon=021123456 email=info@ptmaju.com`,
      ``,
      `*parameter:*`,
      `  instansi= (nama instansi/perusahaan)`,
      `  alamat= (alamat lengkap)`,
      `  telepon= (nomor telepon)`,
      `  email= (alamat email)`,
      `  website= (situs web, opsional)`,
      ``,
      `Kop surat ditambah di setiap halaman`,
      `Double border line (standar surat resmi)`,
    ].join("\n"));
    return m.reply( help, "kop");
  }

  // Parse kop data
  const kopData = parseKopArgs(args || "");

  if (!kopData.instansi) {
    return m.reply(raraWrap("Kop", `❌ Minimal isi instansi= \n\n💡 *Contoh:* ${prefix}kop instansi=PT Maju Jaya alamat=Jl. Merdeka 1 Jakarta`));
  }
  m.reply(raraWrap("Kop", "Tambah kop surat ke PDF..."));

  try {
    await m.react("🕒");
    const pdfBuffer = await m.quoted.download();
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return m.reply(raraWrap("Kop", "❌ Gagal download PDF."));
    }

    const resultBuffer = await addKopToPDF(pdfBuffer, kopData);

    await m.react("🐣");
    let card = "";
    try {
      const info = await probeBuffer(resultBuffer);
      card = mediaResultCard({
        header: "kop",
        type: "dokumen",
        request: [["Input", "PDF"]],
        size: info.size, mime: info.mime,
      });
    } catch { /* best-effort */ }
    await sock.sendMessage(m.chat, {
      document: resultBuffer,
      mimetype: "application/pdf",
      fileName: `kop_${Date.now()}.pdf`,
      caption: card,
    }, { quoted: m });
  } catch (error) {
    await m.react("❌");
    console.error("kop error:", error);
    m.reply(raraWrap("Kop", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "kop",
  alias: ["kop"],
  category: "tools",
  description: "Tambah kop surat instansi/perusahaan ke PDF yang sudah ada",
  usage: ".kop instansi=Nama alamat=Alamat telepon=Nomor email=Email (reply PDF)",
  example: ".kop instansi=PT Maju Jaya alamat=Jl. Merdeka 1 telepon=021123 email=info@maju.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
