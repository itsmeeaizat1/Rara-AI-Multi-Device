// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aiidea",
  alias: ["aiidea"],
  category: "ai",
  description: "Dapatkan ide/ brainstorming dengan AI",
  usage: ".aiidea <topik>",
  example: ".aiidea ide konten TikTok untuk kuliner",
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
    const topic = raw.replace(/^\.aiidea\s+/i, "").trim();

    if (!topic) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "aiidea",
  description: "Dapatkan ide/ brainstorming dengan AI",
  usage: `${prefix}aiidea <topik>`,
  example: `${prefix}aiidea ide konten TikTok untuk kuliner`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "aiidea");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah konsultan kreatif. Berikan 5-7 ide actionable yang spesifik, singkat, dan mudah dijalankan." },
        { role: "user", content: `Berikan ide untuk: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Idea", [`Topik: *${topic}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aiidea <topik> untuk ide lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIIdea", "Gagal nih, coba lagi ya");

    await m.reply(text, "aiidea");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
