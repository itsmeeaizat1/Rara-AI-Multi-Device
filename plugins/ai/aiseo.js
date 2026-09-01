// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aiseo",
  alias: ["aiseo"],
  category: "ai",
  description: "Tulis konten SEO-friendly dengan AI",
  usage: ".aiseo <topik>",
  example: ".aiseo Cara memulai bisnis kuliner",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";
    const topic = raw.replace(/^\.aiseo\s+/i, "").trim();

    if (!topic) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "aiseo",
  description: "Tulis konten SEO-friendly dengan AI",
  usage: `${prefix}aiseo <topik>`,
  example: `${prefix}aiseo Cara memulai bisnis kuliner`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "aiseo");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah penulis konten SEO. Tulis artikel yang Informatif, menarik, dan ramah mesin pencari dalam bahasa Indonesia." },
        { role: "user", content: `Tulis konten SEO tentang: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI SEO", [`Topik: *${topic}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aiseo <topik> untuk konten lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AISeo", "Gagal nih, coba lagi ya");

    await m.reply(text, "aiseo");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
