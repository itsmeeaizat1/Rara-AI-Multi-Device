// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-blog",
  alias: ["ai-blog", "ai"],
  category: "ai",
  description: "Tulis artikel/blog post dengan AI",
  usage: ".ai-blog <topik>",
  example: ".ai-blog Perkembangan AI di Indonesia 2026",
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
    const topic = raw.replace(/^\.ai-blog\s+/i, "").trim();

    if (!topic) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-blog",
  description: "Tulis artikel/blog post dengan AI",
  usage: `${prefix}ai-blog <topik>`,
  example: `${prefix}ai-blog Perkembangan AI di Indonesia 2026`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-blog");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah penulis blog profesional. Tulis artikel yang informatif, engaging, mudah dibaca, dan cocok untuk publikasi blog dalam bahasa Indonesia." },
        { role: "user", content: `Tulis artikel blog tentang: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Blog", [`│ Topik: *${topic}*`,
        `│ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-blog <topik> untuk artikel lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIBlog", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-blog");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
