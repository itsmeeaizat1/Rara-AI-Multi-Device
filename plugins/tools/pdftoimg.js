// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// pdftoimg.js — PDF ke gambar: reply PDF, tiap halaman jadi PNG
// Fitur baru 9 Sep 2026 (request owner "fitur yg blm prnh ada di bot")
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { pdfToImages, MAX_PAGES, DEFAULT_PAGES } from "../../src/lib/rara-pdftoimg.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "pdftoimg",
  alias: ["pdftoimg", "pdfkegambar", "pdfimage", "pdffoto", "pdfpng"],
  category: "tools",
  description: "PDF ke gambar — reply dokumen PDF, halaman dirender PNG",
  usage: ".pdftoimg [jumlah halaman|all] (reply PDF)",
  example: ".pdftoimg 10 (reply PDF)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function downloadFile(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
}

async function handler(m, { sock }) {
  try {
    // wajib reply PDF
    const q = m.quoted;
    const isPdf = q && (q.mimetype === "application/pdf" || String(q.fileName || q.filename || "").toLowerCase().endsWith(".pdf"));
    if (!q || !isPdf) {
      await m.react("❌");
      return m.reply(raraWrap("pdftoimg", `Reply dokumen PDF-nya dulu, terus ketik:\n\n${m.prefix}pdftoimg [jumlah|all]`, "error"));
    }

    const pagesArg = m.args[0] || String(DEFAULT_PAGES);

    await m.react("🕒");
    const buffer = q.buffer || (q.url ? await downloadFile(q.url) : null);
    if (!buffer) {
      await m.react("❌");
      return m.reply(raraWrap("pdftoimg", "Dokumennya gak bisa diunduh — coba kirim ulang PDF-nya.", "error"));
    }

    const res = await pdfToImages(buffer, { pagesArg });
    if (!res.ok) {
      await m.react("❌");
      const msgs = {
        empty_buffer: "Dokumennya kosong.",
        pdf_invalid: "File-nya gak valid / bukan PDF yang bisa dibaca.",
        render_failed: "Halaman-halamannya gagal dirender — PDF-nya mungkin rusak.",
      };
      return m.reply(raraWrap("pdftoimg", msgs[res.error] || "Gagal render PDF.", "error"));
    }

    await m.react("🐣");
    const name = String(q.fileName || "dokumen").replace(/\.pdf$/i, "");

    // kirim tiap halaman sebagai image (jeda dikit biar gak ke-rate-limit)
    for (let i = 0; i < res.images.length; i++) {
      const img = res.images[i];
      const cap = [
        `📄 *${name}* — halaman ${img.pageNumber}/${res.totalPages}`,
        res.truncated && i === res.images.length - 1 ? `\n⚠️ maks ${MAX_PAGES} halaman — sisanya biaran` : "",
      ].join("\n").trim();
      await sock.sendMessage(m.chat, {
        image: img.png,
        caption: cap,
      });
      if (i < res.images.length - 1) await new Promise((r) => setTimeout(r, 800));
    }
    // kartu ringkasan 1x di akhir (bukan per halaman — anti spam)
    try {
      const last = res.images[res.images.length - 1];
      const info = await probeBuffer(last.png);
      const card = mediaResultCard({
        header: "pdftoimg",
        type: "gambar",
        request: [["File", name], ["Halaman", `${res.images.length}/${res.totalPages}`]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
      if (card) await m.reply(card);
    } catch { /* best-effort */ }
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("pdftoimg", "Gagal: " + (e?.message || e), "error"));
  }
}

export { pluginConfig as config, handler };
