// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "node:fs";
import path from "node:path";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

// pdf-parse lazy loader (avoid crash if not installed)
let _PDFParse = null;
async function getPdfParse() {
  if (_PDFParse) return _PDFParse;
  try {
    const mod = await import("pdf-parse");
    _PDFParse = mod.PDFParse || mod.default?.PDFParse;
    if (!_PDFParse && typeof mod.default === "function") _PDFParse = mod.default;
  } catch {
    _PDFParse = null;
  }
  return _PDFParse;
}

// ── PDF text extraction with structure preservation ──────────────
async function extractPdfText(buffer) {
  const PDFParse = await getPdfParse();
  if (!PDFParse) throw new Error("Package pdf-parse belum terinstall. Jalankan: npm install pdf-parse");

  // New pdf-parse API uses PDFParse class with Uint8Array
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);
  await parser.load();
  const result = await parser.getText();
  let raw = "";

  if (result && typeof result === "object" && result.text) {
    raw = result.text;
  } else if (typeof result === "string") {
    raw = result;
  } else {
    throw new Error("Format hasil pdf-parse tidak dikenali.");
  }

  // Clean up pdf-parse footer like "-- 1 of 1 --"
  raw = raw.replace(/\n--\s*\d+\s*(?:of|dari)\s*\d+\s*--\s*$/g, "");
  raw = raw.replace(/--\s*\d+\s*(?:of|dari)\s*\d+\s*--/g, "").trim();

  if (!raw || raw.trim().length === 0) {
    throw new Error("Tidak ada teks yang bisa diekstrak. PDF mungkin berisi gambar/scan. Coba screenshot lalu .extracttext atau .ai-ocr.");
  }

  return formatStructuredText(raw);
}

// ── Image text extraction via AI vision ──────────────────────────
async function extractImageText(buffer, botConfig) {
  const aiConfig = botConfig?.aiHelp || {};
  const apiKey = String(aiConfig.apiKey || "");
  const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
  const model = String(aiConfig.model || "gpt-4o-mini");

  if (!apiKey) throw new Error("API key AI belum diisi. Isi botConfig.aiHelp.apiKey dulu.");

  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  const prompt = `Ekstrak SEMUA teks dari gambar ini dan susun ulang dengan format yang rapi dan terstruktur.

ATURAN FORMAT:
1. Pertahankan struktur dokumen asli (judul, subjudul, paragraf, bullet points, tabel)
2. Gunakan # untuk judul utama, ## untuk subjudul
3. Gunakan - untuk bullet points
4. Pisahkan paragraf dengan baris kosong
5. Pertahankan bahasa asli (Indonesia/Inggris/dll)
6. Jangan tambahkan komentar atau penjelasan, HANYA teks yang ada di gambar
7. Jika ada tabel, format dengan pipe (|) separator
8. Pertahankan urutan teks sesuai posisi di gambar (atas ke bawah, kiri ke kanan)
9. Jangan dipotong, tampilkan semua teks lengkap`;

  const res = await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: dataUrl } },
      ]}],
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || "";
  if (!text || text.trim().length === 0) throw new Error("Tidak ada teks terdeteksi oleh AI.");

  return text.trim();
}

