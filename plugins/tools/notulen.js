// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const NOTULEN_PROMPT = `Kamu adalah asisten notulen meeting profesional. Susun ulang catatan meeting kasar menjadi notulen yang rapi dan terstruktur.

Format notulen WAJIB:
1. JUDUL MEETING
2. Tanggal & Waktu: (jika tidak ada, tulis [Tanggal - isi])
3. Lokasi: (jika tidak ada, tulis [Lokasi - isi])
4. Peserta Hadir: (listing jika ada)
5. AGENDA / PEMBAHASAN:
   - Point by point, urut sesuai diskusi
6. KEPUTUSAN:
   - Keputusan yang diambil
7. ACTION ITEMS:
   - [Siapa] - [Apa] - [Kapan] (deadline jika ada)
8. NOTULEN OLEH: [Nama - isi]

Aturan:
- Bahasa Indonesia formal
- JANGAN pakai markdown (##, **, dll), plain text murni
- Pisahkan tiap section dengan baris kosong
- Gunakan - untuk bullet points
- Jika ada info yang kurang, tandai dengan [perlu diisi]
- Buat ringkas tapi lengkap

Catatan meeting user: __INPUT__`;

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

async function renderNotulenPDF(text) {
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

    const isHeader = /^[A-Z\s]{3,}:?$/.test(line.trim()) || /^(AGENDA|KEPUTUSAN|ACTION ITEMS|PESERTA|NOTULEN|TANGGAL|LOKASI|JUDUL)/.test(line.trim());
    const useFont = isHeader ? boldFont : font;
    const wrapped = wrapText(line, useFont, fontSize, maxWidth);

    for (const wl of wrapped) {
      if (y < margin + lineHeight) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
      page.drawText(wl, { x: margin, y, size: fontSize, font: useFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  // Support: reply catatan meeting, atau ketik langsung
  let input = args;
  if (m.quoted && m.quoted.text && (!input || input.trim().length < 10)) {
    input = m.quoted.text;
  }

  if (!input || input.trim().length < 10) {
    const help = claraWrap("Notulen", [
      `│ AI Notulen Meeting → Text + PDF`,
      ``,
      `│ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  Reply catatan meeting, ketik: ${prefix}notulen`,
      `  Atau ketik langsung: ${prefix}notulen <catatan>`,
      ``,
      `│ *ᴄᴏɴᴛᴏʜ:*`,
      `  ${prefix}notulen rapat evaluasi Q1 2024. Budi: perlu upgrade server. Sari: budget 50jt. Keputusan: beli server minggu depan. Budi beli, deadline Jumat`,
      ``,
      `│ *ʜᴀꜱɪʟ:*`,
      `  Structured notulen: agenda, keputusan, action items`,
    ].join("\n"));
    return m.reply( help, "notulen");
  }
  m.reply(claraWrap("Notulen", "│ AI lagi nyusun notulen meeting..."));

  try {
    const result = await UnlimitedAI(NOTULEN_PROMPT.replace("__INPUT__", input), "nova-ai");

    if (!result || result.trim().length < 20) {
      return m.reply(claraWrap("Notulen", "❌ Gagal generate notulen. Coba dengan catatan yang lebih lengkap."));
    }

    const text = result.trim();

    // Send text result
    let preview = text;
    if (preview.length > 3500) preview = preview.substring(0, 3500) + "\n\n... (lanjutan di PDF)";
    await m.reply(claraWrap("Notulen Meeting", preview));

    // Also generate PDF
    m.reply(claraWrap("Notulen", "│ Render notulen ke PDF..."));
    const pdfBuffer = await renderNotulenPDF(text);
    await sock.sendMessage(m.chat, {
      document: pdfBuffer,
      mimetype: "application/pdf",
      fileName: `notulen_${Date.now()}.pdf`,
    }, { quoted: m });
  } catch (error) {
    console.error("notulen error:", error);
    m.reply(claraWrap("Notulen", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "notulen",
  alias: ["notulen"],
  category: "tools",
  description: "AI Notulen Meeting dari catatan kasar → text + PDF rapi",
  usage: ".notulen (reply catatan)\n.notulen <catatan meeting>",
  example: ".notulen rapat Q1, Budi: upgrade server, Sari: budget 50jt",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
