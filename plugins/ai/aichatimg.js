// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// aichatimg — Chat AI yang bisa terima gambar + kirim gambar balik
// Gabungan Gemini Vision (baca gambar) + UnlimitedAI (jawab) + Image gen (kirim gambar)
import { visionScan } from "../../src/lib/rara-vision-chain.js";
// UnlimitedAI replaced with callIkyy (ikyyxd API)
import { raraWrap, raraGuide } from "../../src/lib/rara-menu-style.js";
import { callIkyy } from "../../src/lib/rara-ai-service.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import te from "../../src/lib/rara-error.js";

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
        return m.reply(raraWrap("aichatimg", `Mau gambar apa?\nContoh: ${prefix}aichatimg gambar kucing lucu warna pink`, "guide"));
      }

      // 🔹 status ala agent (owner 29 Sep) — media gak bisa di-edit, tapi pesan
      // "🎨 Generating..." nunjukin bot lg kerja; stop pas gambar siap
      const genStatus = await startAiStatus(sock, m, { phases: ["🎨 Generating...", "✨ Refining..."] });
      try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        const axios = (await import("axios")).default;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
        const buffer = Buffer.from(res.data);

        genStatus.stop();
        await m.react("🐣");
        let caption = `Prompt: *${prompt}*\nEngine: *pollinations*`;
        return await sock.sendMedia(m.chat, buffer, null, m, { type: "image", caption });
      } catch (e) {
        await genStatus.fail("Gagal generate gambar — coba lagi ya");
        return;
      }
    }

    // Mode: analisis gambar
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage"));

    if (isImage) {
      if (!text) {
        await m.react("❌");
        return m.reply(raraWrap("aichatimg", `Kasih pertanyaan tentang gambarnya!\n\nContoh: ${prefix}aichatimg apa di foto ini? (reply foto)\n${prefix}aichatimg jelaskan isi diagram (reply foto)`, "guide"));
      }

      // 🔹 status ala agent: 👀 scanning → jawaban final di-edit ke pesan status
      const aiStatus = await startAiStatus(sock, m, { phases: ["👀 Scanning...", "🧠 Thinking...", "✍️ Composing..."] });

      // Download gambar
      let buffer;
      if (m.quoted && m.quoted.isMedia) {
        buffer = await m.quoted.download();
      } else if (m.isMedia) {
        buffer = await m.download();
      }

      if (!buffer) {
        await aiStatus.fail("Gagal download gambar");
        return;
      }

      // Rantai vision: Gemini Vision (key valid) → describe+Mercury (tanpa key)
      const visionResult = await visionScan({
        imageBuffer: buffer,
        question: text,
        instruction: "Kamu adalah asisten AI vision yang ahli. Analisis gambar dengan detail dan akurat. Jawab dalam bahasa Indonesia. Jika user bertanya tentang soal/PR, kerjakan dengan penjelasan. Jika user minta identifikasi, jelaskan detail yang terlihat.",
        sessionKey: "aichatimg:" + m.sender,
      }).catch((e) => ({ status: false, error: e.message }));

      if (visionResult.status) {
        return aiStatus.finish(`🖼️ Engine: ${visionResult.engine}\n\n${visionResult.text}`);
      }

      await aiStatus.fail(visionResult.error || "Gagal menganalisis gambar");
      return;
    }

    // Mode: chat teks biasa
    if (!text) {
      return m.reply(
        raraGuide(
          "aichatimg",
          "Chat AI yang bisa lihat gambar & bikin gambar\n" +
          "Kirim foto + caption pertanyaan → AI analisis\n" +
          'Ketik "gambar <deskripsi>" → AI bikin gambar\n' +
          "Ketik pertanyaan biasa → AI jawab",
          `${prefix}aichatimg apa di foto ini? (reply foto)\n` +
          `${prefix}aichatimg gambar kucing astronot\n` +
          `${prefix}aichatimg jelaskan teori relativitas`
        )
      );
    }

    // 🔹 status ala agent: 🧠 Thinking... → jawaban di-edit ke pesan status
    const chatStatus = await startAiStatus(sock, m);
    const result = await callIkyy(text, {});
    if (!result.status || !result.answer) {
      await chatStatus.fail("AI lagi offline nih 🤖");
      return;
    }

    return chatStatus.finish(result.answer.trim());
  } catch (err) {
    console.error("aichatimg error:", err);
    await m.react("❌");
    return m.reply(raraWrap("aichatimg", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
