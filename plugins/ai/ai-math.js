// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "aimath",
  alias: ["aimath"],
  category: "ai",
  description: "Selesaikan soal matematika dengan AI",
  usage: ".ai-math <soal>",
  example: ".ai-math Integral dari x^2 dx",
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
    const prompt = raw.replace(/^\.ai-math\s+/i, "").trim();

    if (!prompt) {
      const text =
        raraCaption({
  emoji: "🤖",
  name: "aimath",
  description: "Selesaikan soal matematika dengan AI",
  usage: `${prefix}ai-math <soal>`,
  example: `${prefix}ai-math Integral dari x^2 dx`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-math");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → jawaban
    aiStatus = await startAiStatus(sock, m);
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah tutor matematika. Jelaskan langkah penyelesaian soal secara detail dalam bahasa Indonesia." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      raraWrap("AI Math", [`Soal: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `Jawaban: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-math <soal> untuk soal lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIMath", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI gagal merespons — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "ai-math"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
