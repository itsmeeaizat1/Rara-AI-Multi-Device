// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "ai-prompt",
  alias: ["ai-prompt"],
  category: "ai",
  description: "Buat atau optimalkan prompt AI",
  usage: ".ai-prompt <ide>",
  example: ".ai-prompt iklan kopi untuk TikTok",
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
    const raw = m.text?.trim() || "";
    const prompt = raw.replace(/^\.ai-prompt\s+/i, "").trim();

    if (!prompt) {
      const text =
        raraCaption({
  emoji: "🤖",
  name: "ai-prompt",
  description: "Buat atau optimalkan prompt AI",
  usage: `${prefix}ai-prompt <ide>`,
  example: `${prefix}ai-prompt iklan kopi untuk TikTok`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-prompt");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → jawaban
    aiStatus = await startAiStatus(sock, m);
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah ahli prompt engineering. Buat prompt AI yang detail, jelas, dan mudah dijalankan untuk model generative AI." },
        { role: "user", content: `Buatkan prompt AI yang optimal untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      raraWrap("AI Prompt", [`Ide: *${prompt}*`,
        `Prompt: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-prompt <ide> untuk prompt lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIPrompt", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI gagal merespons — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "ai-prompt"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
