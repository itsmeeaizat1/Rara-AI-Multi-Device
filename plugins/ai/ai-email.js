// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { startAiStatus } from "../../src/lib/nova-ai-status.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai-email",
  alias: ["ai-email"],
  category: "ai",
  description: "Tulis email/resmi surat dengan AI",
  usage: ".ai-email <tujuan/isi>",
  example: ".ai-email lamaran kerja sebagai frontend engineer",
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
    const raw = m.text?.trim() || "";
    const prompt = raw.replace(/^\.ai-email\s+/i, "").trim();

    if (!prompt) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "ai-email",
  description: "Tulis email/resmi surat dengan AI",
  usage: `${prefix}ai-email <tujuan/isi>`,
  example: `${prefix}ai-email lamaran kerja sebagai frontend engineer`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-email");
      return { handled: true };
    }
    // 🔹 status loading ala agent (owner 29 Sep) — 🧠 Thinking... → jawaban
    aiStatus = await startAiStatus(sock, m);
    const reply = await callAI({
      providerKey: "ikyy_gemini",
      model: "gemini",
      messages: [
        { role: "system", content: "Kamu adalah ahli komunikasi. Tulis email atau surat yang sopan, jelas, dan sesuai konteks dalam bahasa Indonesia." },
        { role: "user", content: `Tulis email untuk: ${prompt}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      novaWrap("AI Email", [`Tujuan: *${prompt}*`,
        `Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-email <tujuan> untuk tulis lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await aiStatus.finish(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIEmail", "Gagal nih, coba lagi ya");

    if (aiStatus) await aiStatus.fail("AI gagal merespons — coba lagi ya");
    else { await m.react("❌"); await m.reply(text, "ai-email"); }
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
