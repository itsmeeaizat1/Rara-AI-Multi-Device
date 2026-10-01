// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "ai-web",
  alias: ["ai-web"],
  category: "ai",
  description: "Cari dan ringkas info dari web dengan AI",
  usage: ".ai-web <pertanyaan>",
  example: ".ai-web Ringkasan berita teknologi hari ini",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        raraCaption({
  emoji: "🤖",
  name: "ai-web",
  description: "Cari dan ringkas info dari web dengan AI",
  usage: `${prefix}ai-web <pertanyaan>`,
  example: `${prefix}ai-web Ringkasan berita teknologi hari ini`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-web");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah asisten yang menelusuri dan merangkum informasi secara akurat dalam bahasa Indonesia." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      raraWrap("AI Web", [`Pertanyaan: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-web <pertanyaan> untuk cari lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIWeb", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-web");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
