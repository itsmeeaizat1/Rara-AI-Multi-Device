// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-code",
  alias: ["ai-code", "codeai", "code", "coding", "programming"],
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}ai-code <pertanyaan>*`,
          `  ┊  ➶ Contoh: *${prefix}ai-code Buat REST API dengan Node.js*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-code");
      return { handled: true };
    }

    m.react("🐣");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah asisten programming. Jawab dengan code yang bersih, jelas, dan bisa dijalankan. Gunakan bahasa Indonesia jika diminta." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Code", [`  ┊  ➶ Prompt: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `  ┊  ➶ Jawaban: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-code <pertanyaan> untuk coding lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text, "ai-code");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
