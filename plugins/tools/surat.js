// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const SURAT_PROMPT = `Kamu adalah asisten pembuat surat resmi Indonesia. Buatkan surat resmi yang profesional dan sesuai format standar Indonesia berdasarkan informasi user.

Format surat WAJIB:
1. KOP SURAT (nama instansi, alamat, telepon, email) - jika tidak dikasih, pakai placeholder [NAMA INSTANSI]
2. Nomor, Lampiran, Perihal
3. Tanggal pembuatan
4. Tujuan surat (Kepada Yth.)
5. Salam pembuka
6. Isi surat (paragraf yang jelas dan formal)
7. Salam penutup
8. Nama, Jabatan, NIP/NIK (jika ada)

Aturan:
- Gunakan bahasa Indonesia formal/baku
- Sesuaikan jenis surat (dinas, lamaran kerja, keterangan, tugas, undangan, izin)
- JANGAN pakai markdown (##, **, dll), tulis plain text murni
- Pisahkan setiap bagian dengan baris kosong
- Untuk lamaran kerja, lampirkan daftar lampiran di akhir
- Pertahankan struktur yang bisa langsung di-render ke PDF

Input user: __INPUT__`;

// ── Word wrap for PDF ────────────────────────────────────────────
function wrapText(text, font, size, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Render surat to PDF ──────────────────────────────────────────
async function renderSuratPDF(text, opts = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pageW = 595.28; // A4
  const pageH = 841.89;
  const margin = 56.7; // ~2cm
  const maxWidth = pageW - margin * 2;
  const fontSize = 11;
  const lineHeight = fontSize * 1.5;

  const lines = text.split("\n");
  let y = pageH - margin;
  let page = pdfDoc.addPage([pageW, pageH]);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
    }

    if (line.trim() === "") {
      y -= lineHeight * 0.6;
      continue;
    }

    // Detect bold lines (headers, kop surat)
    const isBold = /^[A-Z\s]{4,}$/.test(line.trim()) || line.startsWith("KOP SURAT") ||
      /^(Nomor|Lampiran|Perihal|Kepada Yth|Hal\.)/i.test(line.trim());

    // Detect center-aligned lines (kop, tanggal, salam)
    const isCenter = /^(KOP SURAT|Nama Instansi|Alamat|Telepon|Email|Kepada Yth\.|Salam|Hormat saya|[A-Z\s]{10,}$)/.test(line.trim()) ||
      line.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),?\s/i) ||
      /^(Jakarta|Bandung|Surabaya|Medan|Semarang|Makassar|Palembang|Yogyakarta|Bogor|Tangerang|Depok|Bekasi|Malang|Solo|Denpasar|Balikpapan|Samarinda|Pontianak|Banjarmasin|Manado|Padang|Pekanbaru|Jambi|Bengkulu|Aceh|Lampung|Palu|Gorontalo|Kupang|Ambon|Sorong)/.test(line.trim());

    const useFont = isBold ? boldFont : font;
    const wrapped = wrapText(line, useFont, fontSize, maxWidth);

    for (const wl of wrapped) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
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

// ── Handler ─────────────────────────────────────────────────────
async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  if (!args || args.trim().length < 10) {
    const help = claraWrap("Surat", [
      `  ┊  ➶ Generator Surat Resmi → PDF`,
      ``,
      `  ┊  ➶ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  ${prefix}surat <jenis> <detail>`,
      ``,
      `  ┊  ➶ *ᴊᴇɴɪꜱ ꜱᴜʀᴀᴛ:*`,
      `  dinas, lamaran, keterangan, tugas, izin, undangan`,
      ``,
      `  ┊  ➶ *ᴄᴏɴᴛᴏʜ:*`,
      `  ${prefix}surat dinas dari Bpk Andi kepala sekolah SDN 01 ke Dinas Pendidikan tentang permohonan bantuan dana`,
      `  ${prefix}surat lamaran Budi melamar ke PT Maju Jaya sebagai staff admin, S1 Ekonomi, pengalaman 2 tahun`,
      ``,
      `  ┊  ➶ Hasil: PDF siap print`,
    ].join("\n"));
    return m.reply( help, "surat");
  }

  await m.react("🕒");
  m.reply(claraWrap("Surat", "  ┊  ➶ AI lagi nyusun surat resmi..."));

  try {
    const aiResult = await UnlimitedAI(SURAT_PROMPT.replace("__INPUT__", args), "nova-ai");

    if (!aiResult || aiResult.trim().length < 20) {
      return m.reply(claraWrap("Surat", "❌ Gagal generate surat. Coba dengan detail yang lebih lengkap."));
    }

    m.reply(claraWrap("Surat", "  ┊  ➶ Surat selesai, lagi render ke PDF..."));

    const pdfBuffer = await renderSuratPDF(aiResult.trim());
    const filename = `surat_${Date.now()}.pdf`;

    await sock.sendMessage(m.chat, {
      document: pdfBuffer,
      mimetype: "application/pdf",
      fileName: filename,
    }, { quoted: m });

    // Also send text preview
    let preview = aiResult.trim();
    if (preview.length > 2000) preview = preview.substring(0, 2000) + "\n\n... (lihat PDF untuk versi lengkap)";
    await m.reply(claraWrap("Surat — Preview", preview));

    await m.react("🐣");
  } catch (error) {
    console.error("surat error:", error);
    m.reply(claraWrap("Surat", `❌ Gagal: ${error.message || "error tidak diketahui"}`));
    await m.react("🐣");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "surattool",
  alias: ["surat", "suratresmi", "makesurat", "gensurat"],
  category: "tools",
  description: "Generator Surat Resmi → PDF (dinas, lamaran, keterangan, tugas)",
  usage: ".surat <jenis> <detail>",
  example: ".surat dinas dari Bpk Andi ke Dinas Pendidikan tentang bantuan dana",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
