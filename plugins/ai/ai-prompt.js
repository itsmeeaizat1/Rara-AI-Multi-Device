// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-prompt",
  alias: ["ai-prompt", "ai"],
  category: "ai",
  description: "Buat atau optimalkan prompt AI",
  usage: ".ai-prompt <ide>",
  example: ".ai-prompt iklan kopi untuk TikTok",
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
    const prompt = raw.replace(/^\.ai-prompt\s+/i, "").trim();

    if (!prompt) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-prompt",
  description: "Buat atau optimalkan prompt AI",
  usage: `${prefix}ai-prompt <ide>`,
  example: `${prefix}ai-prompt iklan kopi untuk TikTok`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-prompt");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah ahli prompt engineering. Buat prompt AI yang detail, jelas, dan mudah dijalankan untuk model generative AI." },
        { role: "user", content: `Buatkan prompt AI yang optimal untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Prompt", [`Ide: *${prompt}*`,
        `Prompt: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-prompt <ide> untuk prompt lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIPrompt", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-prompt");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
