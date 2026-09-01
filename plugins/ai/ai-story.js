// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-story",
  alias: ["ai-story", "ai"],
  category: "ai",
  description: "Tulis cerita pendek dengan AI",
  usage: ".ai-story <tema>",
  example: ".ai-story petualangan di kota futuristik",
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
    const topic = raw.replace(/^\.ai-story\s+/i, "").trim();

    if (!topic) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-story",
  description: "Tulis cerita pendek dengan AI",
  usage: `${prefix}ai-story <tema>`,
  example: `${prefix}ai-story petualangan di kota futuristik`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-story");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah penulis cerita. Tulis cerita pendek yang menarik, mengalir, dan punya konflik terstruktur dalam bahasa Indonesia." },
        { role: "user", content: `Tulis cerita pendek tentang: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Story", [`Tema: *${topic}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-story <tema> untuk cerita lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIStory", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-story");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
