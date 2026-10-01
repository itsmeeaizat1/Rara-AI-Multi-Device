// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { startAiStatus } from "../../src/lib/rara-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

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
    const topic = raw.replace(/^\.aiidea\s+/i, "").trim();

    if (!topic) {
      const text =
        raraCaption({
  emoji: "🤖",
  name: "aiidea",
  description: "Dapatkan ide/ brainstorming dengan AI",
  usage: `${prefix}aiidea <topik>`,
  example: `${prefix}aiidea ide konten TikTok untuk kuliner`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "aiidea");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → jawaban
    aiStatus = await startAiStatus(sock, m);
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah konsultan kreatif. Berikan 5-7 ide actionable yang spesifik, singkat, dan mudah dijalankan." },
        { role: "user", content: `Berikan ide untuk: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
      sessionKey: "satuan:" + m.sender,
    });

    const text =
      raraWrap("AI Idea", [`Topik: *${topic}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aiidea <topik> untuk ide lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIIdea", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI gagal merespons — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "aiidea"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
