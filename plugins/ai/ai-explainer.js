// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-explainer",
  alias: ["ai-explainer", "ai"],
  category: "ai",
  description: "Jelaskan topik apapun dengan AI",
  usage: ".ai-explainer <topik>",
  example: ".ai-explainer blockchain",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";
    const topic = raw.replace(/^\.ai-explainer\s+/i, "").trim();

    if (!topic) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-explainer",
  description: "Jelaskan topik apapun dengan AI",
  usage: `${prefix}ai-explainer <topik>`,
  example: `${prefix}ai-explainer blockchain`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-explainer");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Jelaskan topik berikut dengan bahasa sederhana, akurat, dan bergaya Feynman dalam bahasa Indonesia." },
        { role: "user", content: `Jelaskan: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Explainer", [`Topik: *${topic}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-explainer <topik> untuk topik lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIExplainer", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-explainer");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
