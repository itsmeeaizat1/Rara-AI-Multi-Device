// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const KONTRAK_PROMPT = `Kamu adalah ahli hukum Indonesia. Buatkan draft kontrak/perjanjian resmi berdasarkan informasi user.

Format kontrak WAJIB:
1. JUDUL KONTRAK (di tengah, huruf kapital)
2. PREAMBUL - menyatakan pihak-pihak yang terlibat
   "Pada hari ini, [Hari], tanggal [Tanggal], bertempat di [Kota], kami yang bertanda tangan di bawah ini:"
3. PIHAK PERTAMA: [nama, jabatan, alamat]
4. PIHAK KEDUA: [nama, jabatan, alamat]
5. KLAUSA-KLAUSA:
   - Pasal 1: Ruang Lingkup
   - Pasal 2: Hak dan Kewajiban
   - Pasal 3: Jangka Waktu
   - Pasal 4: Pembayaran/Kompensasi (jika relevant)
   - Pasal 5: Kerahasiaan
   - Pasal 6: Force Majeure
   - Pasal 7: Penyelesaian Sengketa
   - Pasal 8: Penutup
6. TEMPAT DAN TANGGAL
7. TANDA TANGAN:
   PIHAK PERTAMA          PIHAK KEDUA
   (tanda tangan)         (tanda tangan)
   [Nama]                 [Nama]
   [Jabatan]              [Jabatan]

Aturan:
- Bahasa Indonesia formal/hukum
- JANGAN pakai markdown (##, **, dll), plain text murni
- Sertakan klausa standar yang relevan
- Jika info kurang, isi dengan [perlu diisi] agar user bisa edit
- Sesuaikan jenis kontrak: kerja, MoU, perjanjian kerjasama, jasa, sewa
- Pisahkan pasal dengan baris kosong
- Gunakan penomoran pasal yang konsisten

Input user: __INPUT__`;

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

async function renderKontrakPDF(text) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const pageW = 595.28, pageH = 841.89, margin = 56.7;
  const maxWidth = pageW - margin * 2;
  const fontSize = 11, lineHeight = fontSize * 1.5;

  const lines = text.split("\n");
  let y = pageH - margin;
  let page = pdfDoc.addPage([pageW, pageH]);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (y < margin + lineHeight) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
    if (line.trim() === "") { y -= lineHeight * 0.6; continue; }

    // Detect title (all caps, contains KONTRAK/PERJANJIAN/MOU)
    const isTitle = /KONTRAK|PERJANJIAN|MEMORANDUM|MoU|MOU/.test(line.trim()) && line.trim() === line.trim().toUpperCase();
    // Detect pasal headers
    const isPasal = /^Pasal\s+\d+/i.test(line.trim()) || /^(PIHAK PERTAMA|PIHAK KEDUA|PREAMBUL|TANDA TANGAN|TEMPAT DAN TANGGAL)/.test(line.trim());

    const useFont = (isTitle || isPasal) ? boldFont : font;
    const isCenter = isTitle;
    const wrapped = wrapText(line, useFont, fontSize, maxWidth);

    for (const wl of wrapped) {
      if (y < margin + lineHeight) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
      const textWidth = useFont.widthOfTextAtSize(wl, fontSize);
      const x = isCenter ? (pageW - textWidth) / 2 : margin;
      page.drawText(wl, { x, y, size: fontSize, font: useFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  // Page numbers
  const pages = pdfDoc.getPages();
  const numFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    const numText = `${i + 1} / ${pages.length}`;
    const numW = numFont.widthOfTextAtSize(numText, 8);
    pg.drawText(numText, { x: (pageW - numW) / 2, y: 20, size: 8, font: numFont, color: rgb(0.5, 0.5, 0.5) });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  if (!args || args.trim().length < 10) {
    const help = claraWrap("Kontrak", [
      `│ AI Generator Kontrak/Perjanjian → PDF`,
      ``,
      `│ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  ${prefix}kontrak <jenis> <detail>`,
      ``,
      `│ *ᴊᴇɴɪꜱ:*`,
      `  kerja, MoU, kerjasama, jasa, sewa, NDA`,
      ``,
      `│ *ᴄᴏɴᴛᴏʜ:*`,
      `  ${prefix}kontrak kerja PT Maju Jaya mereka Budi Santoso sebagai programmer, gaji 10jt/bln, kontrak 1 tahun mulai 1 Jan 2024`,
      `  ${prefix}kontrak MoU antara PT A dan PT B untuk kerjasama pengembangan aplikasi`,
      ``,
      `│ *ʜᴀꜱɪʟ:* PDF dengan klausa standar, siap edit`,
    ].join("\n"));
    return m.reply( help, "kontrak");
  }
  m.reply(claraWrap("Kontrak", "│ AI lagi menyusun draft kontrak..."));

  try {
    const result = await UnlimitedAI(KONTRAK_PROMPT.replace("__INPUT__", args), "nova-ai");

    if (!result || result.trim().length < 20) {
      return m.reply(claraWrap("Kontrak", "❌ Gagal generate kontrak. Coba dengan detail yang lebih lengkap."));
    }

    const text = result.trim();

    // Text preview
    let preview = text;
    if (preview.length > 2000) preview = preview.substring(0, 2000) + "\n\n... (lihat PDF untuk versi lengkap)";
    await m.reply(claraWrap("Kontrak — Preview", preview));

    // PDF
    m.reply(claraWrap("Kontrak", "│ Render kontrak ke PDF..."));
    const pdfBuffer = await renderKontrakPDF(text);
    await sock.sendMessage(m.chat, {
      document: pdfBuffer,
      mimetype: "application/pdf",
      fileName: `kontrak_${Date.now()}.pdf`,
    }, { quoted: m });
  } catch (error) {
    console.error("kontrak error:", error);
    m.reply(claraWrap("Kontrak", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "kontraktool",
  alias: ["kontraktool", "kontrak"],
  category: "tools",
  description: "AI Generator Kontrak/Perjanjian → PDF (kerja, MoU, jasa, sewa, NDA)",
  usage: ".kontrak <jenis> <detail pihak & ketentuan>",
  example: ".kontrak kerja PT Maju mereka Budi sebagai programmer gaji 10jt 1 tahun",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 25,
  energi: 3,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
