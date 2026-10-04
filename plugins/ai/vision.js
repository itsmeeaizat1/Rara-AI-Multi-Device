// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// vision — Analisis gambar dengan Gemini Vision (gratis, pakai API key Gemini)
import { visionScan } from "../../src/lib/rara-vision-chain.js";
import { raraCaption, tipText, raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "vision",
  alias: ["vision", "gv", "gemvision", "analisis"],
  category: "ai",
  description: "Analisis gambar dengan Gemini Vision AI (gratis)",
  usage: ".vision <pertanyaan> (reply/attach foto)",
  example: ".vision apa yang ada di foto ini?\n.vision baca teks di gambar ini\n.vision identifikasi tanaman ini",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    // Cek apakah ada gambar (attach atau reply)
    const media = (m.quoted && m.quoted.isImage) || m.isImage; // FIX 10 Sep: m.msg gak ada di serializer — pake flags isImage
    if (!media) {
      const guide = raraCaption({
        emoji: "🔍",
        name: "vision",
        description: "Analisis gambar dengan Gemini Vision",
        usage: `${prefix}vision <pertanyaan> (reply/attach foto)`,
        example: `${prefix}vision apa yang ada di foto ini?\n${prefix}vision baca teks di gambar\n${prefix}vision identifikasi tanaman ini`,
      }) + "\n" + tipText(`Kirim/reply foto dengan caption pertanyaan`);
      return m.reply(guide, "vision");
    }

    await m.react("🕒");

    // Download gambar
    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
    if (!buffer || buffer.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("vision", "Gagal download gambar. Coba kirim ulang.", "error"));
    }

    // Get prompt dari text message
    const prompt = m.text?.trim() || m.args?.join(" ").trim() || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.";

    // Rantai vision: Gemini Vision (key valid) → describe+Mercury (tanpa key)
    const result = await visionScan({
      imageBuffer: buffer,
      question: prompt,
      sessionKey: "vision:" + m.sender,
    }).catch((e) => ({ status: false, error: e.message }));

    if (!result.status) {
      await m.react("❌");
      return m.reply(raraWrap("vision", result.error || "Gagal menganalisis gambar", "error"));
    }

    await m.react("🐣");

    let msg = `Engine: ${result.engine}\n\nPertanyaan:\n"${prompt}"\n\nHasil Analisis:\n${result.text}`;

    return m.reply(msg);
  } catch (err) {
    console.error("vision error:", err);
    await m.react("❌");
    return m.reply(raraWrap("vision", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
