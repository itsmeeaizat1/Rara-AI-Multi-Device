// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "ai-explainer",
  alias: ["ai-explainer", "explain", "jelaskan", "mengerti", "belajar"],
  category: "ai",
  description: "Jelaskan topik apapun dengan AI",
  usage: ".ai-explainer <topik>",
  example: ".ai-explainer blockchain",
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
    const raw = m.text?.trim() || "";
    const topic = raw.replace(/^\.ai-explainer\s+/i, "").trim();

    if (!topic) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}ai-explainer <topik>*`,
          `◦ Contoh: *${prefix}ai-explainer blockchain*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "ai-explainer");
      return { handled: true };
    }

    m.react("🕐");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Jelaskan topik berikut dengan bahasa sederhana, akurat, dan bergaya Feynman dalam bahasa Indonesia." },
        { role: "user", content: `Jelaskan: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI Explainer", [`◦ Topik: *${topic}*`,
        `◦ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-explainer <topik> untuk topik lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
    m.react("✅");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "ai-explainer");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
