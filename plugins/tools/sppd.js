// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const SPPD_PROMPT = `Kamu adalah asisten pembuat Surat Perintah Perjalanan Dinas (SPPD) resmi Indonesia. Buatkan SPPD berdasarkan informasi user.

Format SPPD WAJIB (plain text, JANGAN markdown):

SURAT PERINTAH PERJALANAN DINAS

Nomor: [nomor SPPD]
Perihal: Perintah Perjalanan Dinas

Yang bertanda tangan di bawah ini:
[Nama Pejabat], [Jabatan Pejabat]

Dengan ini memerintahkan kepada:
Nama: [Nama]
NIP/NIK: [NIP]
Jabatan: [Jabatan]
Pangkat/Golongan: [Pangkat]
Unit Kerja: [Unit Kerja]

Untuk melaksanakan perjalanan dinas:
Tujuan: [Kota Tujuan]
Maksud: [Maksud Perjalanan]
Tanggal Berangkat: [Tanggal]
Tanggal Kembali: [Tanggal]
Lama Perjalanan: [Jumlah] hari
Transportasi: [Kendaraan]

Anggaran:
Biaya Transportasi: Rp [jumlah]
Biaya Penginapan: Rp [jumlah]
Uang Harian: Rp [jumlah]
Total: Rp [total]

Demikian surat perintah ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.

[Nama Kota], [Tanggal]

Pejabat Yang Memerintahkan     Yang Melaksanakan
(tanda tangan)                 (tanda tangan)

[Nama Pejabat]                 [Nama]
[NIP Pejabat]                  [NIP]

Aturan:
- Bahasa Indonesia formal/baku
- JANGAN pakai markdown (##, **, dll), plain text murni
- Jika info kurang, isi dengan [perlu diisi] agar user bisa edit
- Hitung total anggaran otomatis jika komponen diberikan
- Sesuaikan format dengan standar SPPD pemerintah/swasta Indonesia

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

async function renderSppdPDF(text) {
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
    if (line.trim() === "") { y -= lineHeight * 0.5; continue; }

    const isTitle = /SPPD|SURAT PERINTAH PERJALANAN DINAS/.test(line.trim()) && line.trim().length > 10;
    const isBold = isTitle || /^(Nomor|Perihal|Anggaran|Total|Demikian)/.test(line.trim());
    const isCenter = isTitle || line.trim().startsWith("SURAT PERINTAH") || /^(Pejabat Yang|Yang Melaksanakan|\[.*Kota\])/.test(line.trim());

    const useFont = isBold ? boldFont : font;
    const wrapped = wrapText(line, useFont, fontSize, maxWidth);

    for (const wl of wrapped) {
      if (y < margin + lineHeight) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
      const textWidth = useFont.widthOfTextAtSize(wl, fontSize);
      const x = isCenter ? (pageW - textWidth) / 2 : margin;
      page.drawText(wl, { x, y, size: fontSize, font: useFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  if (!args || args.trim().length < 10) {
    const help = raraWrap("SPPD", [
      `Generator Surat Perintah Perjalanan Dinas → PDF`,
      ``,
      `📌 Format:`,
      `  ${prefix}sppd <detail perjalanan dinas>`,
      ``,
      `💡 Contoh:`,
      `  ${prefix}sppd Budi Santoso NIP 198701012015041001 staf Dinas Kominfo, ke Jakarta untuk rapat koordinasi, 15-17 Jan 2024, transport pesawat, transport 2jt, hotel 500rb/hari, uang harian 300rb/hari, diperintahkan oleh Kepala Dinas Hadi NIP 196501011990021001`,
      ``,
      `*hasil:* PDF SPPD siap print`,
    ].join("\n"));
    return m.reply( help, "sppd");
  }
  await m.react("🕒");

  try {
    const result = await UnlimitedAI(SPPD_PROMPT.replace("__INPUT__", args), "rara-ai");

    if (!result || result.trim().length < 20) {
      return m.reply(raraWrap("SPPD", "❌ Gagal generate SPPD. Coba dengan detail yang lebih lengkap."));
    }

    const text = result.trim();

    // Text preview
    let preview = text;
    if (preview.length > 2000) preview = preview.substring(0, 2000) + "\n\n... (lihat PDF untuk lengkap)";
    await m.reply(raraWrap("SPPD — Preview", preview));

    // PDF
    m.reply(raraWrap("SPPD", "Render SPPD ke PDF..."));
    const pdfBuffer = await renderSppdPDF(text);
    await sock.sendMessage(m.chat, {
      document: pdfBuffer,
      mimetype: "application/pdf",
      fileName: `sppd_${Date.now()}.pdf`,
    }, { quoted: m });
    await m.reply(mediaInfoCaption({ header: "SPPD", fields: [
      { label: "Input", value: args.trim().slice(0, 60) + (args.trim().length > 60 ? "..." : "") },
      { label: "Engine", value: "UnlimitedAI + pdf-lib" },
      { label: "Hasil", value: "Dokumen PDF" },
      { label: "Ukuran", value: (pdfBuffer.length / 1024).toFixed(1) + " KB" },
    ] }));
  } catch (error) {
    console.error("sppd error:", error);
    m.reply(raraWrap("SPPD", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "sppd",
  alias: ["sppd"],
  category: "tools",
  description: "Generator Surat Perintah Perjalanan Dinas (SPPD) → PDF",
  usage: ".sppd <nama, NIP, tujuan, maksud, tanggal, anggaran>",
  example: ".sppd Budi NIP 1987 ke Jakarta rapat 15-17 Jan transport 2jt hotel 500rb",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