// ── PDF via AI vision (render pages to images, then AI reads) ───
async function extractPdfViaAI(buffer, botConfig) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { Canvas } = await import("skia-canvas");

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const pageCount = doc.numPages;
  if (pageCount === 0) throw new Error("PDF kosong, tidak ada halaman.");

  // Limit to 5 pages to avoid excessive API costs
  const maxPages = Math.min(pageCount, 5);

  const aiConfig = botConfig?.aiHelp || {};
  const apiKey = String(aiConfig.apiKey || "");
  const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
  const model = String(aiConfig.model || "gpt-4o-mini");
  if (!apiKey) throw new Error("API key AI belum diisi. Isi botConfig.aiHelp.apiKey dulu.");

  // Custom canvas factory using skia-canvas
  function createCanvasFactory() {
    return {
      create(width, height) {
        const canvas = new Canvas(width, height);
        const ctx = canvas.getContext("2d");
        return { canvas, context: ctx };
      },
      reset(c, width, height) {
        c.canvas.width = width;
        c.canvas.height = height;
      },
      destroy(c) {
        c.canvas = null;
        c.context = null;
      },
    };
  }

  const prompt = `Ekstrak SEMUA teks dari halaman PDF ini dan susun ulang dengan format yang rapi dan terstruktur.

ATURAN FORMAT:
1. Pertahankan struktur dokumen asli (judul, subjudul, paragraf, bullet points, tabel)
2. Gunakan # untuk judul utama, ## untuk subjudul
3. Gunakan - untuk bullet points
4. Pisahkan paragraf dengan baris kosong
5. Pertahankan bahasa asli (Indonesia/Inggris/dll)
6. Jangan tambahkan komentar atau penjelasan, HANYA teks yang ada di halaman
7. Jika ada tabel, format dengan pipe (|) separator
8. Pertahankan urutan teks sesuai posisi di halaman (atas ke bawah, kiri ke kanan)
9. Jangan dipotong, tampilkan semua teks lengkap`;

  let allText = "";

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const cf = createCanvasFactory();
    const c = cf.create(viewport.width, viewport.height);

    // White background
    c.context.fillStyle = "#ffffff";
    c.context.fillRect(0, 0, viewport.width, viewport.height);

    await page.render({
      canvasContext: c.context,
      viewport: viewport,
      canvasFactory: cf,
    }).promise;

    // Convert to PNG buffer
    const pngBuf = await c.canvas.toBuffer("png");
    const base64 = pngBuf.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    // Send to AI vision
    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: [
          { type: "text", text: prompt + (pageCount > 1 ? `\n\nIni halaman ${pageNum} dari ${maxPages} halaman.` : "") },
          { type: "image_url", image_url: { url: dataUrl } },
        ]}],
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const pageText = json?.choices?.[0]?.message?.content || "";
    if (pageText.trim()) {
      if (allText) allText += "\n\n--- Halaman " + pageNum + " ---\n\n";
      allText += pageText.trim();
    }

    // Cleanup canvas
    cf.destroy(c);
  }

  if (pageCount > maxPages) {
    allText += `\n\n[Halaman ${maxPages + 1}-${pageCount} dilewati (maks 5 halaman)]`;
  }

  if (!allText || allText.trim().length === 0) {
    throw new Error("Tidak ada teks terdeteksi oleh AI dari PDF ini.");
  }

  return allText;
}

// ── Structure formatter: clean up raw PDF text ───────────────────
function formatStructuredText(raw) {
  const lines = raw.split("\n").map(l => l.replace(/\r/g, ""));

  const result = [];
  let prevWasHeader = false;
  let prevWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      if (!prevWasEmpty && result.length > 0) {
        result.push("");
        prevWasEmpty = true;
      }
      continue;
    }
    prevWasEmpty = false;

    // Detect bullet points
    const bulletMatch = trimmed.match(/^[•●▪◆○  ┊  ➶\-*▪]\s*(.+)/);
    if (bulletMatch) {
      result.push(`- ${bulletMatch[1].trim()}`);
      prevWasHeader = false;
      continue;
    }

    // Detect numbered lists
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
    if (numMatch) {
      result.push(`${numMatch[1]}. ${numMatch[2].trim()}`);
      prevWasHeader = false;
      continue;
    }

    // Detect headers: short lines, possibly all caps, not ending with punctuation
    const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length > 3;
    const isShort = trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith(",") && !trimmed.endsWith(";");
    const prevLine = result.length > 0 ? result[result.length - 1] : "";
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
    const isHeader = (isAllCaps || (isShort && (prevLine === "" || prevWasHeader) && nextLine !== "" && !nextLine.match(/^[-•●▪◆○  ┊  ➶]/))) && !trimmed.match(/^[\d\-\•]/);

    if (isHeader && trimmed.length > 3) {
      if (result.length > 0 && result[result.length - 1] !== "") result.push("");
      result.push(`## ${trimmed}`);
      if (i + 1 < lines.length && lines[i + 1].trim() !== "") result.push("");
      prevWasHeader = true;
      continue;
    }

    result.push(trimmed);
    prevWasHeader = false;
  }

  // Clean up: remove excessive empty lines (max 2 consecutive)
  const cleaned = [];
  let emptyCount = 0;
  for (const line of result) {
    if (line === "") {
      emptyCount++;
      if (emptyCount <= 2) cleaned.push(line);
    } else {
      emptyCount = 0;
      cleaned.push(line);
    }
  }

  let output = cleaned.join("\n").trim();

  // Remove duplicate consecutive lines (common in PDF extraction)
  output = output.split("\n").filter((line, idx, arr) => {
    if (idx > 0 && line === arr[idx - 1] && line !== "") return false;
    return true;
  }).join("\n");

  return output;
}

