// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";
import { startAiStatus } from "../../src/lib/nova-ai-status.js";

const pluginConfig = {
  name: "aibrowse",
  alias: ["aibrowse"],
  category: "ai",
  description: "Telusuri topik dan buat ringkasan riset singkat",
  usage: ".aibrowse <pertanyaan>",
  example: ".aibrowse Tren AI 2026",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
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
        novaCaption({
  emoji: "🤖",
  name: "aibrowse",
  description: "Telusuri topik dan buat ringkasan riset singkat",
  usage: `${prefix}aibrowse <pertanyaan>`,
  example: `${prefix}aibrowse Tren AI 2026`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "aibrowse");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — riset: thinking → searching → composing
    aiStatus = await startAiStatus(sock, m, { phases: ["🧠 Thinking...", "🔍 Searching...", "✍️ Composing..."] });
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah asisten riset. Berikan ringkasan terstruktur, poin penting, dan sumber yang mungkin relevan dalam bahasa Indonesia." },
        { role: "user", content: prompt },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
      sessionKey: "satuan:" + m.sender,
    });

    const text =
      novaWrap("AI Browse", [`Pertanyaan: *${prompt.slice(0, 200)}${prompt.length > 200 ? "..." : ""}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aibrowse <pertanyaan> untuk cari lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIBrowse", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI Browse gagal — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "aibrowse"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
