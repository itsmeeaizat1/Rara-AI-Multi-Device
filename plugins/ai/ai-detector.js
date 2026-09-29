// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-detector",
  alias: ["ai-detector"],
  category: "ai",
  description: "Deteksi apakah teks/materi berpotensi AI-generated",
  usage: ".ai-detector <teks> | reply teks",
  example: ".ai-detector <teks yang mau dicek>",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const raw = m.text?.trim() || "";
    const text = m.quoted?.text ? m.quoted.text : raw.replace(/^\.ai-detector\s+/i, "").trim();

    if (!text) {
      const out =
        novaCaption({
  emoji: "🤖",
  name: "ai-detector",
  description: "Deteksi apakah teks/materi berpotensi AI-generated",
  usage: `${prefix}ai-detector <teks> | reply teks`,
  example: `${prefix}ai-detector <teks yang mau dicek>`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(out);
      return { handled: true };
    }

    const prompt = `Analisis apakah teks berikut tampak ditulis oleh AI atau manusia. Berikan skor kemiripan AI (0-100) dan alasan singkat dalam bahasa Indonesia:\n\n${text.slice(0, 4000)}`;
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [{ role: "user", content: prompt }],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const out =
      claraWrap("AI Detector", [`Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-detector <teks> untuk cek lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIDetector", "Gagal nih, coba lagi ya");

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
