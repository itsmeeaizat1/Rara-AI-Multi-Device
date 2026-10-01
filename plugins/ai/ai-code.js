// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "ai-code",
  alias: ["ai-code"],
  category: "ai",
  description: "Generate/perbaiki code dengan AI",
  usage: ".ai-code <pertanyaan kode>",
  example: ".ai-code Buat fungsi Python untuk scrape web",
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
  let aiStatus = null;
  try {
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        raraCaption({
  emoji: "💻",
  name: "ai-code",
  description: "Generate/perbaiki code dengan AI",
  usage: `${prefix}ai-code <pertanyaan kode>`,
  example: `${prefix}ai-code Buat fungsi Python untuk scrape web`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-code");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → jawaban
    aiStatus = await startAiStatus(sock, m);
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
      raraWrap("AI Code", [`Prompt: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `Jawaban: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-code <pertanyaan> untuk coding lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AICode", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI gagal merespons — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "ai-code"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