// ── Split long text into WhatsApp-safe chunks ─────────────────────
function chunkText(text, maxLen = 3500) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  const lines = text.split("\n");
  let current = "";

  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}

// ── Main handler ─────────────────────────────────────────────────
async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";
  const useAI = args && args.toLowerCase().includes("ai");

  // Detect media type
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
  const isPdf = m.isDocument || (m.quoted && m.quoted.type === "documentMessage");
  const pdfMime = m.quoted?.msg?.mimetype || m.msg?.mimetype || "";

  if (!isImage && !isPdf) {
    const helpText = claraWrap("Extract Text", [
      `  ┊  ➶ Ekstrak teks dari *ᴘᴅꜰ* atau *ɢᴀᴍʙᴀʀ* dengan format rapi`,
      ``,
      `  ┊  ➶ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  Reply PDF/Gambar lalu ketik:`,
      `  ${prefix}extracttext (mode standar)`,
      `  ${prefix}extracttext ai (mode AI untuk gambar)`,
      ``,
      `  ┊  ➶ *ᴍᴇᴅɪᴀ ʏᴀɴɢ ᴅɪᴅᴜᴋᴜɴɢ:*`,
      `  PDF (.pdf), JPG, PNG, WEBP`,
      ``,
      `  ┊  ➶ *ᴍᴏᴅᴇ:*`,
      `  Standar - pdf-parse (PDF) / AI vision (gambar)`,
      `  ai - AI vision untuk hasil lebih akurat (PDF & gambar)`,
      `  Maks 5 halaman untuk AI mode PDF`,
    ].join("\n"));
    await m.reply( helpText, "extracttext");
    return { handled: true };
  }

  await m.react("🕒");

  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("Extract Text", "❌ Gagal download media. Coba reply ulang pesannya."));
    }

    let extractedText = "";
    let modeLabel = "";

    if (isImage) {
      modeLabel = "AI Vision";
      m.reply(claraWrap("Extract Text", "  ┊  ➶ Memproses gambar dengan AI vision..."));
      extractedText = await extractImageText(buffer, botConfig);
    } else if (isPdf || pdfMime.includes("pdf")) {
      if (useAI) {
        modeLabel = "AI Vision";
        m.reply(claraWrap("Extract Text", "  ┊  ➶ Rendering halaman PDF & ekstrak dengan AI vision..."));
        try {
          extractedText = await extractPdfViaAI(buffer, botConfig);
        } catch (aiErr) {
          // Fallback to pdf-parse if AI mode fails
          m.reply(claraWrap("Extract Text", "  ┊  ➶ AI mode gagal, fallback ke pdf-parse..."));
          extractedText = await extractPdfText(buffer);
          modeLabel = "PDF Parse (fallback)";
        }
      } else {
        modeLabel = "PDF Parse";
        m.reply(claraWrap("Extract Text", "  ┊  ➶ Mengekstrak teks dari PDF dengan struktur..."));
        extractedText = await extractPdfText(buffer);
      }
    } else {
      return m.reply(claraWrap("Extract Text", "❌ Media tidak didukung. Kirim PDF atau gambar."));
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return m.reply(claraWrap("Extract Text", "❌ Tidak ada teks yang bisa diekstrak dari media ini."));
    }

    // Split into chunks for WhatsApp
    const chunks = chunkText(extractedText);
    const totalChunks = chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunkNum = totalChunks > 1 ? ` (${i + 1}/${totalChunks})` : "";
      const header = claraWrap(`Extract Text — ${modeLabel}${chunkNum}`, chunks[i]);
      const footer = i === chunks.length - 1
        ? "\n" + tipText(`Ketik ${prefix}extracttext untuk ekstrak lagi`)
        : "";
      await m.reply(header + footer);
    }

    await m.react("🐣");
  } catch (error) {
    console.error("extracttext error:", error);
    await m.reply(claraWrap("Extract Text", [
      `❌ *ɢᴀɢᴀʟ*`,
      ``,
      `${error.message || "Terjadi kesalahan"}`,
    ].join("\n")));
    await m.react("🐣");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "extracttext",
  alias: ["extracttext", "pdftotext", "doc2text", "imgtotext"],
  category: "tools",
  description: "Ekstrak teks dari PDF/Gambar dengan format rapih",
  usage: ".extracttext (reply PDF/Gambar)\n.extracttext ai (mode AI untuk gambar)",
  example: ".extracttext",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

export { handler, pluginConfig as config, pluginConfig as default };
