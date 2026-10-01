// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aipr — Foto soal/PR/tugas → AI baca + jawab
import { GeminiVision } from "../../src/scraper/geminiVision.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "aipr",
  alias: ["aipr", "aipr", "aikerja", "aisoal", "aitugas", "prai", "tugasai"],
  category: "ai",
  description: "Foto soal/PR/tugas → AI baca dan jawab dengan penjelasan",
  usage: ".aipr (reply/kirim foto soal)\n.aipr <mata pelajaran> (reply foto)",
  example: ".aipr (reply foto soal matematika)\n.aipr fisika (reply foto soal)\n.aipr kimia (reply foto lab)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";

    // Cek gambar
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage"));
    if (!isImage) {
      return m.reply(
        raraGuide(
          "aipr",
          "Foto soal → AI jawab + jelasin\n" +
          "Kirim/reply foto soal + caption mata pelajaran (opsional)",
          `${prefix}aipr (reply foto soal)\n` +
          `${prefix}aipr matematika (reply foto)\n` +
          `${prefix}aipr fisika (reply foto)\n` +
          `${prefix}aipr b.inggris (reply foto)`
        )
      );
    }

    await m.react("🕒");

    // Download gambar
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer) {
      await m.react("❌");
      return m.reply(raraWrap("aipr", "Gagal download foto. Coba kirim ulang.", "error"));
    }

    // Get subject jika ada
    const subject = m.text?.trim() || m.args?.join(" ").trim() || "";
    const subjectHint = subject ? `Mata pelajaran: ${subject}. ` : "";

    // Step 1: Gemini Vision baca soal dari foto
    const visionPrompt = `${subjectHint}Baca semua soal/tugas dalam gambar ini. Transkrip seluruh teks soal dengan akurat, termasuk pilihan ganda jika ada. Jika ada multiple soal, nomori setiap soal. Format output:

SOAL:
1. [transkrip soal 1]
2. [transkrip soal 2]
...

Jika gambar bukan soal, jelaskan apa isi gambar.`;

    const visionResult = await GeminiVision({
      imageBuffer: buffer,
      prompt: visionPrompt,
      instruction: "Kamu adalah OCR akademis. Baca teks soal dengan sangat akurat. Preservasi angka, rumus, dan simbol matematika.",
    });

    if (!visionResult.status) {
      // Fallback ke UnlimitedAI jika Gemini key belum di-set
      const fallbackPrompt = `Saya punya tugas/soal tapi tidak bisa dibaca AI. Tolong berikan saran cara mengerjakan tugas dengan kategori: "${subject || 'umum'}". Berikan tips belajar yang efektif.`;
      const res = await UnlimitedAI(fallbackPrompt, "rara-ai");
      if (res.status) {
        await m.react("🐣");
        return m.reply(
          `Gemini Vision belum aktif\n` +
          `Set API key: ${prefix}setkey gemini <key>\n` +
          `Gratis: aistudio.google.com/apikey\n\n` +
          `${res.answer}`
        );
      }
      await m.react("❌");
      return m.reply(raraWrap("aipr", visionResult.error || "Gagal membaca foto", "error"));
    }

    // Step 2: AI jawab soal berdasarkan transkrip
    const solvePrompt = `Berikut adalah soal/tugas yang dibaca dari foto:

${visionResult.text}

Tolong kerjakan semua soal dengan format per soal:

SOAL [nomor]:
JAWABAN: [jawaban langsung]
PENJELASAN: [penjelasan singkat kenapa jawabannya itu]
LANGKAH: [langkah pengerjaan jika perlu]

Jika soal pilihan ganda, sebutkan huruf jawaban yang benar.
Jika soal essay, berikan jawaban lengkap.
Gunakan bahasa Indonesia.`;

    const solveResult = await UnlimitedAI(solvePrompt, "rara-ai");

    if (!solveResult.status || !solveResult.answer) {
      // Kalpa AI solver gagal, kirim transkrip aja
      await m.react("🐣");
      return m.reply(
        `Berhasil baca soal, tapi AI solver lagi down\n\n` +
        `${visionResult.text}\n\n` +
        `Copy soal di atas, paste ke ${prefix}rara-ai untuk jawaban`
      );
    }

    await m.react("🐣");

    let msg = "";
    if (subject) msg += `Mapel: *${subject}*\n`;
    msg += `Status: Soal berhasil dibaca\n\n`;
    msg += `Jawaban:\n${solveResult.answer.trim()}\n\n`;
    msg += `Butuh bantuan lebih? ${prefix}rara-ai <pertanyaan>`;

    return m.reply(msg);
  } catch (err) {
    console.error("aipr error:", err);
    await m.react("❌");
    return m.reply(raraWrap("aipr", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
