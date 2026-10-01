// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { startAiStatus } from "../../src/lib/nova-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-social",
  alias: ["ai-social"],
  category: "ai",
  description: "Buat caption/post sosial media dengan AI",
  usage: ".ai-social <topik/platform>",
  example: ".ai-social kopi susu gula aren untuk Instagram",
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
    const prompt = raw.replace(/^\.ai-social\s+/i, "").trim();

    if (!prompt) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-social",
  description: "Buat caption/post sosial media dengan AI",
  usage: `${prefix}ai-social <topik/platform>`,
  example: `${prefix}ai-social kopi susu gula aren untuk Instagram`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-social");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → jawaban
    aiStatus = await startAiStatus(sock, m);
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah ahli konten sosial media. Buat caption, hashtag, dan ide konten yang menarik dan sesuai tren." },
        { role: "user", content: `Buatkan konten untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      novaWrap("AI Social", [`Topik: *${prompt}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-social <topik> untuk konten lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AISocial", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI gagal merespons — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "ai-social"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
