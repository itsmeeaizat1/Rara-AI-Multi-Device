// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aichatimg — Chat AI yang bisa terima gambar + kirim gambar balik
// Gabungan Gemini Vision (baca gambar) + UnlimitedAI (jawab) + Image gen (kirim gambar)
import { GeminiVision } from "../../src/scraper/geminiVision.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aichatimg",
  alias: ["aichatimg", "aivisionchat", "chatimg", "aifoto"],
  category: "ai",
  description: "Chat AI lengkap — bisa lihat gambar, analisis, dan jawab dengan teks/gambar",
  usage: ".aichatimg <pertanyaan> (reply/kirim foto)\n.aichatimg gambar <prompt> (AI generate gambar)",
  example: ".aichatimg apa yang ada di foto ini? (reply foto)\n.aichatimg baca tulisan di papan itu (reply foto)\n.aichatimg gambar kucing lucu warna pink",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    // Mode: generate gambar dari teks
    if (text.toLowerCase().startsWith("gambar ") || text.toLowerCase().startsWith("generate ") || text.toLowerCase().startsWith("buat gambar ")) {
      const prompt = text.replace(/^(gambar|generate|buat gambar)\s+/i, "").trim();
      if (!prompt) {
        await m.react("❌");
        return m.reply(claraWrap("aichatimg", `Mau gambar apa?\nContoh: ${prefix}aichatimg gambar kucing lucu warna pink`, "guide"));
      }

      await m.react("🕒");
      try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        const axios = (await import("axios")).default;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
        const buffer = Buffer.from(res.data);

        await m.react("🐣");
        let caption = `Prompt: *${prompt}*\nEngine: *pollinations*`;
        return await sock.sendMedia(m.chat, buffer, null, m, { type: "image", caption });
      } catch (e) {
        await m.react("❌");
        return m.reply(claraWrap("aichatimg", "Gagal generate gambar. Coba lagi.", "error"));
      }
    }

    // Mode: analisis gambar
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage"));

    if (isImage) {
      if (!text) {
        await m.react("❌");
        return m.reply(claraWrap("aichatimg", `Kasih pertanyaan tentang gambarnya!\n\nContoh: ${prefix}aichatimg apa di foto ini? (reply foto)\n${prefix}aichatimg jelaskan isi diagram (reply foto)`, "guide"));
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
        return m.reply(claraWrap("aichatimg", "Gagal download gambar.", "error"));
      }

      // Step 1: Gemini Vision analisis gambar
      const visionResult = await GeminiVision({
        imageBuffer: buffer,
        prompt: text,
        instruction: "Kamu adalah asisten AI vision yang ahli. Analisis gambar dengan detail dan akurat. Jawab dalam bahasa Indonesia. Jika user bertanya tentang soal/PR, kerjakan dengan penjelasan. Jika user minta identifikasi, jelaskan detail yang terlihat.",
      });

      if (visionResult.status) {
        await m.react("🐣");
        return m.reply(`Status: Gambar dianalisis\n\n${visionResult.text}`);
      }

      // Fallback: kalau Gemini key belum set, pakai UnlimitedAI tanpa gambar
      const fallbackPrompt = `User mengirim gambar dengan pertanyaan: "${text}". Karena sistem vision sedang tidak tersedia, jelaskan bahwa untuk analisis gambar, user perlu set Gemini API key dengan .setkey gemini <key>. Tapi tetap coba bantu user dengan pertanyaan teksnya sebisanya.`;
      const res = await UnlimitedAI(fallbackPrompt, "nova-ai");
      if (res.status) {
        await m.react("🐣");
        let msg = `Mode text-only (Gemini Vision belum aktif)\nAktifkan: ${prefix}setkey gemini <key>\nGratis: aistudio.google.com/apikey\n\n${res.answer}`;
        return m.reply(msg);
      }
    }

    // Mode: chat teks biasa
    if (!text) {
      return m.reply(
        `Chat AI yang bisa lihat gambar & generate gambar\n\n` +
        `Cara pakai:\n` +
        `• Kirim foto + caption pertanyaan → AI analisis\n` +
        `• Ketik "gambar <deskripsi>" → AI bikin gambar\n` +
        `• Ketik pertanyaan biasa → AI jawab\n\n` +
        `Contoh:\n` +
        `${prefix}aichatimg apa di foto ini? (reply foto)\n` +
        `${prefix}aichatimg gambar kucing astronot\n` +
        `${prefix}aichatimg jelaskan teori relativitas`
      );
    }

    await m.react("🕒");
    const result = await UnlimitedAI(text, "nova-ai");
    if (!result.status || !result.answer) {
      await m.react("❌");
      return m.reply(claraWrap("aichatimg", "AI lagi offline nih 🤖", "error"));
    }

    await m.react("🐣");
    return m.reply(result.answer.trim());
  } catch (err) {
    console.error("aichatimg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("aichatimg", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
