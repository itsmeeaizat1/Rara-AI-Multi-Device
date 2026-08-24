// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "aiseo",
  alias: ["aiseo", "seo", "seowriter", "contentseo", "artikelseo"],
  category: "ai",
  description: "Tulis konten SEO-friendly dengan AI",
  usage: ".aiseo <topik>",
  example: ".aiseo Cara memulai bisnis kuliner",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const topic = raw.replace(/^\.aiseo\s+/i, "").trim();

    if (!topic) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}aiseo <topik>*`,
          `  ┊  ➶ Contoh: *${prefix}aiseo Tips parenting modern*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "aiseo");
      return { handled: true };
    }

    m.react("🐣");
    const reply = await callAI({
      providerKey: "openai",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah penulis konten SEO. Tulis artikel yang Informatif, menarik, dan ramah mesin pencari dalam bahasa Indonesia." },
        { role: "user", content: `Tulis konten SEO tentang: ${topic}` },
      ],
      apiKey: (botConfig.aiHelp || {}).apiKey,
      apiEndpoint: (botConfig.aiHelp || {}).apiEndpoint,
    });

    const text =
      claraWrap("AI SEO", [`  ┊  ➶ Topik: *${topic}*`,
        `  ┊  ➶ Hasil: *${reply.slice(0, 1500)}${reply.length > 1500 ? "..." : ""}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aiseo <topik> untuk konten lain`) +
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

    await m.reply(text, "aiseo");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
