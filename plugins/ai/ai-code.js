// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-code",
  alias: ["ai-code", "ai"],
  category: "ai",
  description: "Generate/perbaiki code dengan AI",
  usage: ".ai-code <pertanyaan kode>",
  example: ".ai-code Buat fungsi Python untuk scrape web",
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
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        novaCaption({
  emoji: "💻",
  name: "ai-code",
  description: "Generate/perbaiki code dengan AI",
  usage: `${prefix}ai-code <pertanyaan kode>`,
  example: `${prefix}ai-code Buat fungsi Python untuk scrape web`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-code");
      return { handled: true };
    }
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah asisten programming. Jawab dengan code yang bersih, jelas, dan bisa dijalankan. Gunakan bahasa Indonesia jika diminta." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Code", [`Prompt: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `Jawaban: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-code <pertanyaan> untuk coding lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AICode", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-code");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
